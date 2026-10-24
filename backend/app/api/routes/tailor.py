"""Resume tailoring API endpoints (owner: resume-tailoring-agent).

Endpoints:
- POST /api/resume/tailor
- GET  /api/resume/tailored/{id}
- PUT  /api/resume/tailored/{id}
- GET  /api/resume/tailored/{id}/download?format=pdf|docx
- GET  /api/resume/tailored?job_id=
"""

from __future__ import annotations

import time
from collections import defaultdict
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.db import PersonaProfile, ResumeProfile, TailoredResumeRow, get_session
from app.schemas import (
    ParsedResume,
    PersonaProfileResult,
    TailoredResume,
    TailoredResumeListItem,
    TailoredResumeRecord,
    TailorRequest,
)
from app.services.jobs.service import get_job, get_job_from_db
from app.services.tailoring.render import render_docx, render_pdf
from app.services.tailoring.service import _compute_tailored_ats_score, tailor_resume

router = APIRouter()

# ----------------- Rate Limiting -----------------
# 10 tailor generation calls per minute per user_id
_RATE_LIMIT_MAX = 10
_RATE_LIMIT_WINDOW_SECONDS = 60.0
_user_call_timestamps: dict[str, list[float]] = defaultdict(list)


def _check_rate_limit(user_id: str) -> None:
    now = time.time()
    history = _user_call_timestamps[user_id]
    cutoff = now - _RATE_LIMIT_WINDOW_SECONDS
    # Prune expired timestamps
    _user_call_timestamps[user_id] = [t for t in history if t > cutoff]
    if len(_user_call_timestamps[user_id]) >= _RATE_LIMIT_MAX:
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Please wait a moment before tailoring another resume.",
        )
    _user_call_timestamps[user_id].append(now)


# ----------------- Route Handlers -----------------


@router.post("/tailor", response_model=TailoredResumeRecord)
def tailor(
    req: TailorRequest,
    db: Annotated[Session, Depends(get_session)],
    user_id: Annotated[str, Depends(get_current_user)],
) -> TailoredResumeRecord:
    """Generate an AI-tailored resume for a target job."""
    _check_rate_limit(user_id)

    # 1. Fetch Job
    job = get_job_from_db(db, req.job_id) if db is not None else None
    if job is None:
        job = get_job(req.job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Target job not found.")

    # 2. Retrieve Candidate Resume
    profile = req.resume
    if profile is None:
        # Fall back to latest saved profile
        saved = db.query(ResumeProfile).order_by(desc(ResumeProfile.id)).first()
        if saved is None:
            raise HTTPException(
                status_code=400,
                detail="No resume provided or stored. Please upload a resume first.",
            )
        profile = ParsedResume(
            name=saved.name,
            email=saved.email,
            phone=saved.phone,
            summary=saved.summary,
            skills=[s.get("name") if isinstance(s, dict) else str(s) for s in (saved.skills or [])],
            education=saved.education or [],
            experience=saved.experience or [],
            projects=saved.projects or [],
            raw_text=saved.raw_text or "",
        )

    # 3. Retrieve latest Persona profile if any
    persona_row = db.query(PersonaProfile).order_by(desc(PersonaProfile.id)).first()
    persona_result: PersonaProfileResult | None = None
    if persona_row and persona_row.strengths:
        persona_result = PersonaProfileResult(
            persona_id=persona_row.id,
            resume_profile_id=persona_row.resume_profile_id or 0,
            strengths=persona_row.strengths,
            summary=persona_row.summary,
            confidence=persona_row.confidence or "low",  # type: ignore[arg-type]
            completed=True,
        )

    # 4. Tailor Resume
    tailored = tailor_resume(profile, job, persona=persona_result)

    # 5. Determine version for (user_id, job_id)
    latest_ver = (
        db.query(func.max(TailoredResumeRow.version))
        .filter(
            TailoredResumeRow.user_id == user_id,
            TailoredResumeRow.job_id == job.id,
        )
        .scalar()
        or 0
    )
    new_version = latest_ver + 1

    # 6. Persist record
    row = TailoredResumeRow(
        user_id=user_id,
        job_id=job.id,
        version=new_version,
        content=tailored.model_dump(mode="json"),
    )
    db.add(row)
    db.commit()
    db.refresh(row)

    return TailoredResumeRecord(
        id=row.id,
        user_id=row.user_id,
        job_id=row.job_id,
        version=row.version,
        content=tailored,
        created_at=row.created_at.isoformat(),
    )


@router.get("/tailored", response_model=list[TailoredResumeListItem])
def list_tailored(
    db: Annotated[Session, Depends(get_session)],
    user_id: Annotated[str, Depends(get_current_user)],
    job_id: str | None = Query(default=None),
) -> list[TailoredResumeListItem]:
    """List tailored resumes for the current user, optionally filtered by job_id."""
    query = db.query(TailoredResumeRow).filter(TailoredResumeRow.user_id == user_id)
    if job_id:
        query = query.filter(TailoredResumeRow.job_id == job_id)

    rows = query.order_by(desc(TailoredResumeRow.version), desc(TailoredResumeRow.id)).all()
    items: list[TailoredResumeListItem] = []
    for r in rows:
        score_after = 0.0
        if isinstance(r.content, dict):
            score_after = float(r.content.get("ats_score_after", 0.0))
        items.append(
            TailoredResumeListItem(
                id=r.id,
                version=r.version,
                job_id=r.job_id,
                ats_score_after=score_after,
                created_at=r.created_at.isoformat(),
            )
        )
    return items


@router.get("/tailored/{tailored_id}", response_model=TailoredResumeRecord)
def get_tailored(
    tailored_id: int,
    db: Annotated[Session, Depends(get_session)],
    user_id: Annotated[str, Depends(get_current_user)],
) -> TailoredResumeRecord:
    """Retrieve a specific tailored resume. Enforces user ownership."""
    row = (
        db.query(TailoredResumeRow)
        .filter(
            TailoredResumeRow.id == tailored_id,
            TailoredResumeRow.user_id == user_id,
        )
        .first()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Tailored resume not found.")

    return TailoredResumeRecord(
        id=row.id,
        user_id=row.user_id,
        job_id=row.job_id,
        version=row.version,
        content=TailoredResume.model_validate(row.content),
        created_at=row.created_at.isoformat(),
    )


@router.put("/tailored/{tailored_id}", response_model=TailoredResumeRecord)
def update_tailored(
    tailored_id: int,
    edited_content: TailoredResume,
    db: Annotated[Session, Depends(get_session)],
    user_id: Annotated[str, Depends(get_current_user)],
) -> TailoredResumeRecord:
    """Save user edits as a new version. Enforces user ownership."""
    original = (
        db.query(TailoredResumeRow)
        .filter(
            TailoredResumeRow.id == tailored_id,
            TailoredResumeRow.user_id == user_id,
        )
        .first()
    )
    if original is None:
        raise HTTPException(status_code=404, detail="Tailored resume not found.")

    # Re-score after manual edits
    job = get_job_from_db(db, original.job_id) if db is not None else None
    if job is None:
        job = get_job(original.job_id)

    if job is not None:
        new_score = _compute_tailored_ats_score(edited_content, job)
        edited_content.ats_score_after = new_score

    # Determine next version
    latest_ver = (
        db.query(func.max(TailoredResumeRow.version))
        .filter(
            TailoredResumeRow.user_id == user_id,
            TailoredResumeRow.job_id == original.job_id,
        )
        .scalar()
        or original.version
    )
    new_version = latest_ver + 1

    new_row = TailoredResumeRow(
        user_id=user_id,
        job_id=original.job_id,
        version=new_version,
        content=edited_content.model_dump(mode="json"),
    )
    db.add(new_row)
    db.commit()
    db.refresh(new_row)

    return TailoredResumeRecord(
        id=new_row.id,
        user_id=new_row.user_id,
        job_id=new_row.job_id,
        version=new_row.version,
        content=edited_content,
        created_at=new_row.created_at.isoformat(),
    )


@router.get("/tailored/{tailored_id}/download")
def download_tailored(
    tailored_id: int,
    db: Annotated[Session, Depends(get_session)],
    user_id: Annotated[str, Depends(get_current_user)],
    format: Literal["pdf", "docx"] = Query(default="pdf"),
) -> Response:
    """Download on-demand rendered PDF or DOCX. Enforces user ownership."""
    row = (
        db.query(TailoredResumeRow)
        .filter(
            TailoredResumeRow.id == tailored_id,
            TailoredResumeRow.user_id == user_id,
        )
        .first()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Tailored resume not found.")

    tailored = TailoredResume.model_validate(row.content)

    # Attempt to fetch profile for contact details
    profile_row = db.query(ResumeProfile).order_by(desc(ResumeProfile.id)).first()
    profile = (
        ParsedResume(
            name=profile_row.name,
            email=profile_row.email,
            phone=profile_row.phone,
        )
        if profile_row
        else None
    )

    if format == "pdf":
        data = render_pdf(tailored, profile=profile)
        filename = f"tailored_resume_{row.job_id}_v{row.version}.pdf"
        return Response(
            content=data,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    else:
        data = render_docx(tailored, profile=profile)
        filename = f"tailored_resume_{row.job_id}_v{row.version}.docx"
        return Response(
            content=data,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
