"""Job matching service (owner: Teammate B).

Transparent hybrid matching combining three normalized signals:
1. Signal A (Skill Overlap): canonical skill normalization and job-importance weighting (50%),
   further scaled by the candidate's evidence strength per skill (Task 2 `skill_evidence`):
   a skill demonstrated through work experience or a project counts more than one merely
   listed. Resumes without evidence data keep the legacy behaviour (full credit).
2. Signal B (TF-IDF Similarity): sublinear TF-IDF cosine similarity between resume & job (30%)
3. Signal C (Experience Compatibility): parsed resume experience vs. job experience level (20%)
"""

from __future__ import annotations

import re
from collections.abc import Sequence

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from app.core.taxonomy import canonical_skill, normalize_skill
from app.schemas import Job, JobMatch, MatchRequest, ParsedResume, SkillEvidence
from app.services.jobs.service import list_jobs, list_jobs_from_db
from app.services.parser.service import EVIDENCE_WEIGHTS

# Configurable signal weights summing to 100.0 (transparent heuristic)
WEIGHT_SKILLS: float = 50.0
WEIGHT_TFIDF: float = 30.0
WEIGHT_EXPERIENCE: float = 20.0

# Weight applied to a matched skill for candidates who do carry evidence data but
# have no evidence entry for it: uncorroborated claims count as "listed only".
_LISTED_ONLY_WEIGHT = EVIDENCE_WEIGHTS["listed only"]

# Pre-compiled regex for word extraction
_WORD_RE = re.compile(r"[a-zA-Z0-9+#.]+")


def _candidate_evidence_strengths(
    skill_evidence: Sequence[SkillEvidence] | None,
) -> dict[str, float]:
    """Map canonical candidate-skill names to their strongest evidence strength.

    Multiple entries for the same canonical skill collapse onto the highest
    weighted_strength, mirroring `parser._skill_evidence_entries` aggregation.
    An empty map means the resume carries no evidence data (legacy behaviour).
    """
    strengths: dict[str, float] = {}
    for entry in skill_evidence or []:
        key = canonical_skill(entry.skill) or normalize_skill(entry.skill).lower()
        if not key:
            continue
        strength = max(0.0, min(1.0, entry.weighted_strength))
        strengths[key] = max(strengths.get(key, 0.0), strength)
    return strengths


def compute_skill_overlap(
    resume_skills: Sequence[str],
    job_skills: Sequence[str],
    skill_evidence: Sequence[SkillEvidence] | None = None,
) -> tuple[float, list[str], list[str]]:
    """Compute weighted skill overlap using canonical taxonomy mapping.

    Returns (normalized_score_0_to_1, matched_skills, missing_skills).
    Uses job-importance position weighting: earlier listed skills are weighted higher.
    Each matched skill additionally scales its contribution by the candidate's
    evidence strength for it (work experience > project > listed only) when the
    resume carries `skill_evidence` data; otherwise legacy full credit applies.
    """
    if not job_skills:
        return 1.0 if resume_skills else 0.0, [], []

    evidence_strength = _candidate_evidence_strengths(skill_evidence)
    # Unless the resume provides evidence data, unknown skills keep full credit.
    default_strength = _LISTED_ONLY_WEIGHT if evidence_strength else 1.0

    # Map candidate skills to canonical set
    have_canonical: set[str] = set()
    for s in resume_skills:
        c = canonical_skill(s)
        if c:
            have_canonical.add(c)
        else:
            have_canonical.add(normalize_skill(s).lower())

    matched: list[str] = []
    missing: list[str] = []
    weighted_matched = 0.0
    total_weights = 0.0

    n_skills = len(job_skills)
    for idx, skill in enumerate(job_skills):
        # Linear position decay weight: from 1.0 down to 0.5 for subsequent skills
        weight = 1.0 - (0.5 * idx / max(1, n_skills - 1))
        total_weights += weight

        canon_job_skill = canonical_skill(skill)
        target = canon_job_skill if canon_job_skill else normalize_skill(skill).lower()

        if target in have_canonical:
            matched.append(skill)
            weighted_matched += weight * evidence_strength.get(target, default_strength)
        else:
            missing.append(skill)

    score_ratio = weighted_matched / total_weights if total_weights > 0 else 0.0
    return max(0.0, min(1.0, score_ratio)), matched, missing


def _build_resume_document(resume: ParsedResume) -> str:
    """Concatenate relevant resume textual fields into a single search document."""
    parts: list[str] = []
    if resume.summary:
        parts.append(resume.summary)
    if resume.skills:
        parts.append(" ".join(resume.skills))
    if resume.projects:
        parts.append(" ".join(resume.projects))
    for exp in resume.experience:
        if exp.title:
            parts.append(exp.title)
        if exp.summary:
            parts.append(exp.summary)
    for edu in resume.education:
        if edu.degree:
            parts.append(edu.degree)
    if resume.raw_text:
        parts.append(resume.raw_text)
    return " ".join(parts).strip()


def _build_job_document(job: Job) -> str:
    """Concatenate job title, required skills, and description into a job document."""
    parts = [job.title, " ".join(job.skills_required), job.description]
    return " ".join(parts).strip()


def compute_tfidf_similarity(resume_doc: str, job_doc: str) -> float:
    """Compute cosine similarity of TF-IDF vectors between resume and job.

    Returns float in range [0.0, 1.0].
    Safely handles empty text and single-word inputs without errors.
    """
    if not resume_doc.strip() or not job_doc.strip():
        return 0.0

    try:
        vectorizer = TfidfVectorizer(
            stop_words="english",
            token_pattern=r"(?u)\b[a-zA-Z0-9+#.]+\b",
            sublinear_tf=True,
            norm="l2",
        )
        tfidf_matrix = vectorizer.fit_transform([resume_doc, job_doc])
        similarity = float(cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0])
        return max(0.0, min(1.0, similarity))
    except (ValueError, ZeroDivisionError):
        return 0.0


def compute_experience_compatibility(resume: ParsedResume, job: Job) -> tuple[float, str]:
    """Compute compatibility between resume experience profile and job experience level.

    Returns (score_ratio_0_to_1, rationale_note).
    Rules:
    - Fresher jobs: early-career candidates suited with or without prior job experience.
    - Junior jobs: projects or work history fit well; clean baselines fit adequately.
    - Mid jobs: candidates with 2+ roles fit best; fewer roles receive lower alignment.
    - Senior jobs: require substantial professional industry background.
    """
    num_exp = len(resume.experience)
    has_projects = bool(resume.projects)
    level = job.experience_level.lower()

    if level == "fresher":
        # Freshers are the target audience; never penalize fresh graduates for zero work experience
        return 1.0, "Fresher opportunity ideal for early-career profile"

    if level == "junior":
        if num_exp >= 1 or has_projects:
            return 1.0, "Practical project/work experience matches junior requirements"
        return 0.7, "Baseline qualifications suitable for entry junior role"

    if level == "mid":
        if num_exp >= 2:
            return 1.0, "Demonstrated multi-role work history fits mid-level expectations"
        if num_exp == 1:
            return 0.6, "Partial professional track record for mid-level position"
        return 0.3, "Limited professional experience for mid-level demands"

    if level == "senior":
        if num_exp >= 3:
            return 1.0, "Extensive background aligns with senior role expectations"
        if num_exp == 2:
            return 0.6, "Moderate background for senior requirements"
        if num_exp == 1:
            return 0.3, "Early professional experience below typical senior scope"
        return 0.1, "Requires substantial senior-level industry experience"

    return 0.5, "Standard experience alignment"


def score_job(
    resume: ParsedResume,
    job: Job,
    resume_doc: str | None = None,
) -> JobMatch:
    """Score a single job against a parsed resume using hybrid signals."""
    if resume_doc is None:
        resume_doc = _build_resume_document(resume)
    job_doc = _build_job_document(job)

    # Signal A: Weighted skill overlap (50%), scaled by per-skill evidence.
    # A listing with no structured skills earns NO free skill credit — scoring it
    # full would hand every skill-less row the same inflated score.
    if job.skills_required:
        skill_ratio, matched, missing = compute_skill_overlap(
            resume.skills, job.skills_required, skill_evidence=resume.skill_evidence
        )
        skill_points = skill_ratio * WEIGHT_SKILLS
    else:
        skill_ratio, matched, missing = 0.0, [], []
        skill_points = 0.0

    # Signal B: TF-IDF similarity (30%)
    tfidf_ratio = compute_tfidf_similarity(resume_doc, job_doc)
    tfidf_points = tfidf_ratio * WEIGHT_TFIDF

    # Signal C: Experience compatibility (20%)
    exp_ratio, exp_note = compute_experience_compatibility(resume, job)
    exp_points = exp_ratio * WEIGHT_EXPERIENCE

    total_score = round(skill_points + tfidf_points + exp_points, 1)
    total_score = max(0.0, min(100.0, total_score))

    # Construct readable human rationale
    total_skills = len(job.skills_required)
    relevance_pct = int(round(tfidf_ratio * 100))
    if total_skills:
        rationale = (
            f"Matches {len(matched)} of {total_skills} required skills "
            f"({relevance_pct}% text relevance; {exp_note.lower()})."
        )
    else:
        rationale = (
            "No structured skill requirements on this listing; "
            f"ranked on {relevance_pct}% text relevance and experience fit "
            f"({exp_note.lower()})."
        )
    if evidence := _candidate_evidence_strengths(resume.skill_evidence):
        evidenced = sum(
            1
            for skill in matched
            if evidence.get(canonical_skill(skill) or normalize_skill(skill).lower(), 0.0) >= 0.7
        )
        rationale += f" {evidenced} of {len(matched)} matched skills are backed by direct evidence."

    return JobMatch(
        job=job,
        score=total_score,
        matched_skills=matched,
        missing_skills=missing,
        rationale=rationale,
    )


def match_jobs(req: MatchRequest, session=None) -> list[JobMatch]:
    """Retrieve and rank matching jobs based on hybrid scoring.

    When a database session is provided, scraper-backed (verified) listings take
    precedence; the curated file store is the fallback when the database has none.
    """
    jobs: list[Job] = []
    if session is not None:
        try:
            jobs = list_jobs_from_db(session, verified_only=req.verified_only)
        except Exception:
            jobs = []
    if not jobs:
        jobs = list_jobs(verified_only=req.verified_only)
    if req.location:
        loc = req.location.lower()
        jobs = [j for j in jobs if loc in j.location.lower()]
    if req.job_type:
        jobs = [j for j in jobs if j.job_type == req.job_type]

    resume_doc = _build_resume_document(req.resume)
    results = [score_job(req.resume, job, resume_doc=resume_doc) for job in jobs]

    # Deterministic sorting: primary score descending, secondary job ID ascending
    results.sort(key=lambda m: (-m.score, m.job.id))
    return results[: req.top_k]
