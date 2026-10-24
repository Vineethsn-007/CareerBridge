"""Tests for resume tailoring agent, truthfulness validator, renderer, and endpoints."""

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.core.db as db_mod
from app.main import app
from app.schemas import (
    Education,
    Experience,
    Job,
    ParsedResume,
    TailoredExperience,
    TailoredResume,
)
from app.services.tailoring.fallback import build_fallback_tailored_resume
from app.services.tailoring.models import (
    LLMChangeEntry,
    LLMTailoredExperience,
    LLMTailoredProject,
    LLMTailoredResume,
)
from app.services.tailoring.render import render_docx, render_pdf
from app.services.tailoring.service import tailor_resume
from app.services.tailoring.validator import (
    TruthfulnessValidationError,
    validate_and_clean_tailored_resume,
)

client = TestClient(app)

SAMPLE_RESUME = ParsedResume(
    name="Rohan Verma",
    email="rohan@example.com",
    phone="+91 9876543210",
    summary="Fresher software engineer passionate about Python, FastAPI and React.",
    skills=["Python", "FastAPI", "React", "PostgreSQL", "Git"],
    education=[Education(institution="IIT Bombay", degree="B.Tech Computer Science", year="2024")],
    experience=[
        Experience(
            title="Software Engineering Intern",
            company="Tech Corp India",
            duration="3 months",
            summary="Built REST APIs using Python and improved query latency by 25%.",
            technologies=["Python", "FastAPI", "PostgreSQL"],
            impact=["Reduced query latency by 25% across 5 services."],
        )
    ],
    projects=["E-commerce Backend: Built microservices using FastAPI and PostgreSQL."],
    raw_text=(
        "Rohan Verma, rohan@example.com, Python, FastAPI, React, PostgreSQL, "
        "Git, Tech Corp India, 25%, 5 services, 2024."
    ),
)

SAMPLE_JOB = Job(
    id="job-python-dev-1",
    title="Python Backend Developer",
    company="Swiggy",
    location="Bengaluru",
    job_type="full-time",
    experience_level="fresher",
    skills_required=["Python", "FastAPI", "PostgreSQL", "Docker", "AWS", "Kubernetes"],
    description="Python Backend Developer with FastAPI, PostgreSQL, Docker, AWS.",
    source_url="https://swiggy.careers/job-1",
    verified=True,
    apply_url="https://swiggy.careers/job-1/apply",
)


# ---------------- Truthfulness Validator Tests ----------------


def test_validator_removes_fabricated_skill():
    """Any skill not in candidate source profile must be auto-removed."""
    untruthful = TailoredResume(
        headline="Python Developer",
        summary="Experienced developer.",
        skills_grouped={
            "Target Role Requirements": ["Python", "Docker", "Kubernetes", "AWS"],
            "Other Skills": ["FastAPI", "Rust"],
        },
        experience=[],
        projects=[],
        education=[],
        certifications=[],
        change_log=[],
        ats_keywords_matched=["Python", "Docker"],
        gaps_not_added=[],
    )

    cleaned, violations = validate_and_clean_tailored_resume(untruthful, SAMPLE_RESUME)

    # Legitimate skills kept
    assert "Python" in cleaned.skills_grouped["Target Role Requirements"]
    assert "FastAPI" in cleaned.skills_grouped["Other Skills"]

    # Hallucinated skills removed
    assert "Docker" not in cleaned.skills_grouped["Target Role Requirements"]
    assert "Kubernetes" not in cleaned.skills_grouped["Target Role Requirements"]
    assert "AWS" not in cleaned.skills_grouped["Target Role Requirements"]
    assert "Rust" not in cleaned.skills_grouped.get("Other Skills", [])

    # Fabricated skills added to gaps_not_added
    assert "Docker" in cleaned.gaps_not_added
    assert "Kubernetes" in cleaned.gaps_not_added
    assert any("Fabricated skill removed" in v for v in violations)


def test_validator_rejects_fabricated_company():
    """An experience entry at an invented company must be rejected/removed."""
    untruthful = TailoredResume(
        headline="Backend Engineer",
        summary="Summary text.",
        skills_grouped={"Skills": ["Python"]},
        experience=[
            TailoredExperience(
                title="Software Engineer",
                company="Google",  # Fabricated! Source has Tech Corp India
                duration="6 months",
                bullets=["Built large-scale systems."],
            ),
            TailoredExperience(
                title="Software Engineering Intern",
                company="Tech Corp India",  # Genuine!
                duration="3 months",
                bullets=["Built REST APIs."],
            ),
        ],
        projects=[],
        education=[],
        certifications=[],
        change_log=[],
        ats_keywords_matched=[],
        gaps_not_added=[],
    )

    cleaned, violations = validate_and_clean_tailored_resume(untruthful, SAMPLE_RESUME)

    assert len(cleaned.experience) == 1
    assert cleaned.experience[0].company == "Tech Corp India"
    assert any("Fabricated company rejected: 'Google'" in v for v in violations)


def test_validator_removes_fabricated_numbers():
    """Rewritten bullets with invented metrics (e.g. 95% when source had 25%) are removed."""
    untruthful = TailoredResume(
        headline="Backend Engineer",
        summary="Summary text.",
        skills_grouped={"Skills": ["Python"]},
        experience=[
            TailoredExperience(
                title="Software Engineering Intern",
                company="Tech Corp India",
                duration="3 months",
                bullets=[
                    "Reduced query latency by 25%.",  # Genuine: '25%' is in source
                    "Increased revenue by 95% and onboarded 10000 users.",  # Fabricated metrics!
                ],
            )
        ],
        projects=[],
        education=[],
        certifications=[],
        change_log=[],
        ats_keywords_matched=[],
        gaps_not_added=[],
    )

    cleaned, violations = validate_and_clean_tailored_resume(untruthful, SAMPLE_RESUME)

    assert len(cleaned.experience[0].bullets) == 1
    assert "25%" in cleaned.experience[0].bullets[0]
    assert any("Fabricated metric" in v for v in violations)


def test_validator_strict_mode_raises():
    """In strict mode, ungrounded claims trigger TruthfulnessValidationError."""
    untruthful = TailoredResume(
        headline="Backend Engineer",
        summary="Summary text.",
        skills_grouped={"Skills": ["NonExistentSkill123"]},
        experience=[],
        projects=[],
        education=[],
        certifications=[],
        change_log=[],
        ats_keywords_matched=[],
        gaps_not_added=[],
    )
    with pytest.raises(TruthfulnessValidationError):
        validate_and_clean_tailored_resume(untruthful, SAMPLE_RESUME, strict=True)


# ---------------- Renderer Smoke Tests ----------------


def test_render_docx_valid():
    """DOCX renderer outputs a valid Word document starting with ZIP magic bytes."""
    tailored = build_fallback_tailored_resume(SAMPLE_RESUME, SAMPLE_JOB)
    data = render_docx(tailored, profile=SAMPLE_RESUME)

    assert isinstance(data, bytes)
    assert len(data) > 1000
    assert data[:4] == b"PK\x03\x04"  # Standard docx/zip header


def test_render_pdf_valid():
    """PDF renderer outputs a valid PDF starting with %PDF- header."""
    tailored = build_fallback_tailored_resume(SAMPLE_RESUME, SAMPLE_JOB)
    data = render_pdf(tailored, profile=SAMPLE_RESUME)

    assert isinstance(data, bytes)
    assert len(data) > 1000
    assert data[:5] == b"%PDF-"  # Standard PDF magic header


# ---------------- Deterministic Fallback & ATS Scores ----------------


def test_deterministic_fallback_relevance_sorting():
    """Deterministic fallback sorts candidate skills and experiences by job relevance."""
    tailored = build_fallback_tailored_resume(SAMPLE_RESUME, SAMPLE_JOB)

    assert tailored.headline == f"{SAMPLE_JOB.title} | {SAMPLE_RESUME.name}"
    # Python, FastAPI, PostgreSQL should be under Relevant Skills
    relevant = tailored.skills_grouped.get("Relevant Skills", [])
    assert "Python" in relevant
    assert "FastAPI" in relevant
    assert "PostgreSQL" in relevant

    # Job missing skills (Docker, AWS, Kubernetes) are under gaps_not_added, NOT skills
    assert "Docker" in tailored.gaps_not_added
    assert "AWS" in tailored.gaps_not_added
    assert "Kubernetes" in tailored.gaps_not_added

    # Experience retained
    assert len(tailored.experience) == 1
    assert tailored.experience[0].company == "Tech Corp India"


def test_tailor_resume_service_offline_mode():
    """With LLM unavailable, tailor_resume produces valid tailored resume with ATS scores."""
    tailored = tailor_resume(SAMPLE_RESUME, SAMPLE_JOB)

    assert tailored.ats_score_before > 0
    assert tailored.ats_score_after >= tailored.ats_score_before
    assert tailored.headline
    assert len(tailored.change_log) > 0


# ---------------- API Endpoints, Ownership & Rate Limiting ----------------


@pytest.fixture()
def test_db(monkeypatch):
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        future=True,
    )
    db_mod.init_db(engine)
    Session = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False, future=True)
    monkeypatch.setattr(db_mod, "SessionLocal", Session)
    session = Session()

    # Seed SAMPLE_JOB so endpoints find it
    job_row = db_mod.Job(
        id=SAMPLE_JOB.id,
        title=SAMPLE_JOB.title,
        location=SAMPLE_JOB.location,
        job_type=SAMPLE_JOB.job_type,
        experience_level=SAMPLE_JOB.experience_level,
        source_url=SAMPLE_JOB.source_url,
        apply_url=SAMPLE_JOB.apply_url,
        description=SAMPLE_JOB.description,
        skills_required=SAMPLE_JOB.skills_required,
        must_skills=SAMPLE_JOB.skills_required[:3],
        nice_skills=SAMPLE_JOB.skills_required[3:],
        verified=True,
        is_active=True,
    )
    session.add(job_row)
    session.commit()

    try:
        yield session
    finally:
        session.close()
        engine.dispose()


def test_api_tailor_and_ownership(test_db):
    """User A tailors a resume. User B receives 404 when attempting to access it."""
    user_a = str(uuid.uuid4())
    user_b = str(uuid.uuid4())

    # 1. User A generates tailored resume
    resp_a = client.post(
        "/api/resume/tailor",
        headers={"X-User-ID": user_a},
        json={"job_id": SAMPLE_JOB.id, "resume": SAMPLE_RESUME.model_dump(mode="json")},
    )
    assert resp_a.status_code == 200
    data_a = resp_a.json()
    record_id = data_a["id"]
    assert data_a["user_id"] == user_a
    assert data_a["version"] == 1
    assert data_a["content"]["headline"]

    # 2. User A can retrieve it
    get_a = client.get(f"/api/resume/tailored/{record_id}", headers={"X-User-ID": user_a})
    assert get_a.status_code == 200

    # 3. User B receives 404 (Ownership isolation)
    get_b = client.get(f"/api/resume/tailored/{record_id}", headers={"X-User-ID": user_b})
    assert get_b.status_code == 404

    # 4. User B cannot download it
    dl_b = client.get(
        f"/api/resume/tailored/{record_id}/download?format=pdf", headers={"X-User-ID": user_b}
    )
    assert dl_b.status_code == 404

    # 5. User A downloads valid PDF and DOCX
    dl_pdf = client.get(
        f"/api/resume/tailored/{record_id}/download?format=pdf", headers={"X-User-ID": user_a}
    )
    assert dl_pdf.status_code == 200
    assert dl_pdf.headers["content-type"] == "application/pdf"
    assert dl_pdf.content[:5] == b"%PDF-"

    dl_docx = client.get(
        f"/api/resume/tailored/{record_id}/download?format=docx", headers={"X-User-ID": user_a}
    )
    assert dl_docx.status_code == 200
    assert dl_docx.content[:4] == b"PK\x03\x04"


def test_api_versioning_edits(test_db):
    """PUT saves user edits as a new version."""
    user_id = str(uuid.uuid4())

    resp = client.post(
        "/api/resume/tailor",
        headers={"X-User-ID": user_id},
        json={"job_id": SAMPLE_JOB.id, "resume": SAMPLE_RESUME.model_dump(mode="json")},
    )
    assert resp.status_code == 200
    orig = resp.json()
    record_id = orig["id"]

    # User modifies headline and summary
    edited_content = orig["content"]
    edited_content["headline"] = "Custom Senior Python Developer"
    edited_content["summary"] = "Manually edited summary aimed at Swiggy."

    put_resp = client.put(
        f"/api/resume/tailored/{record_id}",
        headers={"X-User-ID": user_id},
        json=edited_content,
    )
    assert put_resp.status_code == 200
    updated = put_resp.json()
    assert updated["version"] == 2
    assert updated["content"]["headline"] == "Custom Senior Python Developer"

    # Version list shows both versions
    list_resp = client.get(
        f"/api/resume/tailored?job_id={SAMPLE_JOB.id}", headers={"X-User-ID": user_id}
    )
    assert list_resp.status_code == 200
    versions = list_resp.json()
    assert len(versions) == 2
    assert versions[0]["version"] == 2
    assert versions[1]["version"] == 1


def test_api_rate_limiting(test_db):
    """Rapid requests exceeding rate limit trigger 429."""
    user_id = str(uuid.uuid4())

    # Send 10 requests (within limit)
    for _ in range(10):
        r = client.post(
            "/api/resume/tailor",
            headers={"X-User-ID": user_id},
            json={"job_id": SAMPLE_JOB.id, "resume": SAMPLE_RESUME.model_dump(mode="json")},
        )
        assert r.status_code == 200

    # 11th request triggers 429
    r_exceeded = client.post(
        "/api/resume/tailor",
        headers={"X-User-ID": user_id},
        json={"job_id": SAMPLE_JOB.id, "resume": SAMPLE_RESUME.model_dump(mode="json")},
    )
    assert r_exceeded.status_code == 429


def test_tailor_resume_service_mocked_llm(monkeypatch):
    """When LLM is available and returns valid structured output, tailor_resume uses it."""
    mock_llm_output = LLMTailoredResume(
        headline="Target Python Backend Engineer",
        summary="Focused software developer specialized in Python and FastAPI backend development.",
        skills_must_have=["Python", "FastAPI", "PostgreSQL"],
        skills_nice_to_have=[],
        skills_other=["React", "Git"],
        experience=[
            LLMTailoredExperience(
                title="Software Engineering Intern",
                company="Tech Corp India",
                duration="3 months",
                bullets=[
                    "Engineered robust REST APIs with FastAPI.",
                    "Reduced query latency by 25% across services.",
                ],
            )
        ],
        projects=[
            LLMTailoredProject(
                name="E-commerce Backend",
                description="Microservice architecture",
                highlights=["FastAPI and PostgreSQL integration."],
            )
        ],
        change_log=[
            LLMChangeEntry(
                section="headline", what="Aligned to Python role", why="Matches Swiggy job title"
            )
        ],
        ats_keywords_matched=["Python", "FastAPI", "PostgreSQL"],
        gaps_not_added=["Docker", "AWS", "Kubernetes"],
    )

    from app.services.tailoring import service as tail_service

    monkeypatch.setattr(tail_service, "complete_json", lambda *args, **kwargs: mock_llm_output)

    result = tailor_resume(SAMPLE_RESUME, SAMPLE_JOB)
    assert result.headline == "Target Python Backend Engineer"
    assert "FastAPI" in result.skills_grouped["Target Role Requirements"]
    assert result.ats_score_after >= result.ats_score_before
    assert len(result.change_log) == 1
    assert result.gaps_not_added == ["Docker", "AWS", "Kubernetes"]
