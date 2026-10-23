from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_session
from app.schemas import (
    AnswerFeedback,
    EvaluateRequest,
    InterviewQuestion,
    InterviewRequest,
    InterviewSessionCreate,
    InterviewSessionResponse,
)
from app.services.interview.service import (
    create_interview_session,
    evaluate_answer,
    generate_questions,
    get_interview_session,
)
from app.services.jobs.service import resolve_job

router = APIRouter()


@router.post("/sessions", response_model=InterviewSessionResponse)
def create_session(
    req: InterviewSessionCreate, session: Annotated[Session | None, Depends(get_session)]
) -> InterviewSessionResponse:
    job = resolve_job(session, req.job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found.")
    return create_interview_session(
        resume=req.resume,
        job=job,
        persona=req.persona,
        num_questions=req.num_questions,
        duration_minutes=req.duration_minutes or 15,
    )


@router.get("/sessions/{session_id}", response_model=InterviewSessionResponse)
def get_session_by_id(session_id: str) -> InterviewSessionResponse:
    session = get_interview_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Interview session not found.")
    return session


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
