"""Tests for interview service: questions generation, rubric evaluation, and STAR guidance."""

from app.core.llm import LLMUnavailable
from app.schemas import InterviewQuestion, Job, ParsedResume
from app.services.interview import service as interview_service


def _sample_job() -> Job:
    return Job(
        id="job-dev",
        title="Backend Engineer",
        company="Razorpay",
        location="Bengaluru",
        skills_required=["Python", "FastAPI", "SQL", "Docker"],
        description="Build scalable payments infrastructure.",
        source_url="https://example.com/job-dev",
    )


def _sample_resume() -> ParsedResume:
    return ParsedResume(
        name="Asha Rao",
        skills=["Python", "FastAPI", "SQL"],
        projects=["Payment Gateway Webhook Service in FastAPI"],
        summary="Aspiring backend engineer with project experience in Python.",
    )


def test_generate_questions_contains_mixed_kinds():
    job = _sample_job()
    resume = _sample_resume()
    questions = interview_service.generate_questions(resume, job, n=3)

    assert len(questions) == 3
    kinds = {q.kind for q in questions}
    assert "technical" in kinds
    assert "behavioural" in kinds
    assert "hr" in kinds
    assert all(q.id for q in questions)
    assert all(q.question for q in questions)


def test_generate_questions_with_mocked_llm(monkeypatch):
    calls: list[tuple] = []

    def mock_complete_json(prompt, system=None):
        calls.append((prompt, system))
        return {
            "questions": [
                {
                    "question": "How did you design the webhook service in FastAPI?",
                    "kind": "technical",
                    "focus_skill": "FastAPI",
                },
                {
                    "question": "Tell me about resolving a critical bug under pressure.",
                    "kind": "behavioural",
                    "focus_skill": None,
                },
            ]
        }

    monkeypatch.setattr(interview_service, "complete_json", mock_complete_json)

    job = _sample_job()
    resume = _sample_resume()
    questions = interview_service.generate_questions(resume, job, n=2)

    assert len(calls) == 1
    assert len(questions) == 2
    assert questions[0].kind == "technical"
    assert questions[0].focus_skill == "FastAPI"
    assert "webhook" in questions[0].question


def test_evaluate_behavioural_answer_with_star_guidance():
    job = _sample_job()
    q = InterviewQuestion(
        id="q1",
        question="Tell me about a time you resolved a team conflict.",
        kind="behavioural",
    )

    brief_answer = "We argued about the database, but we sorted it out quickly."
    feedback = interview_service.evaluate_answer(job, q, brief_answer)

    assert 0 <= feedback.score <= 10
    assert any("STAR" in imp for imp in feedback.improvements)
    assert feedback.sample_answer is not None
    assert "Situation:" in feedback.sample_answer
    assert "Result:" in feedback.sample_answer

    star_answer = (
        "Situation: During our final semester project, our backend service crashed. "
        "Task: I was responsible for diagnosing the issue and restoring uptime. "
        "Action: I analyzed memory logs, fixed the leak, and added Redis caching. "
        "Result: Latency dropped by 60% and we launched smoothly."
    )
    star_feedback = interview_service.evaluate_answer(job, q, star_answer)
    assert star_feedback.score > feedback.score
    assert any(
        "narrative" in s.lower() or "structured" in s.lower() for s in star_feedback.strengths
    )


def test_evaluate_technical_answer():
    job = _sample_job()
    q = InterviewQuestion(
        id="q2",
        question="Explain how FastAPI handles dependency injection.",
        kind="technical",
        focus_skill="FastAPI",
    )

    answer = (
        "FastAPI uses Depends() to declare dependencies in path operations. "
        "This allows clean code reuse, database session management, and auth injection. "
        "In my project, I created a DB session dependency that closes connections."
    )
    feedback = interview_service.evaluate_answer(job, q, answer)

    assert 0 <= feedback.score <= 10
    assert any("FastAPI" in s for s in feedback.strengths)
    assert feedback.sample_answer is not None


def test_evaluate_hr_answer():
    job = _sample_job()
    q = InterviewQuestion(
        id="q3",
        question="Why do you want to join Razorpay as a Backend Engineer?",
        kind="hr",
    )

    answer = (
        "I am excited to join Razorpay to build high-scale payment infrastructure. "
        "I want to learn from great engineering mentors and grow into a strong backend engineer."
    )
    feedback = interview_service.evaluate_answer(job, q, answer)

    assert 0 <= feedback.score <= 10
    assert any("enthusiasm" in s.lower() or "alignment" in s.lower() for s in feedback.strengths)
    assert feedback.sample_answer is not None


def test_evaluate_answer_mocked_llm(monkeypatch):
    calls: list[tuple] = []

    def mock_complete_json(prompt, system=None):
        calls.append((prompt, system))
        return {
            "score": 9,
            "strengths": ["Excellent technical clarity", "Good mention of async workers"],
            "improvements": ["Could mention benchmark numbers"],
            "sample_answer": "An ideal answer covers async loops and memory limits.",
        }

    monkeypatch.setattr(interview_service, "complete_json", mock_complete_json)

    job = _sample_job()
    q = InterviewQuestion(id="q1", question="Explain Python GIL.", kind="technical")
    feedback = interview_service.evaluate_answer(
        job, q, "GIL controls thread execution in CPython."
    )

    assert len(calls) == 1
    assert feedback.score == 9
    assert "async workers" in feedback.strengths[1]
    assert feedback.sample_answer == "An ideal answer covers async loops and memory limits."


def test_evaluate_answer_llm_fallback_on_unavailable(monkeypatch):
    def mock_fail(prompt, system=None):
        raise LLMUnavailable("Provider mock")

    monkeypatch.setattr(interview_service, "complete_json", mock_fail)

    job = _sample_job()
    q = InterviewQuestion(
        id="q1", question="Explain Docker.", kind="technical", focus_skill="Docker"
    )
    feedback = interview_service.evaluate_answer(job, q, "Docker packages apps into containers.")

    assert 0 <= feedback.score <= 10
    assert len(feedback.strengths) >= 1
    assert len(feedback.improvements) >= 1
    assert feedback.sample_answer is not None
