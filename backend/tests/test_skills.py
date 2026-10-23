"""Tests for skills service: gap analysis, prep plan, resources, and LLM fallback."""

from app.core.llm import LLMUnavailable
from app.schemas import Job, MissingSkill, ParsedResume, PrepPlanRequest, SkillGap
from app.services.skills import service as skills_service
from app.services.skills.resources import get_resources_for_skill, get_resources_for_skills


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

    assert missing_by_name["Python"].priority == "high"
    assert "Python" in missing_by_name["Python"].why
    assert "title" in missing_by_name["Python"].why

    assert missing_by_name["Communication"].priority == "low"
    assert "Communication" in missing_by_name["Communication"].why


def test_analyze_gap_full_match_and_zero_match():
    job = _sample_job(skills=["Python", "SQL"])

    full_resume = ParsedResume(skills=["Python", "SQL"])
    full_gap = skills_service.analyze_gap(full_resume, job)
    assert full_gap.coverage_pct == 100.0
    assert full_gap.missing == []

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


def test_curated_resources_lookup():
    # Known skill with URL
    py_res = get_resources_for_skill("Python")
    assert any("python.org" in (r.url or "") for r in py_res)

    # Synonym lookup
    js_res = get_resources_for_skill("JS")
    assert any("mozilla.org" in (r.url or "") for r in js_res)

    # Unknown skill has url=None
    unknown_res = get_resources_for_skill("RareCustomSkillXYZ")
    assert len(unknown_res) == 1
    assert unknown_res[0].url is None
    assert "RareCustomSkillXYZ" in unknown_res[0].title

    # Multi-skill deduplication
    multi = get_resources_for_skills(["JavaScript", "JS"])
    assert len(multi) == len(get_resources_for_skill("JavaScript"))


def test_build_plan_honours_weeks_and_hours():
    gap = SkillGap(
        job_id="job-1",
        job_title="Full Stack Developer",
        coverage_pct=50.0,
        matched=["JavaScript"],
        missing=[
            MissingSkill(skill="Node.js", priority="high", why="Core backend"),
            MissingSkill(skill="Docker", priority="medium", why="Containerization"),
        ],
    )
    req = PrepPlanRequest(gap=gap, weeks=3, hours_per_week=12)
    plan = skills_service.build_plan(req)

    assert plan.total_weeks == 3
    assert len(plan.weeks) == 3
    assert plan.weeks[0].week == 1
    # Week 1 should focus on high-priority Node.js
    assert "Node.js" in plan.weeks[0].focus
    # Resources must come from curated map and have verified URL
    assert any("nodejs.org" in (r.url or "") for r in plan.weeks[0].resources)
    # Tasks honor ~12 hours allocation
    assert any("~" in task and "h" in task for task in plan.weeks[0].tasks)


def test_build_plan_with_mocked_llm(monkeypatch):
    calls: list[tuple] = []

    def mock_complete_json(prompt, system=None):
        calls.append((prompt, system))
        return {"tasks": ["Read official guides", "Build an express server"]}

    monkeypatch.setattr(skills_service, "complete_json", mock_complete_json)

    gap = SkillGap(
        job_id="job-2",
        job_title="Backend Engineer",
        coverage_pct=0.0,
        matched=[],
        missing=[MissingSkill(skill="FastAPI", priority="high", why="Main framework")],
    )
    req = PrepPlanRequest(gap=gap, weeks=2, hours_per_week=10)
    plan = skills_service.build_plan(req)

    assert len(calls) == 2
    assert plan.weeks[0].tasks == ["Read official guides", "Build an express server"]
    # Curated resource still attached and never invented by LLM
    assert any("fastapi.tiangolo.com" in (r.url or "") for r in plan.weeks[0].resources)
