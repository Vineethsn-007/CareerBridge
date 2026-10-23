from fastapi import APIRouter, HTTPException

from app.schemas import PrepPlan, PrepPlanRequest, SkillGap, SkillGapRequest
from app.services.jobs.service import get_job
from app.services.skills.service import analyze_gap, build_plan

router = APIRouter()


@router.post("/gap", response_model=SkillGap)
def gap(req: SkillGapRequest) -> SkillGap:
    job = get_job(req.job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found.")
    return analyze_gap(req.resume, job)


@router.post("/plan", response_model=PrepPlan)
def plan(req: PrepPlanRequest) -> PrepPlan:
    return build_plan(req)
