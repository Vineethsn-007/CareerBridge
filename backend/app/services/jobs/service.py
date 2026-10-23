"""Job listings store (owner: Teammate B).

Reads app/data/jobs.json. No database for the MVP: the file is the database.
Every real listing needs `source_url`, `verified=true` and `last_verified`.
"""

import json
from functools import lru_cache

from app.core.config import settings
from app.schemas import Job


@lru_cache(maxsize=1)
def _load() -> tuple[Job, ...]:
    with open(settings.jobs_path, encoding="utf-8") as f:
        return tuple(Job(**item) for item in json.load(f))


def list_jobs(verified_only: bool = False, q: str | None = None) -> list[Job]:
    jobs = list(_load())
    if verified_only:
        jobs = [j for j in jobs if j.verified]
    if q:
        needle = q.lower()
        jobs = [j for j in jobs if needle in f"{j.title} {j.company} {j.description}".lower()]
    return jobs


def get_job(job_id: str) -> Job | None:
    return next((j for j in _load() if j.id == job_id), None)
