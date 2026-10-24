"""Tests for interview evaluation, communication metrics, and report generation (Task 4)."""

import asyncio
from unittest.mock import MagicMock

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool

import app.core.db as db_module
from app.core.llm import LLMUnavailable
from app.main import app
from app.schemas import Job, ParsedResume
from app.services.interview import evaluate as eval_module
from app.services.interview import service as interview_service
from app.services.interview.models import InterviewSessionModel


def setup_function():
    test_engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        future=True,
    )
    db_module.engine = test_engine
    db_module.SessionLocal.configure(bind=test_engine)
    db_module.init_db(test_engine)


def _sample_job() -> Job:
    return Job(
        id="job-eval-1",
        title="Full Stack Engineer",
        company="Razorpay",
        location="Bengaluru",
        skills_required=["Python", "FastAPI", "React", "TypeScript", "SQL"],
        description="Build reliable payments infrastructure and dashboard.",
        source_url="https://example.com/job-eval-1",
    )


def _sample_resume() -> ParsedResume:
    return ParsedResume(
        name="Aarav Sharma",
        skills=["Python", "FastAPI", "React", "SQL"],
        projects=["Payment Webhook Service", "Merchant Analytics Portal"],
        experience=[],
        summary="Full stack engineer passionate about fintech.",
    )


# ---------- Communication Metrics Tests ----------


def test_communication_metrics_empty():
    metrics = eval_module.compute_communication_metrics([])
    assert metrics.words_per_minute == 0.0
    assert metrics.filler_word_count == 0
    assert metrics.filler_percentage == 0.0


def test_communication_metrics_filler_breakdown_and_wpm():
    transcript = [
        {"role": "assistant", "content": "Tell me about your webhook service."},
        {
            "role": "user",
            "content": (
                "Um, so basically, like, we had a payment webhook service, and, you know, "
                "uh, we processed thousands of transactions per second with FastAPI."
            ),
            "duration": 10.0,
        },
    ]

    metrics = eval_module.compute_communication_metrics(transcript)
    assert metrics.filler_breakdown["um"] >= 1
    assert metrics.filler_breakdown["uh"] >= 1
    assert metrics.filler_breakdown["like"] >= 1
    assert metrics.filler_breakdown["you know"] >= 1
    assert metrics.filler_breakdown["basically"] >= 1
    assert metrics.filler_word_count >= 5
    assert metrics.filler_percentage > 0.0
    assert metrics.words_per_minute > 50.0
    assert metrics.average_answer_words > 10.0


def test_communication_metrics_long_pauses_and_skips():
    transcript = [
        {"role": "assistant", "content": "How do you handle distributed locks?"},
        {
            "role": "user",
            "content": "I don't know, pass.",
            "duration": 2.0,
            "pause_duration": 4.5,
        },
        {"role": "assistant", "content": "Tell me about Redis transactions."},
        {
            "role": "user",
            "content": "Skip please.",
            "duration": 1.5,
        },
    ]

    metrics = eval_module.compute_communication_metrics(transcript)
    assert metrics.long_pauses_count >= 1
    assert metrics.skipped_questions_count >= 2
    assert metrics.confidence_score < 8.0


# ---------- Transcript Alignment Tests ----------


def test_extract_candidate_answers_alignment():
    questions = [
        {"id": "q1", "text": "Introduce yourself and your experience."},
        {"id": "q2", "text": "How did you design the Payment Webhook Service?"},
    ]
    transcript = [
        {"role": "assistant", "content": "Hi, introduce yourself and your experience."},
        {"role": "user", "content": "I am a full stack engineer with Python background."},
        {"role": "assistant", "content": "Great. How did you design the Payment Webhook Service?"},
        {"role": "user", "content": "We built it using FastAPI and Celery workers."},
    ]

    answers = eval_module.extract_candidate_answers(questions, transcript)
    assert len(answers) == 2
    assert "full stack engineer" in answers[0]
    assert "FastAPI and Celery" in answers[1]


# ---------- Rubric Question Evaluation Tests ----------


def test_evaluate_question_heuristic_fallback():
    question = {
        "id": "q2",
        "text": "Walk me through the architecture of Payment Webhook Service.",
        "type": "project",
        "focus_skill_or_project": "Payment Webhook Service",
        "difficulty": "medium",
        "expected_key_points": [
            "FastAPI async endpoints for incoming merchant webhooks",
            "Idempotency keys to prevent duplicate event processing",
            "Redis message broker with Celery workers",
        ],
    }

    # Candidate answer covering idempotency and FastAPI
    answer = (
        "We designed the service using FastAPI async handlers. Each incoming event had a "
        "unique idempotency key checked against Redis to prevent duplicate processing. "
        "The situation was high spike traffic, our task was zero data loss, I built the worker "
        "pipeline, and the result was 99.99% reliability."
    )

    eval_result = eval_module._heuristic_evaluate_question(
        question, answer, job_title="Backend Engineer", company_name="Razorpay"
    )

    assert eval_result.score >= 5.0
    assert len(eval_result.covered_points) >= 1
    assert any("idempotency" in cp.lower() for cp in eval_result.covered_points)
    assert len(eval_result.strengths) >= 1
    assert any("STAR" in imp for imp in eval_result.improvements)
    assert eval_result.sample_answer != ""


def test_evaluate_question_with_mocked_llm(monkeypatch):
    question = {
        "id": "q1",
        "text": "Explain Python GIL and concurrency trade-offs.",
        "type": "technical",
        "focus_skill_or_project": "Python",
        "difficulty": "hard",
        "expected_key_points": [
            "GIL prevents multiple native threads from executing Python bytecode simultaneously",
            "Multiprocessing or asyncio for CPU vs IO bound workloads",
        ],
    }

    def mock_complete_json(prompt, system=None):
        return {
            "score": 8.5,
            "covered_points": ["GIL prevents multi-threading CPU concurrency"],
            "missed_points": ["Did not mention asyncio vs multiprocessing"],
            "strengths": ["Clear explanation of thread locking in CPython"],
            "improvements": ["Elaborate on when to choose multiprocessing over threading"],
            "sample_answer": "In CPython, the Global Interpreter Lock ensures thread safety...",
        }

    monkeypatch.setattr(eval_module, "complete_json", mock_complete_json)

    eval_result = eval_module.evaluate_question_answer(
        question=question,
        candidate_answer="The GIL is a mutex in CPython that protects access to Python objects.",
        job_title="Software Engineer",
        company_name="TechCorp",
    )

    assert eval_result.score == 8.5
    assert "GIL prevents multi-threading CPU concurrency" in eval_result.covered_points
    assert "Did not mention asyncio vs multiprocessing" in eval_result.missed_points


def test_evaluate_question_skipped_answer():
    question = {
        "id": "q3",
        "text": "What is the difference between optimistic and pessimistic locking?",
        "expected_key_points": [
            "Optimistic locking uses version numbers",
            "Pessimistic locks rows",
        ],
    }
    eval_result = eval_module._heuristic_evaluate_question(
        question, "I pass this question.", job_title="Engineer", company_name="Co"
    )
    assert eval_result.score == 0.0
    assert len(eval_result.covered_points) == 0
    assert len(eval_result.missed_points) == 2


# ---------- Presentation Cues & Integrity Tests ----------


def test_presentation_cues_consent_required():
    analysis = {
        "analysis": {
            "eye_contact": "Consistent visual engagement with camera",
            "suggestions": ["Slightly raise microphone volume"],
        }
    }
    # When consented
    cues = eval_module.generate_presentation_cues(analysis, consent_given=True)
    assert cues is not None
    assert len(cues) >= 1
    assert any("visual engagement" in c.lower() for c in cues)

    # When not consented
    no_cues = eval_module.generate_presentation_cues(analysis, consent_given=False)
    assert no_cues is None


def test_integrity_summary_consent_and_scoring():
    events = [
        {"type": "tab_switch", "timestamp": 120},
        {"type": "fullscreen_exit", "timestamp": 150},
        {"type": "face_missing", "timestamp": 200},
    ]

    # When consented
    summary = eval_module.generate_integrity_summary(events, consent_integrity=True)
    assert summary is not None
    assert summary.total_events == 3
    assert summary.tab_switch_count == 1
    assert summary.fullscreen_exit_count == 1
    assert summary.face_missing_count == 1
    assert summary.integrity_score == 80  # 100 - 5 - 5 - 10
    assert len(summary.flags) >= 3

    # When not consented
    no_summary = eval_module.generate_integrity_summary(events, consent_integrity=False)
    assert no_summary is None


# ---------- Curated Next Steps Tests ----------


def test_generate_next_steps_verified_links():
    from app.schemas import QuestionEvaluation

    q_evals = [
        QuestionEvaluation(
            question_id="q1",
            question_text="Explain Python GIL",
            focus_skill_or_project="Python",
            score=5.5,
            candidate_answer="Some answer",
        ),
        QuestionEvaluation(
            question_id="q2",
            question_text="How do you structure React hooks?",
            focus_skill_or_project="React",
            score=6.0,
            candidate_answer="Some answer",
        ),
    ]

    job = _sample_job()
    steps = eval_module.generate_next_steps(q_evals, job)

    assert len(steps) == 3
    for step in steps:
        assert step.skill != ""
        assert step.title != ""
        assert step.action != ""
        # If url is present, it must be an official verified HTTPS link
        if step.url:
            assert step.url.startswith("https://")


# ---------- Full Report Generation & Session Integration ----------


def test_generate_interview_report_e2e(monkeypatch):
    monkeypatch.setattr(
        eval_module,
        "complete_json",
        MagicMock(side_effect=LLMUnavailable("Offline test mode")),
    )

    job = _sample_job()
    resume = _sample_resume()

    # Create session
    session_resp = asyncio.run(
        interview_service.create_interview_session(
            resume=resume,
            job=job,
            num_questions=3,
            consent_recording=True,
            consent_integrity=True,
        )
    )

    # Attach transcript to session
    with db_module.SessionLocal() as db_session:
        model = db_session.get(InterviewSessionModel, session_resp.session_id)
        assert model is not None
        model.transcript = [
            {"role": "assistant", "content": "Welcome! Introduce yourself."},
            {
                "role": "user",
                "content": (
                    "Hi! I am Aarav Sharma, a full stack engineer. I have worked on Python, "
                    "FastAPI, and React applications. The situation was high traffic, my task "
                    "was scaling, I built async queues, and we achieved 99.9% uptime."
                ),
                "duration": 25.0,
            },
            {"role": "assistant", "content": "How did you build the Payment Webhook Service?"},
            {
                "role": "user",
                "content": (
                    "Like, basically, we used FastAPI with Redis idempotency keys. Um, "
                    "we handled webhooks reliably with Celery background tasks."
                ),
                "duration": 30.0,
            },
            {"role": "assistant", "content": "Explain React state management."},
            {
                "role": "user",
                "content": "I used React Context and hooks to manage merchant dashboard state.",
                "duration": 20.0,
            },
        ]
        model.integrity_log = [{"type": "tab_switch", "timestamp": 45}]
        model.perception_analysis = {
            "analysis": {
                "eye_contact": "Steady camera focus",
                "suggestions": ["Keep consistent vocal volume"],
            }
        }
        db_session.commit()

    # Generate report
    report = interview_service.get_or_generate_report(session_resp.session_id)

    assert report.session_id == session_resp.session_id
    assert report.role_title == job.title
    assert report.company_name == job.company
    assert report.candidate_name == "Aarav Sharma"
    assert 0 <= report.overall_score <= 100
    assert report.readiness_level in ("Ready", "Nearly Ready", "Needs Practice")
    assert len(report.question_evaluations) >= 3
    assert len(report.top_strengths) >= 1
    assert len(report.top_improvements) >= 1
    assert len(report.next_steps) == 3
    assert report.communication_metrics.words_per_minute > 0
    assert report.presentation_cues is not None
    assert report.integrity_summary is not None
    assert report.integrity_summary.tab_switch_count == 1


# ---------- API Endpoints Tests ----------


def test_api_report_and_delete_data(monkeypatch):
    monkeypatch.setattr(
        eval_module,
        "complete_json",
        MagicMock(side_effect=LLMUnavailable("Offline test mode")),
    )

    job = _sample_job()
    resume = _sample_resume()

    session_resp = asyncio.run(
        interview_service.create_interview_session(
            resume=resume,
            job=job,
            num_questions=3,
        )
    )

    client = TestClient(app)

    # 1. GET /api/interview/sessions/{session_id}/report
    resp = client.get(f"/api/interview/sessions/{session_resp.session_id}/report")
    assert resp.status_code == 200
    data = resp.json()
    assert data["session_id"] == session_resp.session_id
    assert "overall_score" in data
    assert "readiness_level" in data
    assert "question_evaluations" in data

    # 2. DELETE /api/interview/sessions/{session_id}/data
    del_resp = client.delete(f"/api/interview/sessions/{session_resp.session_id}/data")
    assert del_resp.status_code == 200
    del_data = del_resp.json()
    assert del_data["status"] == "deleted"
    assert del_data["session_id"] == session_resp.session_id

    # Verify session fields in DB are purged
    with db_module.SessionLocal() as db_session:
        model = db_session.get(InterviewSessionModel, session_resp.session_id)
        assert model is not None
        assert model.status == "deleted"
        assert model.transcript is None
        assert model.recording_url is None
        assert model.perception_analysis is None
        assert model.integrity_log is None
        assert model.report is None


def test_tavus_transcription_webhook_auto_generates_report(monkeypatch):
    monkeypatch.setattr(
        eval_module,
        "complete_json",
        MagicMock(side_effect=LLMUnavailable("Offline test mode")),
    )

    job = _sample_job()
    resume = _sample_resume()

    session_resp = asyncio.run(
        interview_service.create_interview_session(
            resume=resume,
            job=job,
            num_questions=2,
        )
    )

    client = TestClient(app)

    # Find the webhook token
    with db_module.SessionLocal() as db_session:
        model = db_session.get(InterviewSessionModel, session_resp.session_id)
        assert model is not None
        token = model.webhook_token

    # Send transcription_ready webhook
    payload = {
        "event_type": "application.transcription_ready",
        "conversation_id": "test-tavus-conv-123",
        "properties": {
            "transcript": [
                {"role": "assistant", "content": "Tell me about your Python experience."},
                {
                    "role": "user",
                    "content": "I have built production backends with Python.",
                    "duration": 15.0,
                },
            ]
        },
    }

    wh_resp = client.post(
        f"/api/interview/webhook/tavus?token={token}&session_id={session_resp.session_id}",
        json=payload,
    )
    assert wh_resp.status_code == 200
    res_json = wh_resp.json()
    assert res_json["status"] == "ok"
    assert res_json["result"]["event"] == "application.transcription_ready"

    # Verify session transitioned to processing
    session_check = client.get(f"/api/interview/sessions/{session_resp.session_id}")
    assert session_check.status_code == 200
    assert session_check.json()["status"] == "processing"

    # Request report endpoint -> transitions to report_ready
    rep_resp = client.get(f"/api/interview/sessions/{session_resp.session_id}/report")
    assert rep_resp.status_code == 200
    assert rep_resp.json()["overall_score"] >= 0

    session_after = client.get(f"/api/interview/sessions/{session_resp.session_id}")
    assert session_after.status_code == 200
    assert session_after.json()["status"] == "report_ready"
    assert session_after.json()["has_report"] is True
