"""Unit and behavior tests for the hybrid job matching algorithm (Teammate B)."""

from __future__ import annotations

from app.schemas import Experience, Job, JobMatch, MatchRequest, ParsedResume
from app.services.matching.service import (
    compute_experience_compatibility,
    compute_skill_overlap,
    compute_tfidf_similarity,
    match_jobs,
    score_job,
)


def _make_job(
    job_id: str = "test-job-01",
    title: str = "Backend Developer",
    company: str = "Tech Corp",
    location: str = "Bengaluru",
    job_type: str = "full-time",
    experience_level: str = "fresher",
    skills: list[str] | None = None,
    description: str = "Build scalable web applications and REST APIs using Python and databases.",
    verified: bool = False,
) -> Job:
    return Job(
        id=job_id,
        title=title,
        company=company,
        location=location,
        job_type=job_type,
        experience_level=experience_level,
        skills_required=skills if skills is not None else ["Python", "SQL", "Git", "REST API"],
        description=description,
        source_url="https://techcorp.example.org/careers",
        verified=verified,
        last_verified=None,
    )


# ---------------- Signal A Tests: Skill Overlap ----------------


def test_skill_overlap_canonical_and_synonym_normalization():
    """Synonyms and case differences are mapped without substring collisions."""
    # Java should NOT match JavaScript
    ratio_java, matched_java, _ = compute_skill_overlap(
        resume_skills=["Java"],
        job_skills=["JavaScript", "React"],
    )
    assert "JavaScript" not in matched_java
    assert ratio_java == 0.0

    # ML synonym matches canonical Machine Learning
    ratio_ml, matched_ml, missing_ml = compute_skill_overlap(
        resume_skills=["ml", "python"],
        job_skills=["Python", "Machine Learning"],
    )
    assert set(matched_ml) == {"Python", "Machine Learning"}
    assert not missing_ml
    assert ratio_ml == 1.0


def test_skill_overlap_empty_and_duplicate_skills():
    """Handles empty or duplicate skill collections safely."""
    ratio, matched, missing = compute_skill_overlap([], ["Python", "Git"])
    assert ratio == 0.0
    assert not matched
    assert missing == ["Python", "Git"]

    ratio_dup, matched_dup, _ = compute_skill_overlap(["Python", "Python"], ["Python"])
    assert ratio_dup == 1.0
    assert matched_dup == ["Python"]


# ---------------- Signal B Tests: TF-IDF Text Similarity ----------------


def test_tfidf_text_similarity_basic():
    """Relevant text produces higher similarity than completely irrelevant text."""
    resume_web = (
        "Full stack web developer with extensive experience building React and Node.js REST APIs."
    )
    job_web = (
        "Full Stack Engineer React Node.js REST API Develop modern responsive user interfaces."
    )
    job_embedded = "Embedded firmware engineer developing C firmware for automotive sensor units."

    sim_web = compute_tfidf_similarity(resume_web, job_web)
    sim_embedded = compute_tfidf_similarity(resume_web, job_embedded)

    assert 0.0 <= sim_web <= 1.0
    assert 0.0 <= sim_embedded <= 1.0
    assert sim_web > sim_embedded
    assert sim_web > 0.2


def test_tfidf_text_similarity_empty_and_short_inputs():
    """Safely handles empty or single character inputs without raising exceptions."""
    assert compute_tfidf_similarity("", "Backend developer") == 0.0
    assert compute_tfidf_similarity("Python developer", "") == 0.0
    assert compute_tfidf_similarity("   ", "   ") == 0.0
    assert compute_tfidf_similarity("a", "b") == 0.0


# ---------------- Signal C Tests: Experience Compatibility ----------------


def test_experience_compatibility_freshers_not_penalized():
    """Fresher roles do not penalize candidates with zero prior work experience."""
    resume_fresher = ParsedResume(name="Grad", raw_text="Student")
    job_fresher = _make_job(experience_level="fresher")

    ratio, note = compute_experience_compatibility(resume_fresher, job_fresher)
    assert ratio == 1.0
    assert "fresher" in note.lower()


def test_experience_compatibility_senior_levels():
    """Senior roles expect multi-year work experience history."""
    resume_zero_exp = ParsedResume(name="Junior Candidate")
    resume_experienced = ParsedResume(
        name="Senior Candidate",
        experience=[
            Experience(title="Lead Engineer", company="A"),
            Experience(title="Senior Dev", company="B"),
            Experience(title="Engineer", company="C"),
        ],
    )
    job_senior = _make_job(experience_level="senior")

    ratio_junior, _ = compute_experience_compatibility(resume_zero_exp, job_senior)
    ratio_senior, _ = compute_experience_compatibility(resume_experienced, job_senior)

    assert ratio_senior > ratio_junior
    assert ratio_senior == 1.0
    assert ratio_junior <= 0.3


# ---------------- Integrated Scoring & Ranking Tests ----------------


def test_relevant_resume_outranks_irrelevant_resume():
    """Candidate with domain skills and text scores significantly higher."""
    resume_python = ParsedResume(
        name="Python Dev",
        skills=["Python", "SQL", "Git", "REST API"],
        summary="Backend developer building web services with Python and PostgreSQL.",
        projects=["Django e-commerce API"],
    )
    resume_irrelevant = ParsedResume(
        name="Support Specialist",
        skills=["Customer Support", "Networking"],
        summary="Customer support agent resolving network connectivity issues.",
    )
    job = _make_job()

    match_good = score_job(resume_python, job)
    match_bad = score_job(resume_irrelevant, job)

    assert 0.0 <= match_good.score <= 100.0
    assert 0.0 <= match_bad.score <= 100.0
    assert match_good.score > match_bad.score
    assert len(match_good.matched_skills) > len(match_bad.matched_skills)
    assert "matches" in match_good.rationale.lower()


def test_match_jobs_filtering_and_top_k():
    """Verified-only, location, job-type, and top-k constraints are preserved."""
    resume = ParsedResume(skills=["Python", "SQL"])

    req = MatchRequest(
        resume=resume,
        top_k=2,
        verified_only=False,
        location="Bengaluru",
        job_type="full-time",
    )
    matches = match_jobs(req)

    assert len(matches) <= 2
    for m in matches:
        assert isinstance(m, JobMatch)
        assert "bengaluru" in m.job.location.lower()
        assert m.job.job_type == "full-time"
        assert 0.0 <= m.score <= 100.0


def test_deterministic_ranking_for_identical_scores():
    """Ties are broken deterministically using job ID."""
    resume = ParsedResume(skills=["Python"])
    req = MatchRequest(resume=resume, top_k=10, verified_only=False)

    matches1 = match_jobs(req)
    matches2 = match_jobs(req)

    ids1 = [m.job.id for m in matches1]
    ids2 = [m.job.id for m in matches2]
    assert ids1 == ids2
