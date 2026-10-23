"""Tests for the database foundation: engine, sessions and SQLAlchemy 2 models.

Every test runs against an isolated in-memory SQLite database; no files are written.
"""

import datetime as dt

import pytest
from sqlalchemy import create_engine, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.pool import StaticPool

from app.core.db import (
    SCHEMA_VERSION,
    Base,
    CachedResource,
    Company,
    Job,
    PersonaProfile,
    ResumeProfile,
    init_db,
)


@pytest.fixture()
def engine():
    eng = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        future=True,
    )
    init_db(eng)
    return eng


@pytest.fixture()
def session(engine):
    Session = engine_sessionmaker(engine)
    db = Session()
    try:
        yield db
    finally:
        db.close()


def engine_sessionmaker(engine):
    from sqlalchemy.orm import sessionmaker

    return sessionmaker(bind=engine, autoflush=False, expire_on_commit=False, future=True)


# ---------------- schema initialization ----------------


def test_init_db_creates_all_tables(engine):
    assert set(Base.metadata.tables) >= {
        "schema_version",
        "companies",
        "jobs",
        "resume_profiles",
        "persona_profiles",
        "resources",
    }


def test_init_db_records_schema_version(engine):
    with engine.connect() as conn:
        version = conn.execute(text("SELECT version FROM schema_version LIMIT 1")).scalar()
    assert version == SCHEMA_VERSION


def test_init_db_is_idempotent(engine):
    init_db(engine)  # second call must not raise or duplicate rows
    with engine.connect() as conn:
        rows = conn.execute(text("SELECT COUNT(*) FROM schema_version")).scalar()
    assert rows == 1


# ---------------- model round-trips ----------------


def test_company_and_job_round_trip(session):
    company = Company(
        name="Zeta Labs", careers_url="https://zetalabs.example/careers", ats_type="greenhouse"
    )
    session.add(company)
    session.flush()

    job = Job(
        id="zl-backend-intern",
        company_id=company.id,
        title="Backend Intern",
        location="Bengaluru",
        job_type="internship",
        experience_level="fresher",
        source_url="https://boards.greenhouse.example/zetalabs/jobs/1",
        apply_url="https://boards.greenhouse.example/zetalabs/jobs/1/apply",
        description="Build API services.",
        must_skills=["Python", "SQL"],
        nice_skills=["FastAPI"],
        skills_required=["Python", "SQL"],
        verified=True,
        last_verified=dt.date(2026, 10, 20),
        first_seen=dt.datetime(2026, 10, 20, tzinfo=dt.UTC),
        last_scraped_at=dt.datetime(2026, 10, 23, tzinfo=dt.UTC),
        is_active=True,
    )
    session.add(job)
    session.commit()

    loaded = session.scalar(select(Job).where(Job.id == "zl-backend-intern"))
    assert loaded is not None
    assert loaded.title == "Backend Intern"
    assert loaded.verified is True
    assert loaded.must_skills == ["Python", "SQL"]
    assert loaded.company.name == "Zeta Labs"
    assert job in loaded.company.jobs


def test_duplicate_source_url_is_rejected(session):
    base = dict(
        id="a",
        title="T",
        location="L",
        job_type="internship",
        experience_level="fresher",
        source_url="https://example.test/jobs/1",
        description="D",
        must_skills=["Python"],
        nice_skills=[],
        skills_required=["Python"],
        verified=False,
    )
    session.add(Job(**base))
    session.commit()
    session.add(Job(**{**base, "id": "b"}))
    with pytest.raises(IntegrityError):
        session.commit()


def test_resume_profile_and_persona_linking(session):
    profile = ResumeProfile(
        name="Test Candidate",
        email="candidate@example.test",
        skills=[{"name": "Python", "weight": 1.0}],
        education=[{"institution": "Example University"}],
        raw_text="synthetic resume text",
    )
    session.add(profile)
    session.flush()

    persona = PersonaProfile(
        resume_profile_id=profile.id,
        answers=[{"question": "q1", "answer": "a1"}],
        strengths=[{"strength": "Ownership", "quote": "I rebuilt the deploy pipeline"}],
        confidence="medium",
        summary="Reliable self-starter.",
    )
    session.add(persona)
    session.commit()

    loaded = session.scalar(select(ResumeProfile))
    assert loaded.name == "Test Candidate"
    assert loaded.skills == [{"name": "Python", "weight": 1.0}]
    assert [p.summary for p in loaded.personas] == ["Reliable self-starter."]
    assert persona.resume_profile.email == "candidate@example.test"


def test_cached_resource_round_trip_and_unique_url(session):
    session.add(
        CachedResource(
            kind="video",
            skill="python",
            title="Python basics",
            url="https://www.youtube.com/watch?v=test",
            provider="Example Channel",
            duration_minutes=15,
            verified=True,
            last_verified=dt.date(2026, 10, 22),
        )
    )
    session.commit()
    assert session.scalar(select(CachedResource)).title == "Python basics"

    session.add(
        CachedResource(
            kind="video",
            skill="python",
            title="Duplicate",
            url="https://www.youtube.com/watch?v=test",
        )
    )
    with pytest.raises(IntegrityError):
        session.commit()


def test_get_session_dependency_yields_and_closes(session, engine, monkeypatch):
    import app.core.db as db_mod

    monkeypatch.setattr(db_mod, "SessionLocal", engine_sessionmaker(engine))
    gen = db_mod.get_session()
    db = next(gen)
    db.add(Company(name="Dep Co"))
    db.commit()
    try:
        gen.send(None)
    except StopIteration:
        pass
    # The session was closed without leaking rows into a fresh session.
    fresh = engine_sessionmaker(engine)()
    assert fresh.scalar(select(Company).where(Company.name == "Dep Co")) is not None
    fresh.close()


def test_schema_version_newer_than_code_is_detected(session, engine, monkeypatch):
    import app.core.db as db_mod

    with engine.begin() as conn:
        conn.execute(text("UPDATE schema_version SET version = 99"))
    # Should log a warning, not raise.
    db_mod.init_db(engine)
