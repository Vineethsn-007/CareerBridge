"""Job matching (owner: Teammate B).

Baseline: weighted skill overlap. TODO: embeddings (resume text vs job description),
location / job-type filters, better rationale text.
"""

from app.schemas import Job, JobMatch, MatchRequest, ParsedResume
from app.services.jobs.service import list_jobs


def score_job(resume: ParsedResume, job: Job) -> JobMatch:
    have = {s.lower() for s in resume.skills}
    matched = [s for s in job.skills_required if s.lower() in have]
    missing = [s for s in job.skills_required if s.lower() not in have]
    total = len(job.skills_required) or 1
    score = round(100 * len(matched) / total, 1)
    return JobMatch(
        job=job,
        score=score,
        matched_skills=matched,
        missing_skills=missing,
        rationale=f"You match {len(matched)} of {total} required skills.",
    )


def match_jobs(req: MatchRequest) -> list[JobMatch]:
    jobs = list_jobs(verified_only=req.verified_only)
    if req.location:
        jobs = [j for j in jobs if req.location.lower() in j.location.lower()]
    if req.job_type:
        jobs = [j for j in jobs if j.job_type == req.job_type]
    results = [score_job(req.resume, job) for job in jobs]
    results.sort(key=lambda m: m.score, reverse=True)
    return results[: req.top_k]
