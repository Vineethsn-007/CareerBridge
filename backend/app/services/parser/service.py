"""Resume parser (owner: lead).

Primary path: one strict structured-output LLM call extracts experiences, education,
certifications, evidence-classified skills, projects and insights; skills are normalized
through the taxonomy and ranked by evidence-weighted strength.

The regex/taxonomy baseline remains the deterministic fallback: any LLM failure or
schema-invalid output falls back to it, so endpoints keep their normal responses.
Contact details (email/phone) are always regex-based and act as a cross-check on the LLM.
"""

from __future__ import annotations

import io
import logging
import re
from collections.abc import Iterable

from docx import Document
from pypdf import PdfReader

from app.core.llm import complete_json
from app.core.strict_schema import UnsupportedSchemaError
from app.core.taxonomy import canonical_skill
from app.schemas import (
    Certification,
    Education,
    Experience,
    ParsedResume,
    ResumeInsight,
    ResumeInsights,
    SkillEvidence,
    SkillEvidenceCategory,
)
from app.services.parser.models import (
    ExperienceEntry,
    Insights,
    ResumeExtraction,
    SkillMention,
)

logger = logging.getLogger(__name__)

EMAIL_RE = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
PHONE_RE = re.compile(r"(?:\+91[\s-]?)?[6-9]\d{9}")

# --------------------------------------------------------------------------
# Evidence weighting (Task 2 constants block). These weights prioritise skills
# demonstrated through actual experience over skills merely listed; they are not
# a substitute for the evidence validation rules above.
# --------------------------------------------------------------------------
EVIDENCE_WEIGHTS: dict[SkillEvidenceCategory, float] = {
    "work experience": 1.0,
    "project": 0.7,
    "listed only": 0.3,
}
# Independently corroborated evidence (>= 2 categories for one skill) earns a small,
# bounded bonus; the result stays inside [0, 1].
CORROBORATION_BONUS = 0.1

# Cap the text sent to the LLM so oversized resumes cannot blow up the prompt.
_MAX_LLM_TEXT_CHARS = 12000

_SKILL_EVIDENCE_ORDER: tuple[SkillEvidenceCategory, ...] = (
    "work experience",
    "project",
    "listed only",
)

_EXTRACT_SYSTEM = (
    "You extract structured data from resumes. Use only information present in the "
    "resume text. Never fabricate employers, projects, dates, degrees, skills, "
    "proficiency levels, years of experience, metrics or any other qualification. "
    "If something is missing, use null or an empty list. Reply with JSON only."
)

_EXTRACT_PROMPT = """Extract structured information from the resume text below.

Rules:
- Use only information present in the resume. Never invent anything.
- For each skill, set `category` to the strongest evidence the resume actually contains:
  "work experience" when used on the job, "project" when used in a personal or course
  project, "listed only" when the skill only appears without usage context.
- Only give `proficiency` and `years` when the resume states or clearly implies them;
  otherwise use null. Never guess levels or numbers.
- Experience `impact` bullets must quote or closely restate what the resume says,
  including metrics when the resume contains them. Do not add metrics that are absent.
- Every insight strength/gap must include `evidence`: a short quote or reference from
  the resume supporting it. Suggest target roles only based on the resume's skills.
- `duration_months` should be counted from the dates when derivable; else null.
- Do not include name, email or phone; they are extracted separately by regex.

Resume text:
{text}
"""


class NoTextLayerError(ValueError):
    """Raised when a document yields no extractable text (e.g. scanned PDF)."""


def extract_text(filename: str, data: bytes) -> str:
    lower = filename.lower()
    if lower.endswith(".pdf"):
        return _extract_pdf_text(data)
    if lower.endswith(".docx"):
        return _extract_docx_text(data)
    return data.decode("utf-8", errors="ignore")


def _extract_pdf_text(data: bytes) -> str:
    reader = PdfReader(io.BytesIO(data))
    text = "\n".join(page.extract_text() or "" for page in reader.pages).strip()
    if not text:
        # Clearly actionable: this resume has no text layer to parse.
        raise NoTextLayerError(
            "This PDF has no extractable text layer. It may be a scanned image; "
            "submit a text-based PDF, DOCX or TXT resume instead."
        )
    return text


def _extract_docx_text(data: bytes) -> str:
    document = Document(io.BytesIO(data))
    paragraphs = [p.text.strip() for p in document.paragraphs if p.text.strip()]
    table_text: list[str] = []
    for table in document.tables:
        for row in table.rows:
            row_text = "  ".join(cell.text.strip() for cell in row.cells if cell.text.strip())
            if row_text:
                table_text.append(row_text)
    return "\n".join(paragraphs + table_text)


def parse_resume(filename: str, data: bytes) -> ParsedResume:
    text = extract_text(filename, data).strip()
    baseline = _baseline_parse(text)
    if not text:
        return baseline
    try:
        extraction = _llm_extract(text)
    except UnsupportedSchemaError:  # not an extraction failure: the contract is broken
        raise
    except Exception:
        logger.debug("Resume LLM extraction failed; using regex/taxonomy fallback.")
        return _baseline_with_evidence(baseline)
    return _build_parsed_resume(baseline, extraction)


def _baseline_with_evidence(baseline: ParsedResume) -> ParsedResume:
    """Fallback: taxonomy evidence only. No claim beyond 'listed only' is made."""
    return baseline.model_copy(
        update={"skill_evidence": _skill_evidence_entries([], baseline.skills), "insights": None}
    )


def _baseline_parse(text: str) -> ParsedResume:
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    email = EMAIL_RE.search(text)
    phone = PHONE_RE.search(text)
    return ParsedResume(
        name=lines[0] if lines else None,
        email=email.group(0) if email else None,
        phone=phone.group(0) if phone else None,
        skills=extract_skills_sorted(text),
        raw_text=text,
    )


def extract_skills_sorted(text: str) -> list[str]:
    from app.core.taxonomy import extract_skills  # local import avoids tests' patch churn

    return extract_skills(text)


def _llm_extract(text: str) -> ResumeExtraction:
    """One strict structured-output call.

    Accepts either a validated `ResumeExtraction` (real `complete_json`) or a raw dict
    (simple test doubles), always validating through Pydantic.
    """
    result = complete_json(
        _EXTRACT_PROMPT.format(text=text[:_MAX_LLM_TEXT_CHARS]),
        _EXTRACT_SYSTEM,
        schema_model=ResumeExtraction,  # type: ignore[arg-type]
    )
    if isinstance(result, ResumeExtraction):
        return result
    return ResumeExtraction.model_validate(result)


def _skill_evidence_entries(
    mentions: Iterable[SkillMention], baseline_skills: Iterable[str]
) -> list[SkillEvidence]:
    """Merge LLM-mention evidence with taxonomy baseline skills, then rank.

    A skill mentioned several ways collapses onto its canonical taxonomy name (or a
    trimmed literal when the taxonomy has no alias). Evidence categories split by
    mention; the strongest category defines the base weight, corroboration adds a
    small bounded bonus. Nothing not present in the resume is ever counted.
    """
    aggregated: dict[str, dict] = {}
    for mention in mentions:
        name = _canonical_name(mention.skill)
        if not name:
            continue
        entry = aggregated.setdefault(
            name, {"categories": set(), "proficiency": None, "years": None}
        )
        if entry["proficiency"] is None and mention.proficiency:
            entry["proficiency"] = mention.proficiency
        if entry["years"] is None and mention.years is not None:
            entry["years"] = mention.years
        entry["categories"].add(mention.category)
    for baseline_skill in _canonical_unique(baseline_skills):
        aggregated.setdefault(
            baseline_skill, {"categories": {"listed only"}, "proficiency": None, "years": None}
        )

    entries: list[SkillEvidence] = []
    for name, data in aggregated.items():
        base_weight = max(
            (EVIDENCE_WEIGHTS[c] for c in data["categories"] if c in EVIDENCE_WEIGHTS),
            default=EVIDENCE_WEIGHTS["listed only"],
        )
        strength = min(
            1.0, base_weight + (CORROBORATION_BONUS if len(data["categories"]) > 1 else 0)
        )
        best_category = _best_category(data["categories"])
        entries.append(
            SkillEvidence(
                skill=name,
                category=best_category,
                weighted_strength=round(strength, 3),
                proficiency=data["proficiency"],
                years=data["years"],
            )
        )
    entries.sort(key=lambda e: (-e.weighted_strength, e.skill))
    return entries


def _best_category(categories: set[str]) -> SkillEvidenceCategory:
    for category in _SKILL_EVIDENCE_ORDER:
        if category in categories:
            return category
    return "listed only"


def _canonical_unique(skills: Iterable[str]) -> list[str]:
    names: list[str] = []
    for skill in skills:
        name = _canonical_name(skill)
        if name and name not in names:
            names.append(name)
    return names


def _canonical_name(skill: str) -> str:
    name = (skill or "").strip()
    if not name:
        return ""
    return canonical_skill(name) or name


def _experiences(entries: Iterable[ExperienceEntry]) -> list[Experience]:
    return [
        Experience(
            title=e.title,
            company=e.company,
            duration=(
                _duration_label(e.start_date, e.end_date, e.duration_months)
                if (e.start_date or e.end_date or e.duration_months is not None)
                else None
            ),
            summary=e.impact[0] if e.impact else None,
            start_date=e.start_date,
            end_date=e.end_date,
            duration_months=e.duration_months,
            technologies=list(e.technologies),
            impact=list(e.impact),
            seniority=e.seniority,
        )
        for e in entries
    ]


def _duration_label(_start: str | None, _end: str | None, months: int | None) -> str | None:
    if months is None:
        return None
    if months < 12:
        return f"{months} month{'s' if months != 1 else ''}"
    years = months // 12
    remainder = months % 12
    label = f"{years} year{'s' if years != 1 else ''}"
    if remainder:
        label += f" {remainder} mo"
    return label


def _total_months(extraction: ResumeExtraction) -> int | None:
    if extraction.total_experience_months is not None:
        return extraction.total_experience_months
    total = sum(e.duration_months for e in extraction.experiences if e.duration_months is not None)
    return total if total else None


def _insights(insights: Insights | None) -> ResumeInsights | None:
    if insights is None:
        return None
    return ResumeInsights(
        strengths=[ResumeInsight(text=s.text, evidence=s.evidence) for s in insights.strengths],
        gaps=[ResumeInsight(text=g.text, evidence=g.evidence) for g in insights.gaps],
        summary=insights.summary,
        target_roles=list(insights.target_roles),
        tips=list(insights.tips),
    )


def _build_parsed_resume(baseline: ParsedResume, extraction: ResumeExtraction) -> ParsedResume:
    evidence = _skill_evidence_entries(extraction.skills, baseline.skills)
    return ParsedResume(
        name=baseline.name,
        email=baseline.email,
        phone=baseline.phone,
        summary=extraction.summary,
        skills=[e.skill for e in evidence],
        education=[
            Education(institution=edu.institution, degree=edu.degree, year=edu.year)
            for edu in extraction.education
        ],
        experience=_experiences(extraction.experiences),
        projects=list(extraction.projects),
        raw_text=baseline.raw_text,
        skill_evidence=evidence,
        certifications=[
            Certification(name=cert.name, issuer=cert.issuer, year=cert.year)
            for cert in extraction.certifications
        ],
        total_experience_months=_total_months(extraction),
        insights=_insights(extraction.insights),
    )
