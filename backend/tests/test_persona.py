"""Persona Q&A agent tests. LLM calls are mocked; DB is an isolated in-memory SQLite."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.core.db as db_mod
from app.main import app
from app.schemas import (
    ParsedResume,
    PersonaAnswerRequest,
    PersonaAnswerResponse,
    PersonaStartRequest,
)
from app.services.persona import service as persona_service
from app.services.persona.models import ProfileSpec, QuestionSpec

client = TestClient(app)

RESUME = ParsedResume(
    name="Test Cand",
    email="cand@example.test",
    skills=["Python", "React"],
    projects=["Campus helpdesk chatbot"],
    raw_text="Test Cand, Python, React; built a campus helpdesk chatbot.",
)


@pytest.fixture()
def db():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        future=True,
    )
    db_mod.init_db(engine)
    Session = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False, future=True)
    monkey_sessionmaker = Session
    a_session = monkey_sessionmaker()
    try:
        yield a_session
    finally:
        a_session.close()
        engine.dispose()


@pytest.fixture()
def restore_db(monkeypatch, db):
    """Route-level calls use the same isolated session pool."""
    Session = sessionmaker(bind=db.bind, autoflush=False, expire_on_commit=False, future=True)
    monkeypatch.setattr(db_mod, "SessionLocal", Session)
    yield


def gen_ok(monkeypatch, question_payloads, profile_payload=None):
    """Make the persona service use scripted structured outputs."""
    calls: list[tuple[str, str]] = []
    state = {"q": 0}

    def qfake(prompt, system=None):
        state["q"] += 1
        idx = min(state["q"] - 1, len(question_payloads) - 1)
        calls.append(("question", prompt))
        return QuestionSpec.model_validate(question_payloads[idx])

    def pfake(prompt, system=None):
        calls.append(("profile", prompt))
        return ProfileSpec.model_validate(profile_payload or {"strengths": []})

    monkeypatch.setattr(persona_service, "_QUESTION_GENERATOR", qfake)
    monkeypatch.setattr(persona_service, "_PROFILE_GENERATOR", pfake)
    return calls


# ---------------- starting the flow ----------------


def test_start_creates_session_and_first_question(monkeypatch, db):
    gen_ok(
        monkeypatch,
        [{"topic": "ownership", "question": "Tell me about owning a delivery end to end."}],
    )
    start = persona_service.start_persona(db, PersonaStartRequest(resume=RESUME))
    assert start.completed is False
    assert start.total_questions == persona_service.TOTAL_QUESTIONS
    assert persona_service.MIN_QUESTIONS <= start.total_questions <= persona_service.MAX_QUESTIONS
    assert start.question.topic == "ownership"
    assert start.question.index == 1
    record = db.get(db_mod.PersonaProfile, start.persona_id)
    assert record is not None
    assert record.resume_profile_id == start.resume_profile_id


# ---------------- adaptive questions + limits ----------------


def test_followups_reference_resume_and_do_not_repeat(monkeypatch, db):
    scripted = [
        {"topic": "ownership", "question": "Tell me about owning the helpdesk chatbot end to end."},
        {"topic": "teamwork", "question": "Who did you build that with and how did it go?"},
        {"topic": "initiative", "question": "Ever start something nobody asked for?"},
        {"topic": "communication", "question": "How do you explain chatbot design to friends?"},
        {"topic": "learning agility", "question": "What did you learn while building it?"},
        {"topic": "leadership", "question": "Have you coordinated anyone on this path?"},
    ]
    calls = gen_ok(monkeypatch, scripted)
    start = persona_service.start_persona(db, PersonaStartRequest(resume=RESUME))
    persona_id = start.persona_id
    q = start.question
    seen = {q.question}
    for _ in range(scripted.index(scripted[-1]) + 1 - 1):
        answer = "I answer fully and specifically every single time, promise."
        resp = persona_service.answer_persona(
            db,
            PersonaAnswerRequest(persona_id=persona_id, question=q, answer=answer),
        )
        if resp.completed:
            break
        assert resp.question.question not in seen
        seen.add(resp.question.question)
        q = resp.question
    # The prompt for later questions contains the earlier answer (adaptive).
    assert any("helpdesk chatbot" in p for kind, p in calls if kind == "question")


def test_six_topics_covered_within_five_to_seven_questions(monkeypatch, db):
    scripted = [
        {"topic": "ownership", "question": "Q-ownership?"},
        {"topic": "teamwork", "question": "Q-teamwork?"},
        {"topic": "initiative", "question": "Q-initiative?"},
        {"topic": "communication", "question": "Q-communication?"},
        {"topic": "learning agility", "question": "Q-learning?"},
        {"topic": "leadership", "question": "Q-leadership?"},
    ]
    gen_ok(monkeypatch, scripted)
    resp = persona_service.start_persona(db, PersonaStartRequest(resume=RESUME))
    asked = 0
    q = resp.question
    persona_id = resp.persona_id
    while True:
        answer = persona_service.answer_persona(
            db, PersonaAnswerRequest(persona_id=persona_id, question=q, answer="follower")
        )
        asked += 1
        if answer.completed:
            break
        q = answer.question
    assert persona_service.MIN_QUESTIONS <= asked <= persona_service.MAX_QUESTIONS
    assert asked == len(scripted)


# ---------------- skip behaviour ----------------


def test_skip_records_no_evidence_and_flow_continues(monkeypatch, db):
    scripted = [
        {"topic": "ownership", "question": "Q1?"},
        {"topic": "teamwork", "question": "Q2?"},
        {"topic": "initiative", "question": "Q3?"},
        {"topic": "communication", "question": "Q4?"},
        {"topic": "learning agility", "question": "Q5?"},
        {"topic": "leadership", "question": "Q6?"},
    ]
    gen_ok(monkeypatch, scripted)
    start = persona_service.start_persona(db, PersonaStartRequest(resume=RESUME))
    q = start.question
    persona_id = start.persona_id
    skipped_topic = None
    for i in range(persona_service.MAX_QUESTIONS + 1):
        skip = i == 0  # skip the very first question
        if skip:
            skipped_topic = q.topic
        resp: PersonaAnswerResponse = persona_service.answer_persona(
            db,
            PersonaAnswerRequest(
                persona_id=persona_id,
                question=q,
                answer=None if skip else "Full answer here.",
                skip=skip,
            ),
        )
        if resp.completed:
            break
        q = resp.question
    record = db.get(db_mod.PersonaProfile, persona_id)
    # The skipped topic carries no fabricated answer text.
    skipped_entries = [e for e in record.answers if e["topic"] == skipped_topic]
    assert skipped_entries and skipped_entries[0]["answer"] is None


def test_skip_and_answer_are_mutually_exclusive(monkeypatch, db):
    gen_ok(monkeypatch, [{"topic": "ownership", "question": "Q?"}])
    start = persona_service.start_persona(db, PersonaStartRequest(resume=RESUME))
    with pytest.raises(ValueError):
        persona_service.answer_persona(
            db,
            PersonaAnswerRequest(
                persona_id=start.persona_id,
                question=start.question,
                answer="text",
                skip=True,
            ),
        )


def test_empty_answer_without_skip_is_rejected(monkeypatch, db):
    gen_ok(monkeypatch, [{"topic": "ownership", "question": "Q?"}])
    start = persona_service.start_persona(db, PersonaStartRequest(resume=RESUME))
    with pytest.raises(ValueError):
        persona_service.answer_persona(
            db,
            PersonaAnswerRequest(
                persona_id=start.persona_id, question=start.question, answer="   "
            ),
        )


# ---------------- completion / persistence ----------------


def test_completion_persists_profile_with_verbatim_quotes(monkeypatch, db):
    scripted = [
        {"topic": "ownership", "question": "Q-own?"},
        {"topic": "teamwork", "question": "Q-team?"},
        {"topic": "initiative", "question": "Q-init?"},
        {"topic": "communication", "question": "Q-comm?"},
        {"topic": "learning agility", "question": "Q-learn?"},
        {"topic": "leadership", "question": "Q-lead?"},
    ]
    profile_payload = {
        "strengths": [
            {
                "strength": "Ownership",
                "quote": "I REBUILT THE PIPELINE ALONE",
                "topic": "ownership",
            },
        ],
        "summary": "You described ownership and initiative.",
    }
    gen_ok(monkeypatch, scripted, profile_payload)
    start = persona_service.start_persona(db, PersonaStartRequest(resume=RESUME))
    q, persona_id = start.question, start.persona_id
    ownership_answer = "Yes, I rebuilt the pipeline alone and shipped it."
    final = None
    for _ in range(persona_service.MAX_QUESTIONS + 1):
        resp = persona_service.answer_persona(
            db,
            PersonaAnswerRequest(
                persona_id=persona_id,
                question=q,
                answer=ownership_answer if q.topic == "ownership" else "More detail follows.",
            ),
        )
        if resp.completed:
            final = resp.profile
            break
        q = resp.question
    assert final is not None and final.completed is True
    # The LLM quote did not exist verbatim, so the fallback quote is the candidate's own
    # actual words (we must never fabricate or paraphrase evidence).
    assert final.strengths[0].quote in ownership_answer
    assert final.strengths[0].topic == "ownership"
    record = db.get(db_mod.PersonaProfile, persona_id)
    assert record.summary == "You described ownership and initiative."
    assert record.strengths == [s.model_dump() for s in final.strengths]
    assert record.resume_profile_id == start.resume_profile_id
    persisted_resume = db.get(db_mod.ResumeProfile, start.resume_profile_id)
    assert persisted_resume.email == "cand@example.test"


def test_profiles_only_from_real_answers_no_skips_no_fabrications(monkeypatch, db):
    scripted = [
        {"topic": "ownership", "question": "Q-own?"},
        {"topic": "teamwork", "question": "Q-team?"},
        {"topic": "initiative", "question": "Q-init?"},
        {"topic": "communication", "question": "Q-comm?"},
        {"topic": "learning agility", "question": "Q-learn?"},
        {"topic": "leadership", "question": "Q-lead?"},
    ]
    # LLM claims a strength the candidate never answered (leadership was skipped? no,
    # they skip everything except one topic).
    profile_payload = {
        "strengths": [
            {"strength": "Leadership", "quote": "invented never-said quote", "topic": "leadership"},
        ],
        "summary": None,
    }
    gen_ok(monkeypatch, scripted, profile_payload)
    start = persona_service.start_persona(db, PersonaStartRequest(resume=RESUME))
    q, persona_id = start.question, start.persona_id
    final = None
    for _ in range(persona_service.MAX_QUESTIONS + 1):
        skip = q.topic != "ownership"  # skip everything except the ownership question
        resp = persona_service.answer_persona(
            db,
            PersonaAnswerRequest(
                persona_id=persona_id,
                question=q,
                answer=None if skip else "I owned the whole chatbot from zero to launch.",
                skip=skip,
            ),
        )
        if resp.completed:
            final = resp.profile
            break
        q = resp.question
    assert final is not None
    quote_sources = {s.quote for s in final.strengths}
    assert quote_sources == {"I owned the whole chatbot from zero to launch."[:160]}


# ---------------- unavailable LLM ----------------


def test_llm_unavailable_flow_still_works_end_to_end(monkeypatch, db):
    personas_llm_off(monkeypatch)
    start = persona_service.start_persona(db, PersonaStartRequest(resume=RESUME))
    assert start.question.question  # deterministic fallback question anchors the resume
    assert "chatbot" in start.question.question  # anchored to the resume project


def personas_llm_off(monkeypatch):
    def boom(prompt, system=None):
        from app.core.llm import LLMUnavailable

        raise LLMUnavailable("mocked off")

    monkeypatch.setattr(persona_service, "_QUESTION_GENERATOR", boom)
    monkeypatch.setattr(persona_service, "_PROFILE_GENERATOR", boom)


def test_llm_unavailable_completion_still_uses_candidate_words(monkeypatch, db):
    personas_llm_off(monkeypatch)
    start = persona_service.start_persona(db, PersonaStartRequest(resume=RESUME))
    q, persona_id = start.question, start.persona_id
    final = None
    for _ in range(persona_service.MAX_QUESTIONS + 1):
        resp = persona_service.answer_persona(
            db,
            PersonaAnswerRequest(
                persona_id=persona_id, question=q, answer="I led a team of four at college."
            ),
        )
        if resp.completed:
            final = resp.profile
            break
        q = resp.question
    assert final is not None
    assert any(s.quote == "I led a team of four at college." for s in final.strengths)
    assert final.confidence in {"medium", "high"}


# ---------------- HTTP API compatibility ----------------


def test_persona_api_start_and_complete_round_trip(restore_db, monkeypatch):
    scripted = [
        {"topic": "ownership", "question": "Q-own?"},
        {"topic": "teamwork", "question": "Q-team?"},
        {"topic": "initiative", "question": "Q-init?"},
        {"topic": "communication", "question": "Q-comm?"},
        {"topic": "learning agility", "question": "Q-learn?"},
        {"topic": "leadership", "question": "Q-lead?"},
    ]
    gen_ok(
        monkeypatch,
        scripted,
        {"strengths": [], "summary": None},
    )
    start = client.post(
        "/api/persona/start",
        json={"resume": RESUME.model_dump(mode="json")},
    )
    assert start.status_code == 200
    body = start.json()
    for key in ("persona_id", "resume_profile_id", "total_questions", "completed", "question"):
        assert key in body
    persona_id = body["persona_id"]
    q = body["question"]
    final = None
    for _ in range(persona_service.MAX_QUESTIONS + 1):
        response = client.post(
            "/api/persona/answer",
            json={"persona_id": persona_id, "question": q, "answer": "Answer text here."},
        )
        assert response.status_code == 200
        body = response.json()
        if body["completed"]:
            final = body["profile"]
            break
        q = body["question"]
    assert final is not None
    for key in (
        "persona_id",
        "resume_profile_id",
        "strengths",
        "summary",
        "confidence",
        "completed",
    ):
        assert key in final


def test_persona_api_unknown_persona_422(restore_db):
    response = client.post(
        "/api/persona/answer",
        json={
            "persona_id": 99999,
            "question": {"index": 1, "topic": "ownership", "question": "Q?"},
            "answer": "hello",
        },
    )
    assert response.status_code == 422
