"""Database persistence for scraped listings (dedupe, upsert, freshness).

Jobs join Company rows by normalized company name. Upserts key on the unique
`source_url`; `first_seen` records the birth of the row, `last_scraped_at`
advances on every successful re-scrape. Listings that have not been re-seen for
`SCRAPER_STALE_DAYS` (14 default) flip `is_active=false` — history is kept, not
deleted. A row is only `verified=true` after a successful `verify_apply_url`
call in this run; a failed re-verification drops the flag (defensive).

The pipeline hands over `ScrapedJob` values: everything the API `Job` schema
contains plus the scraper-only fields (must/nice skill split, salary, deadline,
posted_at) that only exist on the database model.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.db import UTC, Company, Job
from app.schemas import Job as JobSchema
from app.scraper.config import CompanyConfig

logger = logging.getLogger(__name__)


@dataclass
class ScrapedJob:
    """Scraper handoff: API-grade fields + DB-only enrichment."""

    schema: JobSchema
    must_skills: list[str] = field(default_factory=list)
    nice_skills: list[str] = field(default_factory=list)
    salary: str | None = None
    deadline: str | None = None
    posted_at: str | None = None


def _now() -> datetime:
    return datetime.now(UTC)


def get_or_create_company(session: Session, config: CompanyConfig) -> Company:
    company = session.scalar(select(Company).where(Company.name == config.name))
    if company is None:
        company = Company(name=config.name, careers_url=config.careers_url, ats_type=config.ats)
        session.add(company)
        session.flush()
    else:
        company.careers_url = config.careers_url
        company.ats_type = config.ats
    return company


def validate_job_schema(payload: JobSchema) -> str | None:
    """Last-gate validation against the API contract. Returns error or None."""
    taxonomy = settings_taxonomy()
    if not payload.title or not payload.source_url or not payload.company:
        return "missing required identity fields"
    unknown = [skill for skill in payload.skills_required if skill not in taxonomy]
    if unknown:
        return f"skills outside canonical taxonomy: {unknown}"
    return None


def settings_taxonomy() -> set[str]:
    from app.core.taxonomy import SKILLS

    return set(SKILLS)


def upsert_jobs(
    session: Session,
    config: CompanyConfig,
    scraped: list[ScrapedJob],
    *,
    stale_days: int = settings.scraper_stale_days,
) -> dict:
    """Insert new / update seen rows; mark stale unseen rows inactive.

    Returns counters used by the run report: {"created": n, "updated": n,
    "stale_disabled": n}. Callers that must not persist (dry-run) roll their
    session back afterwards, so this module stays persistence-agnostic.
    """
    company = get_or_create_company(session, config)
    seen_urls: set[str] = set()
    created = updated = 0
    now = _now()

    for item in scraped:
        row = item.schema
        existing = session.scalar(select(Job).where(Job.source_url == row.source_url))
        if existing is None:
            job = Job(
                id=row.id,
                company_id=company.id,
                title=row.title,
                location=row.location,
                job_type=row.job_type,
                experience_level=row.experience_level,
                source_url=row.source_url,
                apply_url=row.apply_url,
                description=row.description,
                must_skills=item.must_skills,
                nice_skills=item.nice_skills,
                skills_required=row.skills_required,
                salary=item.salary,
                deadline=item.deadline,
                posted_at=item.posted_at,
                verified=row.verified,
                last_verified=date.fromisoformat(row.last_verified) if row.last_verified else None,
                first_seen=now,
                last_scraped_at=now,
                is_active=True,
            )
            session.add(job)
            created += 1
        else:
            existing.company_id = company.id
            existing.title = row.title
            existing.location = row.location
            existing.job_type = row.job_type
            existing.experience_level = row.experience_level
            existing.apply_url = row.apply_url
            existing.description = row.description
            existing.must_skills = item.must_skills
            existing.nice_skills = item.nice_skills
            existing.skills_required = row.skills_required
            existing.salary = item.salary
            existing.deadline = item.deadline
            existing.posted_at = item.posted_at
            existing.verified = row.verified
            existing.last_verified = (
                date.fromisoformat(row.last_verified) if row.last_verified else None
            )
            existing.last_scraped_at = now
            existing.is_active = True
            updated += 1
        seen_urls.add(row.source_url)

    stale_disabled = _disable_stale(session, company.id, seen_urls, now, stale_days)
    session.commit()
    logger.info(
        "%s: created=%d updated=%d stale_disabled=%d",
        config.name,
        created,
        updated,
        stale_disabled,
    )
    return {"created": created, "updated": updated, "stale_disabled": stale_disabled}


def _as_utc(value: datetime | None) -> datetime | None:
    """SQLite round-trips drop tzinfo; normalize naive timestamps to UTC."""
    if value is not None and value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value


def _disable_stale(
    session: Session,
    company_id: int | None,
    seen_urls: set[str],
    now: datetime,
    stale_days: int,
) -> int:
    """Flip is_active=False for this company's rows not re-seen within the window."""
    cutoff = now - timedelta(days=stale_days)
    disabled = 0
    for job in session.scalars(select(Job).where(Job.company_id == company_id)):
        if job.source_url in seen_urls:
            continue
        last_seen = _as_utc(job.last_scraped_at or job.first_seen)
        if last_seen is None or last_seen < cutoff:
            if job.is_active:
                job.is_active = False
                disabled += 1
    return disabled
