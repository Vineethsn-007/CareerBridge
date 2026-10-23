"""Tests for Tavus CVI integration, webhooks, and session state machine (Task 2)."""

import asyncio

import httpx
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool

from app.core import db as db_module
from app.core.config import settings
from app.main import app
from app.schemas import Job, ParsedResume
from app.services.interview import service as interview_service
from app.services.interview import tavus as tavus_module
from app.services.interview.models import InterviewSessionModel


def _sample_job() -> Job:
    return Job(
        id="job-payment-eng",
        title="Backend Engineer",
        company="Razorpay",
        location="Bengaluru",
        skills_required=["Python", "FastAPI", "PostgreSQL"],
        description="High throughput systems.",
        source_url="https://example.com/job",
    )


def _sample_resume() -> ParsedResume:
    return ParsedResume(
        name="Aditi Verma",
        email="aditi.verma@example.com",
        skills=["Python", "FastAPI"],
        projects=["Payment Gateway Integration in FastAPI"],
        summary="Fintech enthusiast.",
    )


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


def test_tavus_conversational_context_excludes_rubric():
    job = _sample_job()
    resume = _sample_resume()
    plan = interview_service.generate_interview_plan(resume, job, num_questions=3)

    context = tavus_module.format_conversational_context(plan, resume.name)

    assert "Candidate Name: Aditi Verma" in context
    assert "Target Role: Backend Engineer at Razorpay" in context
    assert "INTERVIEW QUESTIONS" in context

    # Ensure hidden rubric is strictly NOT in conversational context
    for q in plan.questions:
        for rubric_point in q.expected_key_points:
            assert rubric_point not in context


def test_get_or_create_interviewer_pal_creates_and_reuses():
    async def _run():
        created_pals = []

        def mock_handler(request: httpx.Request) -> httpx.Response:
            if request.method == "GET" and request.url.path == "/v2/pals":
                return httpx.Response(200, json={"data": created_pals})
            if request.method == "POST" and request.url.path == "/v2/pals":
                data = request.read().decode("utf-8")
                pal_id = f"pal_{len(created_pals) + 1}"
                created_pals.append(
                    {"pal_name": tavus_module.INTERVIEWER_PAL_NAME, "pal_id": pal_id}
                )
                return httpx.Response(200, json={"pal_id": pal_id, "raw": data})
            return httpx.Response(404)

        transport = httpx.MockTransport(mock_handler)
        async with httpx.AsyncClient(
            transport=transport, base_url="https://tavusapi.com/v2"
        ) as client:
            # Patch config
            old_key = settings.tavus_api_key
            object.__setattr__(settings, "tavus_api_key", "mock_key_123")
            try:
                pal_id_1 = await tavus_module.get_or_create_interviewer_pal(client=client)
                assert pal_id_1 == "pal_1"

                # Second call should reuse the existing PAL
                pal_id_2 = await tavus_module.get_or_create_interviewer_pal(client=client)
                assert pal_id_2 == "pal_1"
                assert len(created_pals) == 1
            finally:
                object.__setattr__(settings, "tavus_api_key", old_key)

    asyncio.run(_run())


def test_create_tavus_conversation_and_single_active_session_enforcement():
    async def _run():
        job = _sample_job()
        resume = _sample_resume()

        def mock_handler(request: httpx.Request) -> httpx.Response:
            if request.method == "POST" and "/conversations" in request.url.path:
                return httpx.Response(
                    200,
                    json={
                        "conversation_id": "c_tavus_real_123",
                        "conversation_url": "https://tavus.daily.co/c_tavus_real_123",
                        "status": "active",
                    },
                )
            if request.method == "POST" and request.url.path.endswith("/end"):
                return httpx.Response(200, json={})
            if request.method == "GET" and request.url.path == "/v2/pals":
                return httpx.Response(
                    200,
                    json=[
                        {"pal_name": tavus_module.INTERVIEWER_PAL_NAME, "pal_id": "pal_reusable"}
                    ],
                )
            return httpx.Response(404)

        transport = httpx.MockTransport(mock_handler)
        async with httpx.AsyncClient(
            transport=transport, base_url="https://tavusapi.com/v2"
        ) as client:
            old_key = settings.tavus_api_key
            object.__setattr__(settings, "tavus_api_key", "mock_key_123")
            try:
                # 1. Create first session
                sess1 = await interview_service.create_interview_session(
                    resume=resume,
                    job=job,
                    num_questions=5,
                    duration_minutes=15,
                    consent_recording=True,
                    tavus_client=client,
                )
                assert sess1.status == "created"
                assert sess1.conversation_url == "https://tavus.daily.co/c_tavus_real_123"

                # 2. Create second session for candidate -> enforces single active session
                sess2 = await interview_service.create_interview_session(
                    resume=resume,
                    job=job,
                    num_questions=5,
                    duration_minutes=15,
                    consent_recording=False,
                    tavus_client=client,
                )
                assert sess2.status == "created"

                # Verify first session was marked 'ended'
                old_sess = interview_service.get_interview_session(sess1.session_id)
                assert old_sess is not None
                assert old_sess.status == "ended"
            finally:
                object.__setattr__(settings, "tavus_api_key", old_key)

    asyncio.run(_run())


def test_webhook_lifecycle_and_state_machine():
    async def _run():
        job = _sample_job()
        resume = _sample_resume()

        sess = await interview_service.create_interview_session(
            resume=resume,
            job=job,
            num_questions=5,
            duration_minutes=15,
        )
        session_id = sess.session_id

        with db_module.SessionLocal() as db_session:
            model = db_session.get(InterviewSessionModel, session_id)
            assert model is not None
            token = model.webhook_token
            conv_id = model.tavus_conversation_id

        # 1. Authentication failure on wrong token
        with pytest.raises(PermissionError):
            await interview_service.handle_tavus_webhook(
                {"event_type": "system.pal_joined", "conversation_id": conv_id},
                token="invalid_token",
                session_id=session_id,
            )

        # 2. system.pal_joined -> transition created -> live
        res_join = await interview_service.handle_tavus_webhook(
            {
                "event_type": "system.pal_joined",
                "conversation_id": conv_id,
                "properties": {"face_id": "ra066ab28864"},
            },
            token=token,
            session_id=session_id,
        )
        assert res_join["status"] == "processed"
        assert res_join["session_status"] == "live"

        updated_sess = interview_service.get_interview_session(session_id)
        assert updated_sess.status == "live"

        # 3. application.transcription_ready -> saves transcript, transition live -> processing
        sample_transcript = [
            {
                "role": "assistant",
                "content": (
                    "Hi Aditi, welcome to the interview! Could you briefly introduce yourself?"
                ),
                "timestamp": 1779475660.0,
                "seconds_from_start": 2.0,
                "duration": 4.5,
            },
            {
                "role": "user",
                "content": "I am a CS student specializing in Python and FastAPI backend systems.",
                "timestamp": 1779475666.0,
                "seconds_from_start": 8.0,
                "duration": 6.2,
            },
        ]

        res_trans = await interview_service.handle_tavus_webhook(
            {
                "event_type": "application.transcription_ready",
                "conversation_id": conv_id,
                "properties": {"transcript": sample_transcript},
            },
            token=token,
            session_id=session_id,
        )
        assert res_trans["status"] == "processed"
        assert res_trans["turns"] == 2

        with db_module.SessionLocal() as db_session:
            db_model = db_session.get(InterviewSessionModel, session_id)
            assert db_model.status == "processing"
            assert len(db_model.transcript) == 2

        # 4. application.recording_ready -> saves recording storage URI
        await interview_service.handle_tavus_webhook(
            {
                "event_type": "application.recording_ready",
                "conversation_id": conv_id,
                "properties": {
                    "storage_provider": "s3",
                    "storage_uri": "s3://careerbridge-recordings/session-1.mp4",
                },
            },
            token=token,
            session_id=session_id,
        )
        with db_module.SessionLocal() as db_session:
            db_model = db_session.get(InterviewSessionModel, session_id)
            assert db_model.recording_url == "s3://careerbridge-recordings/session-1.mp4"

        # 5. application.perception_analysis -> saves presentation cues
        await interview_service.handle_tavus_webhook(
            {
                "event_type": "application.perception_analysis",
                "conversation_id": conv_id,
                "properties": {
                    "analysis": (
                        "Candidate maintained steady eye contact and professional composure."
                    ),
                },
            },
            token=token,
            session_id=session_id,
        )
        with db_module.SessionLocal() as db_session:
            db_model = db_session.get(InterviewSessionModel, session_id)
            assert db_model.perception_analysis == {
                "analysis": "Candidate maintained steady eye contact and professional composure."
            }

    asyncio.run(_run())


def test_end_interview_endpoint_and_fallback_transcript_sync():
    async def _run():
        client = TestClient(app)
        job = _sample_job()
        resume = _sample_resume()

        sess = await interview_service.create_interview_session(
            resume=resume,
            job=job,
            num_questions=5,
            duration_minutes=15,
        )
        session_id = sess.session_id

        # 1. End interview call
        end_res = client.post(
            f"/api/interview/sessions/{session_id}/end", json={"reason": "user_exit"}
        )
        assert end_res.status_code == 200
        assert end_res.json()["status"] == "ended"

        # Set non-mock tavus_conversation_id for fallback polling test
        with db_module.SessionLocal() as db_session:
            db_model = db_session.get(InterviewSessionModel, session_id)
            db_model.tavus_conversation_id = "c_tavus_test_123"
            db_session.commit()

        # 2. Test fallback polling when transcript arrives in verbose endpoint
        verbose_transcript = [
            {
                "role": "assistant",
                "content": "Tell me about your FastAPI project.",
                "timestamp": 1779475660.0,
                "seconds_from_start": 3.0,
                "duration": 2.5,
            },
            {
                "role": "user",
                "content": "I built a reconciliation engine handling 5,000 transactions/sec.",
                "timestamp": 1779475664.0,
                "seconds_from_start": 7.0,
                "duration": 5.0,
            },
        ]

        def mock_verbose_handler(request: httpx.Request) -> httpx.Response:
            if request.method == "GET" and "verbose=true" in str(request.url):
                return httpx.Response(
                    200,
                    json={
                        "events": [
                            {
                                "event_type": "application.transcription_ready",
                                "properties": {"transcript": verbose_transcript},
                            }
                        ]
                    },
                )
            return httpx.Response(404)

        transport = httpx.MockTransport(mock_verbose_handler)
        base_v2 = "https://tavusapi.com/v2"
        async with httpx.AsyncClient(transport=transport, base_url=base_v2) as t_client:
            old_key = settings.tavus_api_key
            object.__setattr__(settings, "tavus_api_key", "mock_key_123")
            try:
                synced = await interview_service.poll_and_sync_transcript(
                    session_id, client=t_client
                )
                assert synced is True
                updated_sess = interview_service.get_interview_session(session_id)
                assert updated_sess.status == "processing"
            finally:
                object.__setattr__(settings, "tavus_api_key", old_key)

    asyncio.run(_run())
