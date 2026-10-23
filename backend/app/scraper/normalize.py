"""LLM-backed listing normalization with deterministic fallbacks.

The agent normalizes *only* content that exists in the fetched listing:
must-have/nice-to-have skills (canonical taxonomy names), experience level, job
type, and — only when literally stated — salary and deadline strings. It may
never invent a listing detail: salary/deadline text is accepted only if the
extracted string actually appears (case-insensitively) in the source text, and
unknown skill names are dropped rather than guessed.

When the LLM is unavailable or returns invalid output, a rules-based fallback
produces the same shape deterministically from the listing text (taxonomy
matches only).
"""

from __future__ import annotations

import logging
import re
from typing import Literal

from pydantic import BaseModel, Field

from app.core import llm
from app.core.config import settings
from app.core.strict_schema import UnsupportedSchemaError
from app.core.taxonomy import SKILLS, canonical_skill, normalize_skill
from app.scraper.sources import RawListing

logger = logging.getLogger(__name__)


class NormalizedListing(BaseModel):
    """LLM normalization output. Optional fields may be null — never fabricated."""

    must_skills: list[str] = Field(default_factory=list)
    nice_skills: list[str] = Field(default_factory=list)
    experience_level: Literal["fresher", "junior", "mid", "senior"] = "fresher"
    job_type: Literal["full-time", "internship", "part-time", "contract"] = "full-time"
    salary: str | None = None
    deadline: str | None = None


_SYSTEM = (
    "You normalize job listings for a job-matching platform. Use ONLY information "
    "present in the listing text you are given. Never invent skills, salaries, "
    "deadlines, dates or URLs. If a detail is not stated, return null for it. "
    "Skills must be exact technology names found in the listing text."
)

_PROMPT_TEMPLATE = """Normalize this job listing.

Title: {title}
Location: {location}
Employment type: {job_type_raw}
Text:
{text}

Return JSON with:
- must_skills: technology skills that are clearly required (canonical names).
- nice_skills: optional/preferred technology skills.
- experience_level: one of "fresher", "junior", "mid", "senior" based on the years
  of experience requested (0 or unspecified -> fresher, 1-2 -> junior, 3-5 -> mid,
  6+ -> senior).
- job_type: one of "full-time", "internship", "part-time", "contract" (default
  full-time when only "permanent"/"full time" is stated).
- salary: the salary string ONLY if literally stated in the text, else null.
- deadline: application deadline ONLY if literally stated, else null.
"""


def _canonicalize(names: list[str]) -> list[str]:
    """Keep only taxonomy-known skills with canonical casing, preserving order."""
    seen: list[str] = []
    for name in names:
        canon = canonical_skill(name)
        if canon and canon not in seen:
            seen.append(canon)
    return seen


def _contains_text(needle: str | None, haystacks: list[str]) -> bool:
    if not needle:
        return False
    low = needle.lower()
    return any(low in h.lower() for h in haystacks if h)


_BOUNDARY_CHARS = "A-Za-z0-9+#"  # letters plus the skill-name glue chars +/#


def _skill_pattern(skill: str) -> re.Pattern[str]:
    """Whole-token match: 'C' must not match inside 'Account', 'C++' stays intact."""
    escaped = re.escape(skill)
    return re.compile(rf"(?<![{_BOUNDARY_CHARS}]){escaped}(?![{_BOUNDARY_CHARS}])", re.IGNORECASE)


def rules_normalize(listing: RawListing) -> NormalizedListing:
    """Deterministic fallback: taxonomy-token extraction from the listing text."""
    text = f"{listing.title} {listing.description}"
    patterns: dict[str, re.Pattern[str]] = {}
    for skill in SKILLS:
        patterns[skill] = _skill_pattern(skill)
        alias = normalize_skill(skill)
        if alias != skill:
            patterns[alias] = _skill_pattern(alias)
    found = [skill for skill, pattern in patterns.items() if pattern.search(text)]
    must: list[str] = []
    nice: list[str] = []
    split_at = max(1, int(len(text) * 0.35))
    for skill in found:
        first_at = text.lower().find(skill.lower())
        # Skills named early ( Requirements head) count as must-have; later mentions
        # count as nice-to-have. First mention wins, never double-counted.
        (must if first_at <= split_at else nice).append(skill)

    lowered = f"{listing.title} {listing.employment_type or ''}".lower()
    if "intern" in lowered:
        job_type = "internship"
    elif "part" in lowered:
        job_type = "part-time"
    elif "contract" in lowered:
        job_type = "contract"
    else:
        job_type = "full-time"

    years = 0
    digits = [int(n) for n in re.findall(r"(\d+)\+?\s*(?:years?|yrs?)", text.lower())]
    if digits:
        years = max(digits)
    level = "fresher" if years < 1 else "junior" if years < 3 else "mid" if years < 6 else "senior"

    return NormalizedListing(
        must_skills=_canonicalize(must),
        nice_skills=_canonicalize(nice),
        experience_level=level,
        job_type=job_type,
        salary=listing.salary if _contains_text(listing.salary, [text]) else None,
        deadline=listing.deadline if _contains_text(listing.deadline, [text]) else None,
    )


def normalize_listing(listing: RawListing) -> NormalizedListing:
    """LLM normalization first; deterministic rules on any failure.

    LLM output is validated twice: by Pydantic against `NormalizedListing`, then
    by the no-invention checks (salary/deadline must literally appear, skills
    must be taxonomy names).
    """
    try:
        result = llm.complete_json(
            _PROMPT_TEMPLATE.format(
                title=listing.title,
                location=listing.location,
                job_type_raw=listing.employment_type or "not stated",
                text=listing.description or listing.title,
            ),
            system=_SYSTEM,
            schema_model=NormalizedListing,
            model=settings.llm_fast_model,
        )
        assert isinstance(result, NormalizedListing)
    except llm.LLMUnavailable:
        return rules_normalize(listing)
    except (llm.LLMResponseInvalid, UnsupportedSchemaError) as exc:
        logger.info("Listing normalization rejected (%s); using rules fallback.", exc)
        return rules_normalize(listing)
    except Exception as exc:  # noqa: BLE001 - any provider failure = rules path
        logger.info("Listing normalization failed (%s); using rules fallback.", exc)
        return rules_normalize(listing)

    # No-invention validation on top of the schema validation.
    haystacks = [listing.description, listing.title]
    if result.salary and not _contains_text(result.salary, haystacks):
        logger.debug("Dropping LLM salary not present in listing text.")
        result.salary = None
    if result.deadline and not _contains_text(result.deadline, haystacks):
        logger.debug("Dropping LLM deadline not present in listing text.")
        result.deadline = None
    result.must_skills = _canonicalize(result.must_skills)
    result.nice_skills = _canonicalize(result.nice_skills)
    if result.nice_skills and not result.must_skills:
        result.must_skills, result.nice_skills = result.nice_skills, []
    return result
