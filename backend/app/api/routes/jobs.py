from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_session
from app.schemas import Job, JobMatch, MatchRequest
from app.services.jobs.service import (
    get_job,
    get_job_from_db,
    list_jobs,
    list_jobs_from_db,
)
from app.services.matching.service import match_jobs

router = APIRouter()


@router.get("/jobs", response_model=list[Job])
def jobs(
    session: Annotated[Session | None, Depends(get_session)],
    verified_only: bool = False,
    q: str | None = None,
) -> list[Job]:
    # Scraper-backed database listings first; the curated file store stays as the
    # documented fallback when the database has no jobs yet.
    try:
        db_jobs = list_jobs_from_db(session, verified_only=verified_only, q=q)
    except Exception:
        db_jobs = []
    if db_jobs:
        return db_jobs
    return list_jobs(verified_only=verified_only, q=q)


@router.get("/jobs/{job_id}", response_model=Job)
def job_detail(job_id: str, session: Annotated[Session | None, Depends(get_session)]) -> Job:
    try:
        job = get_job_from_db(session, job_id) if session is not None else None
    except Exception:
        job = None
    if job is None:
        job = get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found.")
    return job


@router.post("/match", response_model=list[JobMatch])
def match(
    req: MatchRequest, session: Annotated[Session | None, Depends(get_session)]
) -> list[JobMatch]:
    return match_jobs(req, session=session)
