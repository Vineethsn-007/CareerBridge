"""Contract tests: every endpoint answers and the full user journey works end to end.

When you change a service, keep these green. Add your own tests next to them.
"""

from fastapi.testclient import TestClient

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
