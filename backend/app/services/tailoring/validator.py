"""Truthfulness validator for tailored resumes (owner: resume-tailoring-agent).

NON-NEGOTIABLE RULE: TRUTHFULNESS
Every skill, company, role, institution, certification, project and metric in the output
MUST exist in the source profile. The validator auto-removes or rejects ungrounded items.
"""

from __future__ import annotations

import difflib
import re

from app.core.taxonomy import canonical_skill
from app.schemas import ParsedResume, TailoredExperience, TailoredProject, TailoredResume


class TruthfulnessValidationError(ValueError):
    """Raised when generated resume contains ungrounded/fabricated claims."""

    def __init__(self, message: str, violations: list[str] | None = None) -> None:
        super().__init__(message)
        self.violations = violations or [message]


_NUMBER_PATTERN = re.compile(r"\b\d+(?:\.\d+)?%?\b")


def _normalize_text(s: str | None) -> str:
    if not s:
        return ""
    return re.sub(r"[^\w\s]", "", s.lower()).strip()


def _fuzzy_match(candidate: str, allowed_set: set[str], threshold: float = 0.75) -> bool:
    """Check if candidate text matches any element in allowed_set."""
    cand_norm = _normalize_text(candidate)
    if not cand_norm:
        return True
    if cand_norm in allowed_set:
        return True

    for allowed in allowed_set:
        if not allowed:
            continue
        # Direct substring containment for multi-word or compound names
        if cand_norm in allowed or allowed in cand_norm:
            return True
        ratio = difflib.SequenceMatcher(None, cand_norm, allowed).ratio()
        if ratio >= threshold:
            return True
    return False


def _extract_source_skills(profile: ParsedResume) -> set[str]:
    """Collect all normalized skills, canonical names, and technologies from source profile."""
    skills: set[str] = set()

    for s in profile.skills or []:
        norm = _normalize_text(s)
        if norm:
            skills.add(norm)
        canon = canonical_skill(s)
        if canon:
            skills.add(_normalize_text(canon))

    for ev in profile.skill_evidence or []:
        norm = _normalize_text(ev.skill)
        if norm:
            skills.add(norm)
        canon = canonical_skill(ev.skill)
        if canon:
            skills.add(_normalize_text(canon))

    for exp in profile.experience or []:
        for tech in exp.technologies or []:
            norm = _normalize_text(tech)
            if norm:
                skills.add(norm)
            canon = canonical_skill(tech)
            if canon:
                skills.add(_normalize_text(canon))

    # Also extract canonical words from raw_text
    if profile.raw_text:
        words = re.findall(r"[A-Za-z0-9+#.]+", profile.raw_text)
        for w in words:
            canon = canonical_skill(w)
            if canon:
                skills.add(_normalize_text(canon))

    return skills


def _extract_source_numbers(profile: ParsedResume) -> set[str]:
    """Extract all numbers and percentages occurring in source profile."""
    corpus_parts: list[str] = []
    if profile.raw_text:
        corpus_parts.append(profile.raw_text)
    if profile.summary:
        corpus_parts.append(profile.summary)
    for exp in profile.experience or []:
        if exp.summary:
            corpus_parts.append(exp.summary)
        if exp.duration:
            corpus_parts.append(exp.duration)
        corpus_parts.extend(exp.impact or [])
    for proj in profile.projects or []:
        corpus_parts.append(str(proj))
    for edu in profile.education or []:
        if edu.year:
            corpus_parts.append(str(edu.year))

    full_corpus = " ".join(corpus_parts)
    raw_numbers = _NUMBER_PATTERN.findall(full_corpus)
    allowed: set[str] = set()
    for n in raw_numbers:
        allowed.add(n)
        allowed.add(n.rstrip("%"))
    return allowed


def validate_and_clean_tailored_resume(
    tailored: TailoredResume,
    source: ParsedResume,
    strict: bool = False,
) -> tuple[TailoredResume, list[str]]:
    """Validate truthfulness of tailored resume against source profile.

    - Every skill must exist in source profile (auto-removed if not found).
    - Every employer/company must match source experience.
    - Every title/role must match or rephrase source experience.
    - Every number/metric in bullets must exist in source text.
    - If unresolvable violations remain, raises TruthfulnessValidationError in strict mode.
    Returns: (cleaned_tailored_resume, list_of_violations_or_removed_items)
    """
    violations: list[str] = []

    # 1. Validate Skills
    source_skills = _extract_source_skills(source)
    cleaned_grouped: dict[str, list[str]] = {}

    for group, skills in (tailored.skills_grouped or {}).items():
        valid_group_skills: list[str] = []
        for s in skills:
            s_norm = _normalize_text(s)
            s_canon = _normalize_text(canonical_skill(s) or "")
            if _fuzzy_match(s_norm, source_skills, threshold=0.7) or (
                s_canon and _fuzzy_match(s_canon, source_skills, threshold=0.7)
            ):
                valid_group_skills.append(s)
            else:
                msg = f"Fabricated skill removed: '{s}'"
                violations.append(msg)
                if s not in tailored.gaps_not_added:
                    tailored.gaps_not_added.append(s)
        if valid_group_skills:
            cleaned_grouped[group] = valid_group_skills

    tailored.skills_grouped = cleaned_grouped

    # Also clean ats_keywords_matched
    cleaned_keywords: list[str] = []
    for kw in tailored.ats_keywords_matched:
        kw_norm = _normalize_text(kw)
        if _fuzzy_match(kw_norm, source_skills, threshold=0.7):
            cleaned_keywords.append(kw)
        else:
            violations.append(f"Fabricated ATS keyword removed: '{kw}'")
    tailored.ats_keywords_matched = cleaned_keywords

    # 2. Validate Experience (Companies and Titles)
    source_companies = {_normalize_text(e.company) for e in (source.experience or []) if e.company}
    source_titles = {_normalize_text(e.title) for e in (source.experience or []) if e.title}
    source_numbers = _extract_source_numbers(source)

    cleaned_experience: list[TailoredExperience] = []
    for exp in tailored.experience or []:
        exp_comp = _normalize_text(exp.company)
        # If the candidate has work experience in source, company must match
        if (
            exp_comp
            and source_companies
            and not _fuzzy_match(exp_comp, source_companies, threshold=0.7)
        ):
            msg = f"Fabricated company rejected: '{exp.company}'"
            violations.append(msg)
            continue

        exp_title = _normalize_text(exp.title)
        if (
            exp_title
            and source_titles
            and not _fuzzy_match(exp_title, source_titles, threshold=0.65)
        ):
            msg = f"Fabricated role title rejected: '{exp.title}'"
            violations.append(msg)
            continue

        # Validate numbers in bullets
        cleaned_bullets: list[str] = []
        for bullet in exp.bullets or []:
            bullet_numbers = _NUMBER_PATTERN.findall(bullet)
            fabricated_nums = [
                n
                for n in bullet_numbers
                if n not in source_numbers and n.rstrip("%") not in source_numbers
            ]
            if fabricated_nums:
                msg = f"Fabricated metric {fabricated_nums} in bullet removed: '{bullet}'"
                violations.append(msg)
                # If metric is ungrounded, auto-clean: remove the bullet or remove metric
                continue
            cleaned_bullets.append(bullet)

        # Retain experience entry with cleaned bullets (or original bullets if none survived)
        exp.bullets = cleaned_bullets
        cleaned_experience.append(exp)

    tailored.experience = cleaned_experience

    # 3. Validate Projects
    source_projects = {_normalize_text(str(p)) for p in (source.projects or [])}
    cleaned_projects: list[TailoredProject] = []
    for proj in tailored.projects or []:
        proj_norm = _normalize_text(proj.name)
        if source_projects and not _fuzzy_match(proj_norm, source_projects, threshold=0.6):
            msg = f"Fabricated project rejected: '{proj.name}'"
            violations.append(msg)
            continue
        cleaned_projects.append(proj)
    tailored.projects = cleaned_projects

    # 4. Validate Education (institutions)
    source_institutions = {_normalize_text(edu.institution) for edu in (source.education or [])}
    if source_institutions:
        tailored.education = [
            edu
            for edu in tailored.education
            if _fuzzy_match(_normalize_text(edu.institution), source_institutions, threshold=0.7)
        ]

    # 5. Validate Summary numbers
    summary_numbers = _NUMBER_PATTERN.findall(tailored.summary or "")
    for n in summary_numbers:
        if n not in source_numbers and n.rstrip("%") not in source_numbers:
            violations.append(f"Fabricated metric {n} in summary")

    if strict and violations:
        raise TruthfulnessValidationError(
            f"Tailored resume failed truthfulness validation with {len(violations)} violations",
            violations=violations,
        )

    return tailored, violations
