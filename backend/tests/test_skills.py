"""Tests for skills service: gap analysis, synonyms, priority, and LLM fallback."""

from app.core.llm import LLMUnavailable
from app.schemas import Job, ParsedResume
from app.services.skills import service as skills_service


def _sample_job(
    title: str = "Junior Python Developer",
    skills: list[str] | None = None,
    description: str = "Develop and maintain backend services in Python.",
) -> Job:
    return Job(
        id="job-101",
        title=title,
        company="Tech Corp",
        location="Bengaluru",
        skills_required=skills if skills is not None else ["Python", "SQL", "Git", "REST API"],
        description=description,
        source_url="https://example.com/job-101",
    )


def test_analyze_gap_synonym_matching():
    # Candidate lists synonyms: JS for JavaScript, Node for Node.js, ML for Machine Learning
    resume = ParsedResume(skills=["JS", "Node", "ML", "Git"])
    job = Job(
        id="job-web",
        title="Full Stack Developer",
        company="Web Corp",
        location="Remote",
        skills_required=["JavaScript", "Node.js", "Machine Learning", "Docker"],
        description="Build full stack features.",
        source_url="https://example.com/job-web",
    )
    gap = skills_service.analyze_gap(resume, job)

    assert "JavaScript" in gap.matched
    assert "Node.js" in gap.matched
    assert "Machine Learning" in gap.matched
    assert gap.coverage_pct == 75.0
    assert len(gap.missing) == 1
    assert gap.missing[0].skill == "Docker"


def test_analyze_gap_bidirectional_synonym_matching():
    # Job requires synonym alias, resume lists canonical
    resume = ParsedResume(skills=["PostgreSQL", "Kubernetes"])
    job = Job(
        id="job-devops",
        title="DevOps Engineer",
        company="Cloud Corp",
        location="Pune",
        skills_required=["Postgres", "K8s"],
        description="Maintain infrastructure.",
        source_url="https://example.com/job-devops",
    )
    gap = skills_service.analyze_gap(resume, job)
    assert set(gap.matched) == {"Postgres", "K8s"}
    assert gap.coverage_pct == 100.0
    assert gap.missing == []


def test_analyze_gap_heuristic_priority_title_and_soft_skills():
    resume = ParsedResume(skills=["SQL"])
    job = _sample_job(
        title="Junior Python Developer",
        skills=["Python", "SQL", "Communication"],
        description="Develop backend APIs.",
    )
    gap = skills_service.analyze_gap(resume, job)

    assert gap.matched == ["SQL"]
    missing_by_name = {m.skill: m for m in gap.missing}

    # Python is in title -> high priority
    assert missing_by_name["Python"].priority == "high"
    assert "Python" in missing_by_name["Python"].why
    assert "title" in missing_by_name["Python"].why

    # Communication is soft skill -> low priority
    assert missing_by_name["Communication"].priority == "low"
    assert "Communication" in missing_by_name["Communication"].why


def test_analyze_gap_full_match_and_zero_match():
    job = _sample_job(skills=["Python", "SQL"])

    # Full match
    full_resume = ParsedResume(skills=["Python", "SQL"])
    full_gap = skills_service.analyze_gap(full_resume, job)
    assert full_gap.coverage_pct == 100.0
    assert full_gap.missing == []

    # Zero match
    empty_resume = ParsedResume(skills=["Ruby", "Rust"])
    zero_gap = skills_service.analyze_gap(empty_resume, job)
    assert zero_gap.coverage_pct == 0.0
    assert len(zero_gap.missing) == 2


def test_analyze_gap_with_mocked_llm(monkeypatch):
    calls: list[tuple] = []

    def mock_complete_json(prompt, system=None):
        calls.append((prompt, system))
        return {
            "missing": [
                {
                    "skill": "Docker",
                    "priority": "high",
                    "why": "Docker is essential for running our microservices locally.",
                }
            ]
        }

    monkeypatch.setattr(skills_service, "complete_json", mock_complete_json)

    resume = ParsedResume(skills=["Python"])
    job = _sample_job(skills=["Python", "Docker"])
    gap = skills_service.analyze_gap(resume, job)

    assert len(calls) == 1
    assert len(gap.missing) == 1
    assert gap.missing[0].skill == "Docker"
    assert gap.missing[0].priority == "high"
    assert "microservices" in gap.missing[0].why


def test_analyze_gap_llm_fallback_on_unavailable(monkeypatch):
    def mock_fail(prompt, system=None):
        raise LLMUnavailable("Provider not configured.")

    monkeypatch.setattr(skills_service, "complete_json", mock_fail)

    resume = ParsedResume(skills=["Git"])
    job = _sample_job(skills=["Python", "Git"])
    gap = skills_service.analyze_gap(resume, job)

    assert gap.matched == ["Git"]
    assert len(gap.missing) == 1
    assert gap.missing[0].skill == "Python"
    assert gap.missing[0].priority == "high"
