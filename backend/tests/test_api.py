"""Contract tests: every endpoint answers and the full user journey works end to end.

When you change a service, keep these green. Add your own tests next to them.
"""

import datetime as dt

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.db import Company, get_session, init_db
from app.core.db import Job as JobRow
from app.main import app

client = TestClient(app)

RESUME_TEXT = b"""Asha Rao
asha@example.com  9876543210
Skills: Python, SQL, Git, React, Machine Learning
"""


def _parse_resume() -> dict:
    res = client.post(
        "/api/resume/parse", files={"file": ("resume.txt", RESUME_TEXT, "text/plain")}
    )
    assert res.status_code == 200
    return res.json()


def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


def test_parse_resume_extracts_contact_and_skills():
    resume = _parse_resume()
    assert resume["email"] == "asha@example.com"
    assert resume["phone"] == "9876543210"
    assert {"Python", "SQL", "Git", "React"} <= set(resume["skills"])


def test_jobs_list_and_detail():
    jobs = client.get("/api/jobs").json()
    assert jobs
    detail = client.get(f"/api/jobs/{jobs[0]['id']}")
    assert detail.status_code == 200
    assert client.get("/api/jobs/does-not-exist").status_code == 404


def test_full_journey_match_gap_plan_interview():
    resume = _parse_resume()

    matches = client.post(
        "/api/match", json={"resume": resume, "top_k": 3, "verified_only": False}
    ).json()
    assert matches
    assert matches == sorted(matches, key=lambda m: m["score"], reverse=True)
    job_id = matches[0]["job"]["id"]

    gap = client.post("/api/skills/gap", json={"resume": resume, "job_id": job_id}).json()
    assert 0 <= gap["coverage_pct"] <= 100

    plan = client.post("/api/skills/plan", json={"gap": gap, "weeks": 3}).json()
    assert len(plan["weeks"]) == 3

    questions = client.post(
        "/api/interview/questions", json={"resume": resume, "job_id": job_id, "num_questions": 3}
    ).json()
    assert len(questions) == 3

    feedback = client.post(
        "/api/interview/evaluate",
        json={"job_id": job_id, "question": questions[0], "answer": "I built a project with it."},
    ).json()
    assert 0 <= feedback["score"] <= 10


def test_unknown_job_returns_404_for_gap():
    resume = _parse_resume()
    res = client.post("/api/skills/gap", json={"resume": resume, "job_id": "nope"})
    assert res.status_code == 404


def test_scraped_db_job_flows_through_jobs_match_gap_and_interview():
    """A scraper-produced DB row serves /jobs, /match, /skills/gap and /interview/questions."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        future=True,
    )
    init_db(engine)
    db = sessionmaker(bind=engine, expire_on_commit=False, future=True)()
    try:
        company = Company(name="Verified Corp")
        db.add(company)
        db.flush()
        db.add(
            JobRow(
                id="verified-db-job-1",
                company_id=company.id,
                title="Python Backend Engineer",
                location="Bengaluru",
                job_type="internship",
                experience_level="fresher",
                source_url="https://boards.example/verified-db-job-1",
                description="Build Python services and APIs.",
                must_skills=["Python"],
                nice_skills=[],
                skills_required=["Python", "SQL", "Git"],
                verified=True,
                last_verified=dt.date.today(),
                apply_url="https://boards.example/verified-db-job-1/apply",
                is_active=True,
            )
        )
        db.commit()

        def override_get_session():
            yield db

        app.dependency_overrides[get_session] = override_get_session
        try:
            jobs = client.get("/api/jobs?verified_only=true").json()
            assert any(j["id"] == "verified-db-job-1" for j in jobs)
            assert all(j["verified"] for j in jobs)

            resume = _parse_resume()

            matches = client.post("/api/match", json={"resume": resume, "top_k": 5}).json()
            assert any(m["job"]["id"] == "verified-db-job-1" for m in matches)
            assert all(m["job"]["verified"] for m in matches)

            gap = client.post(
                "/api/skills/gap",
                json={"resume": resume, "job_id": "verified-db-job-1"},
            )
            assert gap.status_code == 200
            assert gap.json()["job_id"] == "verified-db-job-1"

            questions = client.post(
                "/api/interview/questions",
                json={
                    "resume": resume,
                    "job_id": "verified-db-job-1",
                    "num_questions": 3,
                },
            )
            assert questions.status_code == 200
            assert len(questions.json()) == 3
        finally:
            app.dependency_overrides.pop(get_session, None)
    finally:
        db.close()
