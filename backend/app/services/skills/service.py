"""Skill-gap analysis + preparation plan (owner: Teammate C).

Matches skills using the canonical taxonomy and synonyms, prioritizes missing skills
via LLM with a heuristic fallback, and generates weekly prep plans.
"""

from typing import Literal

from app.core.llm import complete_json
from app.core.taxonomy import canonical_skill
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
from app.services.skills.prompts import SKILL_GAP_PROMPT, SKILL_GAP_SYSTEM

_SOFT_SKILLS: frozenset[str] = frozenset(
    {"communication", "teamwork", "leadership", "problem solving", "time management"}
)


def _build_resume_skill_set(skills: list[str]) -> set[str]:
    skill_set: set[str] = set()
    for s in skills:
        s_clean = s.strip().lower()
        if not s_clean:
            continue
        skill_set.add(s_clean)
        canon = canonical_skill(s)
        if canon:
            skill_set.add(canon.lower())
    return skill_set


def _is_skill_present(skill: str, resume_skill_set: set[str]) -> bool:
    s_clean = skill.strip().lower()
    if s_clean in resume_skill_set:
        return True
    canon = canonical_skill(skill)
    if canon and canon.lower() in resume_skill_set:
        return True
    return False


def _heuristic_priority_and_why(
    skill: str, job: Job, index: int, total_missing: int
) -> tuple[Literal["high", "medium", "low"], str]:
    skill_clean = skill.strip()
    skill_lower = skill_clean.lower()
    canon = canonical_skill(skill)
    canon_lower = canon.lower() if canon else skill_lower

    title_lower = job.title.lower()
    desc_lower = job.description.lower()

    if skill_lower in title_lower or canon_lower in title_lower:
        return (
            "high",
            f"{skill_clean} is a core requirement explicitly featured in the {job.title} title.",
        )

    if skill_lower in _SOFT_SKILLS or canon_lower in _SOFT_SKILLS:
        return (
            "low",
            f"{skill_clean} is an interpersonal skill supporting day-to-day work as {job.title}.",
        )

    if (skill_lower in desc_lower or canon_lower in desc_lower) and index <= 2:
        return (
            "high",
            f"{skill_clean} is emphasized in key requirements for {job.title}.",
        )

    if index < max(1, (total_missing + 1) // 2):
        return (
            "high",
            f"{skill_clean} is a primary technical competency expected for this {job.title} role.",
        )

    return (
        "medium",
        f"{skill_clean} is an essential tool in the day-to-day workflow for a {job.title}.",
    )


def _llm_analyze_missing(job: Job, missing_names: list[str]) -> list[MissingSkill]:
    prompt = SKILL_GAP_PROMPT.format(
        job_title=job.title,
        job_description=job.description,
        skills_required=", ".join(job.skills_required),
        missing_skills=", ".join(missing_names),
    )
    payload = complete_json(prompt, system=SKILL_GAP_SYSTEM)
    items = payload.get("missing", [])
    if not isinstance(items, list):
        raise ValueError("Payload 'missing' field must be a list.")

    evaluated: dict[str, MissingSkill] = {}
    for item in items:
        try:
            m = MissingSkill.model_validate(item)
            evaluated[m.skill.strip().lower()] = m
        except Exception:
            continue

    results: list[MissingSkill] = []
    for i, name in enumerate(missing_names):
        name_clean = name.strip().lower()
        canon = canonical_skill(name)
        canon_clean = canon.lower() if canon else name_clean
        if name_clean in evaluated:
            results.append(evaluated[name_clean])
        elif canon_clean in evaluated:
            llm_m = evaluated[canon_clean]
            results.append(MissingSkill(skill=name, priority=llm_m.priority, why=llm_m.why))
        else:
            priority, why = _heuristic_priority_and_why(name, job, i, len(missing_names))
            results.append(MissingSkill(skill=name, priority=priority, why=why))
    return results


def analyze_gap(resume: ParsedResume, job: Job) -> SkillGap:
    have = _build_resume_skill_set(resume.skills)
    matched = [s for s in job.skills_required if _is_skill_present(s, have)]
    missing_names = [s for s in job.skills_required if not _is_skill_present(s, have)]

    if missing_names:
        try:
            missing = _llm_analyze_missing(job, missing_names)
        except Exception:
            missing = [
                MissingSkill(
                    skill=skill,
                    priority=priority,
                    why=why,
                )
                for i, skill in enumerate(missing_names)
                for priority, why in [
                    _heuristic_priority_and_why(skill, job, i, len(missing_names))
                ]
            ]
    else:
        missing = []

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
