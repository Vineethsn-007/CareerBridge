"""Scraper tests (Task 4): parsers, normalization, verification, store, admin API.

Saved JSON fixtures under tests/fixtures/scraping/** carry the real ATS payload
shapes; network access is fully mocked at the `app.scraper.http` /
`app.scraper.verify` boundaries and the LLM at `app.scraper.normalize`. Every
database test uses an isolated in-memory SQLite engine.
"""

import datetime as dt
import json
import re
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core import llm
from app.core.db import Company, Job, init_db
from app.main import app
from app.scraper.config import CompanyConfig, canonical_skills
from app.scraper.normalize import NormalizedListing, normalize_listing, rules_normalize
from app.scraper.sources import (
    AshbySource,
    GreenhouseSource,
    LeverSource,
    RawListing,
    SmartRecruitersSource,
    SourceError,
)
from app.scraper.store import ScrapedJob, upsert_jobs
from app.scraper.verify import verify_apply_url
from app.services.jobs.link_check import SSRFSecurityError

FIXTURES = Path(__file__).parent / "fixtures" / "scraping"


@pytest.fixture()
def session():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        future=True,
    )
    init_db(engine)
    maker = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False, future=True)
    db = maker()
    try:
        yield db
    finally:
        db.close()


def _load(name: str):
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


# ---------------- source parsing (real payload shapes) ----------------


def test_greenhouse_parser_reads_real_payload_shape():
    listings = GreenhouseSource().parse(_load("greenhouse.json"))
    assert len(listings) == 2
    first = listings[0]
    assert first.title and first.external_id and first.apply_url
    assert first.apply_url.startswith("https://")
    assert first.posted_at


def test_lever_parser_reads_real_payload_shape():
    listings = LeverSource().parse(_load("lever.json"))
    assert len(listings) >= 1
    assert all(job.apply_url for job in listings)
    assert all(job.description for job in listings)


def test_ashby_parser_reads_real_payload_shape():
    listings = AshbySource().parse(_load("ashby.json"))
    assert len(listings) >= 1
    assert all(job.apply_url for job in listings)


def test_smartrecruiters_parser_uses_prefetched_detail():
    payload = _load("smartrecruiters.json")
    source = SmartRecruitersSource()
    source._detail_cache = {payload["list"]["content"][0]["id"]: payload["detail"]}
    listings = source.parse(payload["list"], token="T-SystemsICTIndiaPvtLtd1")
    assert len(listings) == len(payload["list"]["content"])
    assert all(job.apply_url for job in listings)


def test_parser_rejects_unusable_payloads():
    with pytest.raises(SourceError):
        GreenhouseSource().parse({})
    with pytest.raises(SourceError):
        LeverSource().parse({"oops": True}, token="t")


# ---------------- india filter ----------------


def test_non_india_listings_are_skipped():
    config = CompanyConfig(name="X", ats="greenhouse", token="t", india_only=True)
    off = RawListing(
        external_id="1",
        title="Remote PM",
        location="Foster City, CA",
        description="Nothing here",
        apply_url="https://x.com/1",
        posted_at=None,
        employment_type=None,
        experience_level_raw=None,
        salary=None,
        deadline=None,
    )
    anchor = RawListing(
        external_id="2",
        title="Backend Engineer",
        location="Bengaluru, India",
        description="Python role",
        apply_url="https://x.com/2",
        posted_at=None,
        employment_type=None,
        experience_level_raw=None,
        salary=None,
        deadline=None,
    )
    from app.scraper.sources import looks_india

    assert looks_india(anchor.location)
    assert not looks_india(off.location)
    assert config.india_only


# ---------------- normalization (LLM + rules, both offline) ----------------


def _listing(**overrides) -> RawListing:
    base = dict(
        external_id="42",
        title="Backend Engineer",
        location="Bengaluru",
        description="We need Python and SQL; Django is a plus. 2 years experience.",
        apply_url="https://boards.greenhouse.io/x/jobs/42",
        posted_at="2026-10-01",
        employment_type="Full-time",
        experience_level_raw=None,
        salary=None,
        deadline=None,
    )
    base.update(overrides)
    return RawListing(**base)


def test_canonical_skills_drops_unknown_names():
    assert canonical_skills(["Python", "quantum flux", "SQL", "Python"]) == ["Python", "SQL"]


def test_rules_normalize_extract_only_taxonomy_skills():
    result = rules_normalize(_listing())
    assert "Python" in result.must_skills or "SQL" in result.must_skills
    assert result.salary is None  # never stated -> never invented


def test_llm_normalization_is_used_and_validated(monkeypatch):
    calls = {}

    def fake_complete_json(prompt, system=None, *, schema_model=None, model=None):
        calls["prompt"] = prompt
        return NormalizedListing(
            must_skills=["Python", "SQL"],
            nice_skills=["Django"],
            experience_level="junior",
            job_type="full-time",
            salary=None,
            deadline=None,
        )

    monkeypatch.setattr("app.scraper.normalize.llm.complete_json", fake_complete_json)
    result = normalize_listing(_listing())
    assert result.must_skills == ["Python", "SQL"]
    assert result.nice_skills == ["Django"]
    assert "Python and SQL" in calls["prompt"]


def test_llm_salary_is_dropped_when_not_in_listing_text(monkeypatch):
    def fake_complete_json(prompt, system=None, *, schema_model=None, model=None):
        return NormalizedListing(salary="Rs 99,00,000", deadline="Nov 30", must_skills=["Python"])

    monkeypatch.setattr("app.scraper.normalize.llm.complete_json", fake_complete_json)
    result = normalize_listing(_listing())
    assert result.salary is None
    assert result.deadline is None


def test_llm_failure_falls_back_to_rules(monkeypatch):
    def fake_complete_json(prompt, system=None, *, schema_model=None, model=None):
        raise llm.LLMUnavailable("mock")

    monkeypatch.setattr("app.scraper.normalize.llm.complete_json", fake_complete_json)
    result = normalize_listing(_listing())
    assert isinstance(result, NormalizedListing)
    assert result.must_skills


def test_invalid_schema_output_falls_back(monkeypatch):
    def fake_complete_json(prompt, system=None, *, schema_model=None, model=None):
        return {"must_skills": "not-a-list"}  # would fail strict validation upstream

    from pydantic import ValidationError

    def raising_fake(prompt, system=None, *, schema_model=None, model=None):
        try:
            schema_model.model_validate_json('{"must_skills": "not-a-list"}')
        except ValidationError as exc:
            raise llm.LLMResponseInvalid(str(exc)) from exc
        raise AssertionError("unreachable")

    monkeypatch.setattr("app.scraper.normalize.llm.complete_json", raising_fake)
    result = normalize_listing(_listing())
    assert result.must_skills  # rules fallback kicked in


# ---------------- verification decisions ----------------


def _verify(url, employer_domains=("example.test",), status=200, exc=None, robots=True):
    if exc:
        fetch = lambda *a, **k: (_ for _ in ()).throw(exc)  # noqa: E731
    else:
        fetch = lambda *a, **k: SimpleNamespace(status=status)  # noqa: E731
    import app.scraper.verify as verify_mod

    def fake_robots(url):  # noqa: ANN001
        return robots

    import unittest.mock as mock

    with mock.patch.object(verify_mod, "robots_allowed", fake_robots):
        return verify_apply_url(url, employer_domains, fetch=fetch)


def test_verified_only_when_trusted_and_200():
    result = _verify("https://boards.greenhouse.io/acme/jobs/1")
    assert result.ok and result.status == 200

    result = _verify("https://careers.example.test/jobs/1", employer_domains=("example.test",))
    assert result.ok


def test_untrusted_host_is_never_verified():
    result = _verify("https://evil.example.io/jobs/1")
    assert not result.ok
    result = _verify("https://jobs-attacker.com/redirect?url=https://boards.greenhouse.io")
    assert not result.ok


def test_non_200_and_fetch_errors_leave_unverified():
    assert not _verify("https://boards.greenhouse.io/acme/jobs/1", status=404).ok
    assert not _verify(
        "https://boards.greenhouse.io/acme/jobs/1", exc=RuntimeError("conn refused")
    ).ok


def test_robots_disallow_blocks_verification():
    assert not _verify("https://boards.greenhouse.io/acme/jobs/1", robots=False).ok


def test_empty_apply_url_unverified():
    result = _verify("")
    assert not result.ok


def test_ssrf_guard_stays_active_via_http_layer(monkeypatch):
    from app.scraper import http as scraper_http

    with pytest.raises(SSRFSecurityError):
        scraper_http.fetch_text("http://127.0.0.1:8000/jobs")


# ---------------- store: dedupe, upsert, freshness ----------------


def _row(source_url, title="Backend Engineer", verified=False, last_verified=None, apply_url=None):
    from app.schemas import Job as JobSchema

    # URL-safe deterministic id (no slashes) so GET /api/jobs/{id} works in tests.
    job_id = re.sub(r"[^a-z0-9]+", "-", source_url.lower()).strip("-")
    schema = JobSchema(
        id=job_id,
        title=title,
        company="Acme",
        location="Bengaluru",
        job_type="full-time",
        experience_level="junior",
        skills_required=["Python"],
        description="Build APIs.",
        source_url=source_url,
        verified=verified,
        last_verified=last_verified,
        apply_url=apply_url,
    )
    return ScrapedJob(
        schema=schema,
        must_skills=["Python"],
        nice_skills=[],
        posted_at="2026-10-01",
    )


CONFIG = CompanyConfig(
    name="Acme",
    ats="greenhouse",
    token="acme",
    employer_domains=("acme.test",),
)


def test_upsert_creates_then_updates_and_dedupes(session):
    first = upsert_jobs(session, CONFIG, [_row("https://jobs.test/a"), _row("https://jobs.test/b")])
    assert first == {"created": 2, "updated": 0, "stale_disabled": 0}

    rows = list(session.scalars(select(Job)))
    assert len(rows) == 2
    first_seen = {r.id: r.first_seen for r in rows}

    got = upsert_jobs(session, CONFIG, [_row("https://jobs.test/a"), _row("https://jobs.test/c")])
    assert got["created"] == 1 and got["updated"] == 1

    rows = list(session.scalars(select(Job)))
    assert len(rows) == 3
    updated = next(r for r in rows if r.source_url == "https://jobs.test/a")
    assert updated.last_scraped_at is not None
    assert all(r.is_active for r in rows)
    assert first_seen  # sanity


def test_stale_listings_hidden_after_14_days(session):
    upsert_jobs(session, CONFIG, [_row("https://jobs.test/a"), _row("https://jobs.test/b")])
    # Age one row past the cutoff by rewriting last_scraped_at.
    row = session.scalar(select(Job).where(Job.source_url == "https://jobs.test/b"))
    stale_cutoff = dt.datetime(2026, 10, 1, tzinfo=dt.UTC)
    row.last_scraped_at = stale_cutoff
    session.commit()

    stats = upsert_jobs(session, CONFIG, [_row("https://jobs.test/a")])
    assert stats["stale_disabled"] == 1
    survivor = session.scalar(select(Job).where(Job.source_url == "https://jobs.test/b"))
    assert survivor.is_active is False  # hidden, not deleted


def test_company_row_created_and_linked(session):
    upsert_jobs(session, CONFIG, [_row("https://jobs.test/a")])
    company = session.scalar(select(Company).where(Company.name == "Acme"))
    assert company is not None
    assert company.ats_type == "greenhouse"
    jobs = list(company.jobs)
    assert len(jobs) == 1


# ---------------- run pipeline (offline, dry-run vs persist) ----------------


class OfflineRunner:
    """Harness: replaces fetches + LLM so run_single_source runs without network."""

    @staticmethod
    def install(monkeypatch, payload_fixture, listing_apply_urls):
        payload = _load(payload_fixture)
        listings = GreenhouseSource().parse(payload)

        monkeypatch.setattr(
            "app.scraper.runner.source_for",
            lambda ats: SimpleNamespace(
                url=lambda token: (
                    f"https://boards-api.greenhouse.io/v1/boards/{token}/jobs?content=true"
                ),
                parse=lambda p, token=None: listings,
            ),
        )
        monkeypatch.setattr(
            "app.scraper.runner.fetch_text",
            lambda url: SimpleNamespace(status=200, json=lambda: payload),
        )
        monkeypatch.setattr(
            "app.scraper.runner.verify_apply_url",
            lambda url, domains, **kw: SimpleNamespace(ok=True, status=200, reason="ok"),
        )
        monkeypatch.setattr("app.scraper.runner.normalize_listing", rules_normalize)
        return listings


def test_full_pipeline_persists_verified_rows(session, monkeypatch):
    OfflineRunner.install(monkeypatch, "greenhouse.json", None)

    from app.scraper.runner import run_single_source

    report = run_single_source(session, CONFIG)
    assert report.accepted >= 1
    assert report.created == report.accepted
    rows = list(session.scalars(select(Job)))
    assert rows
    # Verification harness said ok -> rows must be verified with today's date.
    assert any(r.verified and r.last_verified == dt.date.today() for r in rows)
    assert all(r.company_id for r in rows)


def test_dry_run_persists_nothing(session, monkeypatch):
    OfflineRunner.install(monkeypatch, "greenhouse.json", None)

    from app.scraper.runner import run_single_source

    report = run_single_source(session, CONFIG, dry_run=True)
    assert report.accepted >= 1
    assert session.scalar(select(Job)) is None  # nothing persisted
    assert session.scalar(select(Company)) is None


def test_failing_source_is_skipped_not_invented(session, monkeypatch):
    from app.scraper.runner import run_single_source

    monkeypatch.setattr(
        "app.scraper.runner.fetch_text", lambda url: (_ for _ in ()).throw(RuntimeError("boom"))
    )
    report = run_single_source(session, CONFIG)
    assert report.accepted == 0
    assert report.errors
    assert session.scalar(select(Job)) is None  # no invented fallback rows


# ---------------- admin API ----------------


def _patch_admin_token(monkeypatch, token):
    """Replace the settings object inside the admin route module (restored auto)."""
    monkeypatch.setattr("app.api.routes.admin.settings", SimpleNamespace(admin_token=token))


def _admin_headers(token=None):
    return {"x-admin-token": token} if token else {}


def test_admin_scrape_requires_configuration(monkeypatch, session):
    _patch_admin_token(monkeypatch, "")
    client = TestClient(app)
    res = client.post("/api/admin/scrape", json={"dry_run": True})
    assert res.status_code == 503


def test_admin_scrape_rejects_bad_token(monkeypatch):
    _patch_admin_token(monkeypatch, "sekrit")
    client = TestClient(app)
    res = client.post("/api/admin/scrape", json={"dry_run": True}, headers=_admin_headers("wrong"))
    assert res.status_code == 401


def test_admin_scrape_runs_dry_run_only(monkeypatch):
    _patch_admin_token(monkeypatch, "sekrit")
    # The route resolves load_companies from its own namespace, so patch there.
    import app.api.routes.admin as admin_mod

    monkeypatch.setattr(admin_mod, "load_companies", lambda: [CONFIG])
    ran = {}

    def fake_run_scrape(session, companies, *, dry_run=False):
        ran["dry_run"] = dry_run
        ran["companies"] = companies
        from app.scraper.runner import RunReport, SourceReport

        return RunReport(
            started_at="2026-10-23T00:00:00Z",
            dry_run=dry_run,
            sources=[SourceReport(company="Acme", ats="greenhouse", verified=3)],
        )

    import app.api.routes.admin as admin_mod

    monkeypatch.setattr(admin_mod, "run_scrape", fake_run_scrape)
    client = TestClient(app)
    res = client.post(
        "/api/admin/scrape",
        json={"company": "Acme", "dry_run": True},
        headers=_admin_headers("sekrit"),
    )
    assert res.status_code == 200
    body = res.json()
    assert body["dry_run"] is True
    assert body["sources"][0]["verified"] == 3
    assert ran["dry_run"] is True
    assert "sekrit" not in json.dumps(body)


def test_admin_scrape_unknown_company_is_404(monkeypatch):
    _patch_admin_token(monkeypatch, "sekrit")
    import app.api.routes.admin as admin_mod

    monkeypatch.setattr(admin_mod, "load_companies", lambda: [CONFIG])
    client = TestClient(app)
    res = client.post(
        "/api/admin/scrape", json={"company": "Nobody"}, headers=_admin_headers("sekrit")
    )
    assert res.status_code == 404


# ---------------- jobs API: DB-first with file fallback ----------------


def test_jobs_api_prefers_db_rows(session, monkeypatch):
    upsert_jobs(
        session,
        CONFIG,
        [
            _row(
                "https://jobs.test/db1",
                verified=True,
                last_verified="2026-10-23",
                apply_url="https://jobs.test/db1",
            )
        ],
    )
    from app.core.db import get_session

    app.dependency_overrides[get_session] = lambda: session
    try:
        client = TestClient(app)
        res = client.get("/api/jobs")
        assert res.status_code == 200
        jobs = res.json()
        assert any(
            j["id"].startswith("greenhouse-acme") or j["source_url"] == "https://jobs.test/db1"
            for j in jobs
        )
        assert all(
            j.get("apply_url") is not None
            for j in jobs
            if j["source_url"] == "https://jobs.test/db1"
        )
    finally:
        app.dependency_overrides.pop(get_session, None)


def test_jobs_api_falls_back_to_file_store(session, monkeypatch):
    from app.core.db import get_session

    app.dependency_overrides[get_session] = lambda: session  # empty DB
    try:
        client = TestClient(app)
        res = client.get("/api/jobs", params={"verified_only": "false"})
        assert res.status_code == 200
        jobs = res.json()
        assert jobs, "file fallback must still serve the curated dataset"
        assert all("apply_url" not in j or j["apply_url"] is None for j in jobs[:5])
    finally:
        app.dependency_overrides.pop(get_session, None)


def test_job_detail_from_db(session, monkeypatch):
    upsert_jobs(
        session,
        CONFIG,
        [_row("https://jobs.test/dbx", apply_url="https://jobs.test/dbx")],
    )
    row = session.scalar(select(Job).where(Job.source_url == "https://jobs.test/dbx"))
    from app.core.db import get_session

    app.dependency_overrides[get_session] = lambda: session
    try:
        client = TestClient(app)
        res = client.get(f"/api/jobs/{row.id}")
        assert res.status_code == 200
        assert res.json()["apply_url"] == "https://jobs.test/dbx"
        res = client.get("/api/jobs/definitely-missing-zz")
        assert res.status_code == 404
    finally:
        app.dependency_overrides.pop(get_session, None)
