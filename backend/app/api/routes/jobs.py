from fastapi import APIRouter, HTTPException

from app.schemas import Job, JobMatch, MatchRequest
from app.services.jobs.service import get_job, list_jobs
from app.services.matching.service import match_jobs

router = APIRouter()


@router.get("/jobs", response_model=list[Job])
def jobs(verified_only: bool = False, q: str | None = None) -> list[Job]:
    return list_jobs(verified_only=verified_only, q=q)


@router.get("/jobs/{job_id}", response_model=Job)
def job_detail(job_id: str) -> Job:
    job = get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found.")
    return job


@router.post("/match", response_model=list[JobMatch])
def match(req: MatchRequest) -> list[JobMatch]:
    return match_jobs(req)
