"""Run orchestrator: fetch -> filter -> normalize -> validate -> verify -> store.

One run handles one company config (`--company X` or the admin endpoint). Dry
runs stop short of verify/persist so repeated invocations cost only the read
requests and never write anything.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from datetime import date

from sqlalchemy.orm import Session

from app.core.config import settings
from app.schemas import Job as JobSchema
from app.scraper.config import CompanyConfig
from app.scraper.http import fetch_text
from app.scraper.normalize import normalize_listing
from app.scraper.sources import source_for
from app.scraper.store import ScrapedJob, upsert_jobs, validate_job_schema
from app.scraper.verify import verify_apply_url

logger = logging.getLogger(__name__)

_SLUG_RE = re.compile(r"[^a-z0-9]+")


@dataclass
class SourceReport:
    company: str
    ats: str
    fetched: int = 0
    india_matches: int = 0
    accepted: int = 0
    verified: int = 0
    rejected: int = 0
    skipped: int = 0
    errors: list[str] = field(default_factory=list)
    created: int = 0
    updated: int = 0
    stale_disabled: int = 0

    def to_dict(self) -> dict:
        return {
            "company": self.company,
            "ats": self.ats,
            "fetched": self.fetched,
            "india_matches": self.india_matches,
            "accepted": self.accepted,
            "verified": self.verified,
            "rejected": self.rejected,
            "skipped": self.skipped,
            "errors": self.errors,
            "created": self.created,
            "updated": self.updated,
            "stale_disabled": self.stale_disabled,
        }


@dataclass
class RunReport:
    started_at: str
    dry_run: bool
    sources: list[SourceReport] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "started_at": self.started_at,
            "dry_run": self.dry_run,
            "sources": [s.to_dict() for s in self.sources],
        }


def _job_id(config: CompanyConfig, listing_external_id: str, apply_url: str) -> str:
    slug = _SLUG_RE.sub("-", f"{config.ats}-{config.token}-{listing_external_id}".lower()).strip(
        "-"
    )
    return slug[:100] or _SLUG_RE.sub("-", apply_url.lower())[:100]


def run_single_source(
    session: Session,
    config: CompanyConfig,
    *,
    dry_run: bool = False,
    max_listings: int | None = None,
) -> SourceReport:
    """One company end-to-end. Never raises for a failing source; it is skipped."""
    report = SourceReport(company=config.name, ats=config.ats)
    cap = max_listings or settings.scraper_max_listings

    source = source_for(config.ats)
    try:
        response = fetch_text(source.url(config.token))
        if response.status != 200:
            report.errors.append(f"board API HTTP {response.status}")
            return report
        payload = response.json()
        raw_listings = source.parse(payload, config.token)
    except Exception as exc:  # noqa: BLE001 - one bad source must not stop the run
        logger.warning("Source %s (%s) failed: %s", config.name, config.ats, exc)
        report.errors.append(f"fetch/parse failed: {exc}")
        return report

    if hasattr(source, "load_details"):
        try:
            source.load_details(  # type: ignore[attr-defined]
                config.token,
                [r.external_id for r in raw_listings[:cap]],
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("Detail fetch for %s failed: %s", config.name, exc)
            report.errors.append(f"detail fetch failed: {exc}")

    report.fetched = len(raw_listings)
    parsed = raw_listings[:cap]

    rows: list[JobSchema] = []
    for listing in parsed:
        if config.india_only and not _india_only_ok(listing):
            report.skipped += 1
            continue
        report.india_matches += 1

        if listing.apply_url and not dry_run:
            verification = verify_apply_url(listing.apply_url, config.employer_domains)
            if not verification.ok:
                logger.info(
                    "apply_url not verified for %s (%s)", listing.title, verification.reason
                )
        else:
            # Dry-run never performs verification (no side-effect pages fetched);
            # candidates stay unverified until a real run confirms them.
            verification = None
        normalized = normalize_listing(listing)
        job = JobSchema(
            id=_job_id(config, listing.external_id, listing.apply_url),
            title=listing.title,
            company=config.name,
            location=listing.location,
            job_type=normalized.job_type,
            experience_level=normalized.experience_level,
            skills_required=[
                *normalized.must_skills,
                *[s for s in normalized.nice_skills if s not in normalized.must_skills],
            ],
            description=listing.description or listing.title,
            source_url=listing.apply_url,
            verified=bool(verification and verification.ok),
            last_verified=date.today().isoformat() if verification and verification.ok else None,
            apply_url=listing.apply_url or None,
        )
        handoff = ScrapedJob(
            schema=job,
            must_skills=normalized.must_skills,
            nice_skills=normalized.nice_skills,
            salary=normalized.salary or listing.salary,
            deadline=normalized.deadline or listing.deadline,
            posted_at=listing.posted_at,
        )
        problem = validate_job_schema(handoff.schema)
        if problem:
            logger.info("Listing %s rejected: %s", listing.title, problem)
            report.rejected += 1
            continue
        if verification and verification.ok:
            report.verified += 1
        rows.append(handoff)

    report.accepted = len(rows)
    if dry_run:
        session.rollback()  # upsert_jobs commits; dry-run undoes it immediately
        logger.info("Dry run for %s: nothing persisted.", config.name)
        return report

    try:
        stats = upsert_jobs(session, config, rows)
        report.created = stats["created"]
        report.updated = stats["updated"]
        report.stale_disabled = stats["stale_disabled"]
    except Exception as exc:  # noqa: BLE001
        session.rollback()
        logger.exception("Store failed for %s", config.name)
        report.errors.append(f"store failed: {exc}")
    return report


def _india_only_ok(listing) -> bool:
    from app.scraper.sources import looks_india

    return looks_india(listing.location, listing.description[:300])


def run_scrape(
    session: Session,
    companies: list[CompanyConfig],
    *,
    dry_run: bool = False,
) -> RunReport:
    """Full run across selected companies; one failure never blocks the others."""
    report = RunReport(started_at=_iso_now(), dry_run=dry_run, sources=[])
    llm_note = "llm-unavailable (rules fallback)" if _llm_missing() else "llm"
    for config in companies:
        logger.info("Scraping %s via %s (%s)", config.name, config.ats, llm_note)
        report.sources.append(run_single_source(session, config, dry_run=dry_run))
    if dry_run:
        session.rollback()
    return report


def _llm_missing() -> bool:
    """True when the run will use deterministic rules instead of the LLM agent."""
    return bool(settings.llm_provider == "mock" or not settings.llm_api_key)


def _iso_now() -> str:
    from datetime import datetime

    from app.core.db import UTC

    return datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


def main(argv: list[str] | None = None) -> int:
    """CLI: python -m app.scraper.run --company "Databricks" [--dry-run]"""
    import argparse

    from app.core.db import SessionLocal, init_db

    parser = argparse.ArgumentParser(description="Run the verified ATS job scraper.")
    parser.add_argument("--company", help="Company name as configured in companies.yaml.")
    parser.add_argument(
        "--dry-run", action="store_true", help="Fetch and report but persist nothing."
    )
    parser.add_argument("--limit", type=int, default=None, help="Max listings per source (debug).")
    args = parser.parse_args(argv)

    from app.scraper.config import load_companies

    companies = load_companies()
    if args.company:
        companies = [c for c in companies if c.name.lower() == args.company.lower()]
        if not companies:
            print(f"No enabled source named {args.company!r}.", flush=True)
            return 2

    init_db()
    llm_mode = "unavailable; rules fallback" if _llm_missing() else "enabled"
    print(f"LLM: {llm_mode}; sources: {[c.name for c in companies]}", flush=True)
    session = SessionLocal()
    try:
        report = run_scrape(session, companies, dry_run=args.dry_run)
        for source in report.sources:
            print(source.to_dict(), flush=True)
    finally:
        session.close()
    print(f"Done (dry_run={args.dry_run}, limit={args.limit}).", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
