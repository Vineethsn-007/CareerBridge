from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.db import get_session
from app.schemas import (
    AnswerFeedback,
    EndInterviewRequest,
    EvaluateRequest,
    InterviewQuestion,
    InterviewReport,
    InterviewRequest,
    InterviewSessionCreate,
    InterviewSessionResponse,
    TavusWebhookPayload,
)
from app.services.interview.service import (
    create_interview_session,
    delete_session_data,
    end_interview_session,
    evaluate_answer,
    generate_questions,
    get_interview_session,
    get_or_generate_report,
    handle_tavus_webhook,
    poll_and_sync_transcript,
    record_integrity_events,
)
from app.services.jobs.service import resolve_job

router = APIRouter()


@router.post("/sessions", response_model=InterviewSessionResponse)
async def create_session(
    req: InterviewSessionCreate, session: Annotated[Session | None, Depends(get_session)] = None
) -> InterviewSessionResponse:
    job = resolve_job(session, req.job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found.")
    return await create_interview_session(
        resume=req.resume,
        job=job,
        persona=req.persona,
        num_questions=req.num_questions,
        duration_minutes=req.duration_minutes or 15,
        consent_recording=req.consent_recording,
        consent_transcript=req.consent_transcript,
        consent_integrity=req.consent_integrity,
    )


@router.get("/sessions/{session_id}", response_model=InterviewSessionResponse)
async def get_session_by_id(session_id: str) -> InterviewSessionResponse:
    session = get_interview_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Interview session not found.")
    # Fallback: If session ended but transcript hasn't arrived via webhook, attempt polling Tavus
    if session.status in ("ended", "processing") and not session.has_report:
        try:
            await poll_and_sync_transcript(session_id)
            updated = get_interview_session(session_id)
            if updated is not None:
                return updated
        except Exception:
            pass
    return session


@router.get("/sessions/{session_id}/report", response_model=InterviewReport)
async def get_session_report(session_id: str) -> InterviewReport:
    session = get_interview_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Interview session not found.")
    if not session.has_report:
        try:
            await poll_and_sync_transcript(session_id)
        except Exception:
            pass
    try:
        return get_or_generate_report(session_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.delete("/sessions/{session_id}/data")
def delete_candidate_data(session_id: str) -> dict[str, Any]:
    try:
        return delete_session_data(session_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/sessions/{session_id}/end", response_model=InterviewSessionResponse)
async def end_session(
    session_id: str, req: EndInterviewRequest | None = None
) -> InterviewSessionResponse:
    try:
        return await end_interview_session(session_id, reason=req.reason if req else None)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/webhook/tavus")
async def tavus_webhook(
    payload: TavusWebhookPayload,
    token: str | None = Query(default=None),
    session_id: str | None = Query(default=None),
) -> dict[str, Any]:
    try:
        result = await handle_tavus_webhook(
            payload.model_dump(), token=token, session_id=session_id
        )
        return {"status": "ok", "result": result}
    except PermissionError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc


@router.post("/sessions/{session_id}/integrity")
def log_integrity(session_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    events = payload.get("events", [])
    try:
        return record_integrity_events(session_id, events)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/questions", response_model=list[InterviewQuestion])
def questions(
    req: InterviewRequest, session: Annotated[Session | None, Depends(get_session)]
) -> list[InterviewQuestion]:
    job = resolve_job(session, req.job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found.")
    return generate_questions(req.resume, job, req.num_questions)


@router.post("/evaluate", response_model=AnswerFeedback)
def evaluate(
    req: EvaluateRequest, session: Annotated[Session | None, Depends(get_session)]
) -> AnswerFeedback:
    job = resolve_job(session, req.job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found.")
    return evaluate_answer(job, req.question, req.answer)
