"""Core tailoring agent service (owner: resume-tailoring-agent).

Applies Groq strict JSON schema with Pydantic validation, checks truthfulness against
the source profile, retries once on validation error, and falls back to deterministic
relevance sorting when the LLM is unavailable or ungrounded claims persist.
"""

from __future__ import annotations

import logging

from app.core.llm import LLMUnavailable, complete_json
from app.schemas import (
    ChangeEntry,
    Experience,
    Job,
    ParsedResume,
    PersonaInput,
    PersonaProfileResult,
    TailoredExperience,
    TailoredProject,
    TailoredResume,
)
from app.services.matching.service import score_job
from app.services.tailoring import prompts
from app.services.tailoring.fallback import build_fallback_tailored_resume
from app.services.tailoring.models import LLMTailoredResume
from app.services.tailoring.validator import validate_and_clean_tailored_resume

logger = logging.getLogger(__name__)


def _format_persona_strengths(persona: PersonaInput | PersonaProfileResult | None) -> str:
    if not persona:
        return "(no persona interview conducted yet)"
    parts: list[str] = []
    if isinstance(persona, PersonaProfileResult):
        for s in persona.strengths:
            parts.append(f'- {s.topic.capitalize()}: {s.strength} (Quote: "{s.quote}")')
        if persona.summary:
            parts.append(f"Summary: {persona.summary}")
    elif isinstance(persona, PersonaInput):
        for s in persona.strengths:
            parts.append(f"- {s}")
        if persona.summary:
            parts.append(f"Summary: {persona.summary}")
    return "\n".join(parts) if parts else "(no persona interview conducted yet)"


def _format_experience(profile: ParsedResume) -> str:
    lines: list[str] = []
    for exp in profile.experience:
        header = f"- {exp.title}"
        if exp.company:
            header += f" at {exp.company}"
        if exp.duration:
            header += f" ({exp.duration})"
        lines.append(header)
        if exp.summary:
            lines.append(f"  Summary: {exp.summary}")
        if exp.impact:
            for imp in exp.impact:
                lines.append(f"  Impact: {imp}")
        if exp.technologies:
            lines.append(f"  Tech: {', '.join(exp.technologies)}")
    return "\n".join(lines) if lines else "(none listed)"


def _format_education(profile: ParsedResume) -> str:
    lines: list[str] = []
    for edu in profile.education:
        item = f"- {edu.institution}"
        if edu.degree:
            item += f", {edu.degree}"
        if edu.year:
            item += f" ({edu.year})"
        lines.append(item)
    return "\n".join(lines) if lines else "(none listed)"


def _format_certifications(profile: ParsedResume) -> str:
    lines: list[str] = []
    for cert in profile.certifications:
        item = f"- {cert.name}"
        if cert.issuer:
            item += f" ({cert.issuer})"
        if cert.year:
            item += f" - {cert.year}"
        lines.append(item)
    return "\n".join(lines) if lines else "(none listed)"


def _llm_to_tailored(llm_out: LLMTailoredResume, profile: ParsedResume) -> TailoredResume:
    skills_grouped: dict[str, list[str]] = {}
    if llm_out.skills_must_have:
        skills_grouped["Target Role Requirements"] = llm_out.skills_must_have
    if llm_out.skills_nice_to_have:
        skills_grouped["Recommended Skills"] = llm_out.skills_nice_to_have
    if llm_out.skills_other:
        skills_grouped["Additional Technical Skills"] = llm_out.skills_other

    experience: list[TailoredExperience] = [
        TailoredExperience(
            title=e.title,
            company=e.company,
            duration=e.duration,
            bullets=e.bullets,
        )
        for e in llm_out.experience
    ]

    projects: list[TailoredProject] = [
        TailoredProject(
            name=p.name,
            description=p.description,
            highlights=p.highlights,
        )
        for p in llm_out.projects
    ]

    change_log: list[ChangeEntry] = [
        ChangeEntry(section=c.section, what=c.what, why=c.why) for c in llm_out.change_log
    ]

    return TailoredResume(
        headline=llm_out.headline,
        summary=llm_out.summary,
        skills_grouped=skills_grouped,
        experience=experience,
        projects=projects,
        education=list(profile.education),
        certifications=list(profile.certifications),
        change_log=change_log,
        ats_keywords_matched=llm_out.ats_keywords_matched,
        gaps_not_added=llm_out.gaps_not_added,
        ats_score_before=0.0,
        ats_score_after=0.0,
    )


def _compute_tailored_ats_score(tailored: TailoredResume, job: Job) -> float:
    """Compute deterministic ATS skill score for the tailored output."""
    all_skills: list[str] = []
    for group in tailored.skills_grouped.values():
        all_skills.extend(group)

    as_parsed = ParsedResume(
        summary=tailored.summary,
        skills=all_skills,
        experience=[
            Experience(
                title=e.title,
                company=e.company,
                duration=e.duration,
                summary=" ".join(e.bullets),
                impact=e.bullets,
                technologies=[],
            )
            for e in tailored.experience
        ],
        projects=[f"{p.name}: {' '.join(p.highlights)}" for p in tailored.projects],
        raw_text=f"{tailored.headline} {tailored.summary} {' '.join(all_skills)}",
    )
    match_result = score_job(as_parsed, job)
    return float(match_result.score)


def tailor_resume(
    profile: ParsedResume,
    job: Job,
    persona: PersonaInput | PersonaProfileResult | None = None,
) -> TailoredResume:
    """Tailor a candidate's resume for a specific job with strict truthfulness."""
    initial_match = score_job(profile, job)
    score_before = float(initial_match.score)

    prompt = prompts.TAILORING_PROMPT_TEMPLATE.format(
        job_title=job.title,
        job_company=job.company,
        experience_level=job.experience_level,
        must_skills=", ".join(job.skills_required) if job.skills_required else "(none specified)",
        nice_skills="(included in description)",
        job_description=job.description,
        candidate_name=profile.name or "Candidate",
        candidate_summary=profile.summary or "(none provided)",
        candidate_skills=", ".join(profile.skills) if profile.skills else "(none listed)",
        candidate_experience=_format_experience(profile),
        candidate_projects="\n".join(f"- {p}" for p in profile.projects)
        if profile.projects
        else "(none)",
        candidate_education=_format_education(profile),
        candidate_certifications=_format_certifications(profile),
        persona_strengths=_format_persona_strengths(persona),
    )

    tailored: TailoredResume | None = None

    for attempt in range(2):
        try:
            current_prompt = prompt
            if attempt == 1:
                current_prompt += (
                    "\n\nIMPORTANT CORRECTION: In previous attempt, ungrounded items were found. "
                    "Ensure EVERY single skill, role, company and metric exists in Source Profile."
                )

            llm_result = complete_json(
                current_prompt,
                prompts.TAILORING_SYSTEM,
                schema_model=LLMTailoredResume,
            )
            candidate_tailored = _llm_to_tailored(llm_result, profile)  # type: ignore[arg-type]

            cleaned, violations = validate_and_clean_tailored_resume(
                candidate_tailored, profile, strict=(attempt == 0)
            )
            tailored = cleaned
            break
        except (LLMUnavailable, Exception) as exc:
            logger.warning("Tailoring attempt %d failed (%s)", attempt + 1, exc)
            if attempt == 1 or isinstance(exc, LLMUnavailable):
                break

    if tailored is None:
        logger.info("Using non-AI deterministic relevance sorting fallback for job %s", job.id)
        tailored = build_fallback_tailored_resume(profile, job)

    score_after = _compute_tailored_ats_score(tailored, job)
    tailored.ats_score_before = score_before
    tailored.ats_score_after = max(score_before, score_after)

    return tailored
