from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_session
from app.schemas import PrepPlan, PrepPlanRequest, SkillGap, SkillGapRequest
from app.services.jobs.service import resolve_job
from app.services.skills.service import analyze_gap, build_plan

router = APIRouter()


@router.post("/gap", response_model=SkillGap)
def gap(req: SkillGapRequest, session: Annotated[Session | None, Depends(get_session)]) -> SkillGap:
    job = resolve_job(session, req.job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found.")
    return analyze_gap(req.resume, job)


@router.post("/plan", response_model=PrepPlan)
def plan(req: PrepPlanRequest) -> PrepPlan:
    return build_plan(req)
