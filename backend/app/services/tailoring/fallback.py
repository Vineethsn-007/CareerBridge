"""Deterministic, non-AI fallback for resume tailoring (owner: resume-tailoring-agent).

Used when the LLM is unavailable or when generation fails truthfulness validation twice.
Sorts skills, experience, and projects by relevance to the target job without fabricating
any new skills, roles, metrics, or credentials.
"""

from __future__ import annotations

import re

from app.core.taxonomy import canonical_skill, normalize_skill
from app.schemas import (
    ChangeEntry,
    Job,
    ParsedResume,
    TailoredExperience,
    TailoredProject,
    TailoredResume,
)
from app.services.matching.service import compute_skill_overlap


def build_fallback_tailored_resume(profile: ParsedResume, job: Job) -> TailoredResume:
    """Produce a deterministic, relevance-sorted version of the source profile."""
    # 1. Determine skill overlap
    _, matched_skills, missing_skills = compute_skill_overlap(
        profile.skills, job.skills_required, skill_evidence=profile.skill_evidence
    )

    matched_set = {canonical_skill(s) or normalize_skill(s).lower() for s in matched_skills}

    # Partition candidate skills
    relevant_candidate_skills: list[str] = []
    other_candidate_skills: list[str] = []

    for s in profile.skills:
        key = canonical_skill(s) or normalize_skill(s).lower()
        if key in matched_set:
            relevant_candidate_skills.append(s)
        else:
            other_candidate_skills.append(s)

    skills_grouped: dict[str, list[str]] = {}
    if relevant_candidate_skills:
        skills_grouped["Relevant Skills"] = relevant_candidate_skills
    if other_candidate_skills:
        skills_grouped["Additional Technical Skills"] = other_candidate_skills

    # 2. Headline & Summary
    headline = f"{job.title} | {profile.name or 'Candidate Profile'}"
    base_summary = profile.summary.strip() if profile.summary else ""
    if base_summary:
        summary = f"Targeting {job.title} at {job.company}. {base_summary}"
    else:
        matched_str = (
            ", ".join(relevant_candidate_skills[:4])
            if relevant_candidate_skills
            else "software engineering"
        )
        summary = (
            f"Dedicated {job.experience_level.capitalize()} candidate targeting {job.title} "
            f"at {job.company}, offering practical background in {matched_str}."
        )

    # 3. Experience entries
    tailored_experience: list[TailoredExperience] = []
    for exp in profile.experience:
        bullets: list[str] = []
        if exp.impact:
            bullets.extend(exp.impact)
        elif exp.summary:
            sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", exp.summary) if s.strip()]
            bullets.extend(sentences)
        else:
            bullets.append(
                f"Served as {exp.title}" + (f" at {exp.company}" if exp.company else ".")
            )

        tailored_experience.append(
            TailoredExperience(
                title=exp.title,
                company=exp.company,
                duration=exp.duration,
                bullets=bullets,
            )
        )

    # Sort experience by number of relevant technologies mentioned
    def exp_relevance(e: TailoredExperience) -> int:
        count = 0
        text = f"{e.title} {e.company or ''} {' '.join(e.bullets)}".lower()
        for s in matched_skills:
            if s.lower() in text:
                count += 1
        return count

    tailored_experience.sort(key=exp_relevance, reverse=True)

    # 4. Projects entries
    tailored_projects: list[TailoredProject] = []
    for proj in profile.projects:
        proj_str = str(proj)
        highlights: list[str] = []
        if ":" in proj_str:
            name, desc = proj_str.split(":", 1)
            name = name.strip()
            highlights.append(desc.strip())
        else:
            name = proj_str.strip()

        tailored_projects.append(
            TailoredProject(
                name=name,
                description=None,
                highlights=highlights,
            )
        )

    # Sort projects by relevance to job skills
    def proj_relevance(p: TailoredProject) -> int:
        count = 0
        text = f"{p.name} {' '.join(p.highlights)}".lower()
        for s in matched_skills:
            if s.lower() in text:
                count += 1
        return count

    tailored_projects.sort(key=proj_relevance, reverse=True)

    # 5. Change log
    change_log = [
        ChangeEntry(
            section="skills",
            what=f"Reordered skills to emphasize {len(relevant_candidate_skills)} matches",
            why="Algorithmic ATS relevance alignment",
        ),
        ChangeEntry(
            section="headline",
            what=f"Aligned headline to target role: {job.title}",
            why="Instant recruiter role recognition",
        ),
    ]
    if missing_skills:
        change_log.append(
            ChangeEntry(
                section="gaps",
                what=f"Identified {len(missing_skills)} gap skill(s) for learning roadmap",
                why="Truthfulness guarantee: never fabricates unacquired skills",
            )
        )

    return TailoredResume(
        headline=headline,
        summary=summary,
        skills_grouped=skills_grouped,
        experience=tailored_experience,
        projects=tailored_projects,
        education=list(profile.education),
        certifications=list(profile.certifications),
        change_log=change_log,
        ats_keywords_matched=matched_skills,
        gaps_not_added=missing_skills,
        ats_score_before=0.0,
        ats_score_after=0.0,
    )
