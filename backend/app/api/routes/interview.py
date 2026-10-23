from fastapi import APIRouter, HTTPException

from app.schemas import AnswerFeedback, EvaluateRequest, InterviewQuestion, InterviewRequest
from app.services.interview.service import evaluate_answer, generate_questions
from app.services.jobs.service import get_job

router = APIRouter()


@router.post("/questions", response_model=list[InterviewQuestion])
def questions(req: InterviewRequest) -> list[InterviewQuestion]:
    job = get_job(req.job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found.")
    return generate_questions(req.resume, job, req.num_questions)


@router.post("/evaluate", response_model=AnswerFeedback)
def evaluate(req: EvaluateRequest) -> AnswerFeedback:
    job = get_job(req.job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found.")
    return evaluate_answer(job, req.question, req.answer)
