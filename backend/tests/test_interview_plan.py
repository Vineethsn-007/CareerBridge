"""Tests for pre-generated interview plan and interview sessions (Task 1)."""

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool

from app.core import db as db_module
from app.core.llm import LLMUnavailable
from app.main import app
from app.schemas import (
    InterviewPlan,
    InterviewPlanQuestion,
    Job,
    ParsedResume,
    PersonaInput,
)
from app.services.interview import service as interview_service
from app.services.jobs import service as jobs_service


def _sample_job() -> Job:
    return Job(
        id="job-payment-eng",
        title="Backend Engineer",
        company="Razorpay",
        location="Bengaluru",
        skills_required=["Python", "FastAPI", "PostgreSQL", "Kafka"],
        description="Build high-throughput payment settlement pipelines.",
        source_url="https://example.com/job-payment-eng",
    )


def _sample_resume() -> ParsedResume:
    return ParsedResume(
        name="Aditi Verma",
        skills=["Python", "FastAPI", "PostgreSQL"],
        projects=[
            "Automated Reconciliation Engine in FastAPI",
            "Distributed Event Broker using Python",
        ],
        summary="Final year CS student with hands-on fintech backend project experience.",
    )


def setup_function():
    # Use isolated in-memory DB for tests
    test_engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        future=True,
    )
    db_module.engine = test_engine
    db_module.SessionLocal.configure(bind=test_engine)
    db_module.init_db(test_engine)


def test_heuristic_interview_plan_structure_and_ordering():
    job = _sample_job()
    resume = _sample_resume()
    persona = PersonaInput(
        summary="Collaborative team player who enjoys deep systems debugging",
        strengths=["Accountability", "Clear communication"],
    )

    plan = interview_service.generate_interview_plan(
        resume=resume,
        job=job,
        persona=persona,
        num_questions=5,
        duration_minutes=20,
    )

    assert plan.job_id == job.id
    assert len(plan.questions) == 5

    # Check question types
    types = [q.type for q in plan.questions]
    assert types[0] == "warmup"
    assert "project" in types
    assert "technical" in types
    assert "behavioural" in types

    # Check that projects from resume are explicitly named in project questions
    project_questions = [q for q in plan.questions if q.type == "project"]
    assert len(project_questions) >= 1
    named_projects = [q.focus_skill_or_project for q in project_questions]
    for proj in named_projects:
        assert proj in resume.projects

    # Check rubrics (expected_key_points) exist in plan
    for q in plan.questions:
        assert len(q.expected_key_points) >= 1
        assert q.time_guide_seconds > 0
        assert q.difficulty in ("easy", "medium", "hard")

    # Order check: warmup is easy, difficulty goes easy -> medium -> hard, closing is at end
    diff_order = {"easy": 1, "medium": 2, "hard": 3}
    middle_diffs = [
        diff_order[q.difficulty] for q in plan.questions if q.type not in ("warmup", "closing")
    ]
    assert middle_diffs == sorted(middle_diffs)


def test_heuristic_interview_plan_never_asks_unlisted_project():
    job = _sample_job()
    resume_no_projects = ParsedResume(
        name="Rohan Sharma",
        skills=["Java", "Spring Boot"],
        projects=[],
        summary="Fresher with strong data structures foundation.",
    )

    plan = interview_service.generate_interview_plan(
        resume=resume_no_projects,
        job=job,
        num_questions=5,
    )

    # Question text should never reference fake or made-up project names
    for q in plan.questions:
        if q.type == "project":
            assert q.focus_skill_or_project in ("Java", "Spring Boot", "software engineering")


def test_create_interview_session_persists_rubric_but_hides_from_client():
    job = _sample_job()
    resume = _sample_resume()

    res = interview_service.create_interview_session(
        resume=resume,
        job=job,
        num_questions=5,
        duration_minutes=15,
    )

    assert res.session_id.startswith("sess_")
    assert res.status == "created"
    assert len(res.questions) == 5

    # Verify hidden rubric is NOT in the client response
    for client_q in res.questions:
        assert not hasattr(client_q, "expected_key_points")
        assert not hasattr(client_q, "follow_up")

    # Verify session is retrievable
    retrieved = interview_service.get_interview_session(res.session_id)
    assert retrieved is not None
    assert retrieved.session_id == res.session_id
    assert len(retrieved.questions) == 5

    # Verify non-existent session
    assert interview_service.get_interview_session("sess_nonexistent") is None


def test_llm_generate_interview_plan_with_mocked_success(monkeypatch):
    calls: list[tuple] = []

    def mock_complete_json(prompt, system=None, schema_model=None, model=None):
        calls.append((prompt, system, schema_model))
        return InterviewPlan(
            job_id="job-payment-eng",
            role_title="Backend Engineer",
            company_name="Razorpay",
            questions=[
                InterviewPlanQuestion(
                    id="q1",
                    text="Welcome! Please introduce yourself.",
                    type="warmup",
                    difficulty="easy",
                    expected_key_points=["Intro summary"],
                    time_guide_seconds=60,
                ),
                InterviewPlanQuestion(
                    id="q2",
                    text="How did you implement the Automated Reconciliation Engine in FastAPI?",
                    type="project",
                    focus_skill_or_project="Automated Reconciliation Engine in FastAPI",
                    difficulty="easy",
                    expected_key_points=["Architecture"],
                    time_guide_seconds=120,
                ),
                InterviewPlanQuestion(
                    id="q3",
                    text="Explain Kafka consumer groups.",
                    type="technical",
                    focus_skill_or_project="Kafka",
                    difficulty="medium",
                    expected_key_points=["Partitions", "Offsets"],
                    time_guide_seconds=120,
                ),
                InterviewPlanQuestion(
                    id="q4",
                    text="Tell me about a time you handled a critical outage.",
                    type="behavioural",
                    difficulty="hard",
                    expected_key_points=["STAR format"],
                    time_guide_seconds=180,
                ),
                InterviewPlanQuestion(
                    id="q5",
                    text="Do you have any questions for us?",
                    type="closing",
                    difficulty="easy",
                    expected_key_points=["Thoughtful questions"],
                    time_guide_seconds=60,
                ),
            ],
        )

    monkeypatch.setattr(interview_service, "complete_json", mock_complete_json)

    job = _sample_job()
    resume = _sample_resume()
    plan = interview_service.generate_interview_plan(resume, job, num_questions=5)

    assert len(calls) == 1
    assert len(plan.questions) == 5
    assert plan.questions[0].id == "q1"


def test_llm_fallback_on_unavailable(monkeypatch):
    def mock_fail(prompt, system=None, schema_model=None, model=None):
        raise LLMUnavailable("Provider mock")

    monkeypatch.setattr(interview_service, "complete_json", mock_fail)

    job = _sample_job()
    resume = _sample_resume()
    plan = interview_service.generate_interview_plan(resume, job, num_questions=5)

    assert len(plan.questions) == 5
    assert plan.questions[0].type == "warmup"


def test_api_sessions_endpoints(monkeypatch):
    client = TestClient(app)
    job = _sample_job()
    monkeypatch.setattr(jobs_service, "get_job", lambda j_id: job if j_id == job.id else None)

    # 1. 404 on invalid job
    res_404 = client.post(
        "/api/interview/sessions",
        json={"resume": _sample_resume().model_dump(), "job_id": "nonexistent_job"},
    )
    assert res_404.status_code == 404

    # 2. 200 on successful session creation
    payload = {
        "resume": _sample_resume().model_dump(),
        "job_id": job.id,
        "persona": {"summary": "Detail-oriented learner", "strengths": ["Fast learner"]},
        "num_questions": 5,
        "duration_minutes": 15,
    }
    res = client.post("/api/interview/sessions", json=payload)
    assert res.status_code == 200
    data = res.json()
    session_id = data["session_id"]
    assert session_id.startswith("sess_")
    assert data["role_title"] == "Backend Engineer"
    assert len(data["questions"]) == 5
    # Verify no rubric exposed in API JSON
    for q in data["questions"]:
        assert "expected_key_points" not in q
        assert "follow_up" not in q

    # 3. GET /api/interview/sessions/{session_id}
    get_res = client.get(f"/api/interview/sessions/{session_id}")
    assert get_res.status_code == 200
    get_data = get_res.json()
    assert get_data["session_id"] == session_id
    assert len(get_data["questions"]) == 5

    # 4. GET /api/interview/sessions/sess_unknown -> 404
    get_res_404 = client.get("/api/interview/sessions/sess_unknown")
    assert get_res_404.status_code == 404
