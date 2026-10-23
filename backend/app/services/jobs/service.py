"""Job listings store (owner: Teammate B).

Reads app/data/jobs.json. No database for the MVP: the file is the database.
Every real listing needs `source_url`, `verified=true` and `last_verified`.

Task 4 addition (additive): `list_jobs_from_db` / `get_job_from_db` read the
SQLAlchemy-backed listings produced by the supervised scraper. The file store
above remains the fallback for callers that do not pass a session, so existing
behaviour is unchanged.
"""

import json
import logging
from functools import lru_cache

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.db import Job as JobRow
from app.schemas import Job

logger = logging.getLogger(__name__)


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


# ---------- Task 4: database-backed listings (scraper output) ----------


def _row_to_schema(row: JobRow) -> Job:
    return Job(
        id=row.id,
        title=row.title,
        company=row.company.name if row.company_id and row.company else "",
        location=row.location or "",
        job_type=row.job_type or "full-time",
        experience_level=row.experience_level or "fresher",
        skills_required=list(row.skills_required or []),
        description=row.description or "",
        source_url=row.source_url,
        verified=bool(row.verified),
        last_verified=row.last_verified.isoformat() if row.last_verified else None,
        apply_url=row.apply_url,
    )


def list_jobs_from_db(
    session: Session, verified_only: bool = False, q: str | None = None
) -> list[Job]:
    """Active scraper-backed listings; empty list when the database has none."""
    stmt = select(JobRow).where(JobRow.is_active.is_(True)).order_by(JobRow.last_scraped_at.desc())
    rows = list(session.scalars(stmt))
    if verified_only:
        rows = [r for r in rows if r.verified]
    if q:
        needle = q.lower()
        rows = [r for r in rows if needle in f"{r.title} {r.description}".lower()]
    return [_row_to_schema(row) for row in rows]


def get_job_from_db(session: Session, job_id: str) -> Job | None:
    row = session.get(JobRow, job_id)
    if row is None or not row.is_active:
        return None
    return _row_to_schema(row)
