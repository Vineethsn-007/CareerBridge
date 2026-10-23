"""Skill-gap analysis + preparation plan (owner: Teammate C).

Baseline: set difference + templated weekly plan.
TODO: skill synonyms, priority from job text, curated free resources per skill
(prefer a hand-made map over LLM-invented URLs), LLM-written tasks via app.core.llm.
"""

from app.schemas import (
    Job,
    MissingSkill,
    ParsedResume,
    PlanWeek,
    PrepPlan,
    PrepPlanRequest,
    Resource,
    SkillGap,
)


def analyze_gap(resume: ParsedResume, job: Job) -> SkillGap:
    have = {s.lower() for s in resume.skills}
    matched = [s for s in job.skills_required if s.lower() in have]
    missing_names = [s for s in job.skills_required if s.lower() not in have]
    half = (len(missing_names) + 1) // 2
    missing = [
        MissingSkill(
            skill=skill,
            priority="high" if i < half else "medium",
            why=f"{skill} is listed as a requirement for {job.title}.",
        )
        for i, skill in enumerate(missing_names)
    ]
    total = len(job.skills_required) or 1
    return SkillGap(
        job_id=job.id,
        job_title=job.title,
        coverage_pct=round(100 * len(matched) / total, 1),
        matched=matched,
        missing=missing,
    )


def build_plan(req: PrepPlanRequest) -> PrepPlan:
    skills = [m.skill for m in req.gap.missing]
    weeks: list[PlanWeek] = []
    for week in range(1, req.weeks + 1):
        # Spread missing skills across weeks round-robin.
        focus_skills = skills[week - 1 :: req.weeks]
        focus = ", ".join(focus_skills) if focus_skills else "Revision and mock interviews"
        tasks = [
            f"Learn the fundamentals of {s} and build one small exercise." for s in focus_skills
        ]
        tasks = tasks or ["Revise weak topics and do a full mock interview."]
        resources = [
            Resource(title=f"Official {s} documentation", kind="docs") for s in focus_skills
        ]
        weeks.append(PlanWeek(week=week, focus=focus, tasks=tasks, resources=resources))
    return PrepPlan(job_id=req.gap.job_id, total_weeks=req.weeks, weeks=weeks)
