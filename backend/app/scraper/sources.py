"""Source parsers: real listings from the four verified public ATS board APIs.

Every field a listing carries comes straight from the API response; URLs are
either API-provided (`applyUrl`, `hostedUrl`, `absolute_url`, `postingUrl`) or
built from API-provided ids using the ATS's documented URL pattern. Nothing is
guessed or synthesized.

Each parser gets JSON already fetched via `app.scraper.http.fetch_text`; tests
feed saved fixtures and never touch the network.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from app.core.db import UTC
from app.scraper.http import strip_html

INDIA_MARKERS = (
    "india",
    "bengaluru",
    "bangalore",
    "pune",
    "hyderabad",
    "chennai",
    "gurgaon",
    "gurugram",
    "noida",
    "mumbai",
    "kolkata",
)


@dataclass(frozen=True)
class RawListing:
    external_id: str
    title: str
    location: str
    description: str  # plain text, not HTML
    apply_url: str
    posted_at: str | None
    employment_type: str | None
    experience_level_raw: str | None
    salary: str | None
    deadline: str | None


def looks_india(*parts: str | None) -> bool:
    haystack = " ".join(p for p in parts if p).lower()
    return any(marker in haystack for marker in INDIA_MARKERS)


def _iso_from_ms(ms: float | None) -> str | None:
    if not ms:
        return None
    return datetime.fromtimestamp(ms / 1000, tz=UTC).strftime("%Y-%m-%d")


def _strip(value: Any) -> str:
    return str(value).strip() if value is not None else ""


class SourceError(RuntimeError):
    """Raised when a board API returns an unusable payload."""


class GreenhouseSource:
    """boards-api.greenhouse.io/v1/boards/{token}/jobs?content=true."""

    def parse(self, payload: Any, token: str | None = None) -> list[RawListing]:
        jobs = (payload or {}).get("jobs")
        if not isinstance(jobs, list):
            raise SourceError("Greenhouse payload missing 'jobs' list.")
        listings: list[RawListing] = []
        for job in jobs:
            jid = _strip(job.get("id"))
            title = _strip(job.get("title"))
            if not jid or not title:
                continue
            location = _strip((job.get("location") or {}).get("name"))
            content = _strip(job.get("content"))
            listings.append(
                RawListing(
                    external_id=jid,
                    title=title,
                    location=location,
                    description=strip_html(content) if content else "",
                    apply_url=_strip(job.get("absolute_url")),
                    posted_at=_strip(job.get("updated_at")) or None,
                    employment_type=None,
                    experience_level_raw=None,
                    salary=None,
                    deadline=None,
                )
            )
        return listings

    def url(self, token: str) -> str:
        return f"https://boards-api.greenhouse.io/v1/boards/{token}/jobs?content=true"


class LeverSource:
    """api.lever.co/v0/postings/{token}?mode=json."""

    def parse(self, payload: Any, token: str | None = None) -> list[RawListing]:
        jobs = payload
        if not isinstance(jobs, list):
            raise SourceError("Lever payload is not a postings list.")
        listings: list[RawListing] = []
        for job in jobs:
            jid = _strip(job.get("id"))
            title = _strip(job.get("text"))
            if not jid or not title:
                continue
            categories = job.get("categories") or {}
            description = _strip(job.get("descriptionPlain")) or _strip(
                job.get("descriptionBodyPlain")
            )
            listings.append(
                RawListing(
                    external_id=jid,
                    title=title,
                    location=_strip(categories.get("location")),
                    description=description,
                    apply_url=_strip(job.get("applyUrl")) or _strip(job.get("hostedUrl")),
                    posted_at=_iso_from_ms(job.get("createdAt")),
                    employment_type=_strip(categories.get("commitment")) or None,
                    experience_level_raw=None,
                    salary=None,
                    deadline=None,
                )
            )
        return listings

    def url(self, token: str) -> str:
        return f"https://api.lever.co/v0/postings/{token}?mode=json"


class AshbySource:
    """api.ashbyhq.com/posting-api/job-board/{token} (GET with browser/UA header)."""

    def parse(self, payload: Any, token: str | None = None) -> list[RawListing]:
        jobs = (payload or {}).get("jobs")
        if not isinstance(jobs, list):
            raise SourceError("Ashby payload missing 'jobs' list.")
        listings: list[RawListing] = []
        for job in jobs:
            if job.get("isListed") is False:
                continue
            jid = _strip(job.get("id"))
            title = _strip(job.get("title"))
            if not jid or not title:
                continue
            description = _strip(job.get("descriptionHtml")) or _strip(job.get("descriptionPlain"))
            listings.append(
                RawListing(
                    external_id=jid,
                    title=title,
                    location=_strip(job.get("location")),
                    description=description
                    if job.get("descriptionPlain")
                    else strip_html(description),
                    apply_url=_strip(job.get("applyUrl")) or _strip(job.get("jobUrl")),
                    posted_at=_strip(job.get("publishedAt")) or None,
                    employment_type=_strip(job.get("employmentType")) or None,
                    experience_level_raw=None,
                    salary=None,
                    deadline=None,
                )
            )
        return listings

    def url(self, token: str) -> str:
        return f"https://api.ashbyhq.com/posting-api/job-board/{token}"


class SmartRecruitersSource:
    """api.smartrecruiters.com/v1/companies/{company}/postings (+ detail for text)."""

    def __init__(self) -> None:
        self._detail_cache: dict[str, Any] = {}

    def url(self, token: str) -> str:
        return f"https://api.smartrecruiters.com/v1/companies/{token}/postings"

    def load_details(self, token: str, listing_ids: list[str]) -> None:
        """Fetch one detail payload per listing (description + applyUrl).

        Kept separate from `parse` so tests can pre-load details from the fixture
        with zero HTTP traffic.
        """
        for pid in listing_ids:
            if pid in self._detail_cache:
                continue
            from app.scraper.http import fetch_text

            response = fetch_text(self.detail_url(token, pid))
            if response.status != 200:
                continue
            self._detail_cache[pid] = response.json()

    def parse(self, payload: Any, token: str | None = None) -> list[RawListing]:
        content = (payload or {}).get("content")
        if not isinstance(content, list):
            raise SourceError("SmartRecruiters payload missing 'content' list.")
        listings: list[RawListing] = []
        for posting in content:
            jid = _strip(posting.get("id"))
            title = _strip(posting.get("name"))
            if not jid or not title:
                continue
            detail = self._detail_cache.get(jid, {})
            location = posting.get("location") or {}
            job_city = _strip(location.get("city"))
            job_country = _strip(location.get("country"))
            job_region = _strip(location.get("region"))
            ad = detail.get("jobAd") or {}
            sections = ad.get("sections") or {}
            description = " ".join(
                strip_html(section.get("text") or section.get("title") or "")
                for section in sections.values()
                if isinstance(section, dict)
            ).strip()
            if not description:
                description = strip_html(_strip(ad.get("brandedPlacementTop")))
            apply_url = _strip(detail.get("applyUrl")) or _strip(detail.get("postingUrl"))
            if not apply_url and token:
                # Canonical id-based posting URL; the ATS redirects it to the
                # slug form, which apply_url verification follows safely.
                apply_url = f"https://jobs.smartrecruiters.com/{token}/{jid}"
            exp_raw = posting.get("experienceLevel") or {}
            employ_type = posting.get("typeOfEmployment") or {}
            salary = detail.get("salary")
            salary_text = None
            if isinstance(salary, dict):
                minimum, maximum, currency = (
                    salary.get("minAmount"),
                    salary.get("maxAmount"),
                    salary.get("currency"),
                )
                if minimum or maximum:
                    salary_text = f"{currency or ''} {minimum or '?'}-{maximum or '?'}".strip()
            listings.append(
                RawListing(
                    external_id=jid,
                    title=title,
                    location=", ".join(p for p in (job_city, job_region) if p) or job_country,
                    description=description,
                    apply_url=apply_url,
                    posted_at=_strip(posting.get("releasedDate")) or None,
                    employment_type=_strip(employ_type.get("id")) or None,
                    experience_level_raw=_strip(exp_raw.get("id")) or None,
                    salary=salary_text,
                    deadline=None,
                )
            )
        return listings

    def list_url(self, token: str, limit: int) -> str:
        return f"https://api.smartrecruiters.com/v1/companies/{token}/postings?limit={limit}"

    def detail_url(self, token: str, posting_id: str) -> str:
        return f"https://api.smartrecruiters.com/v1/companies/{token}/postings/{posting_id}"


_SOURCES = {
    "greenhouse": GreenhouseSource(),
    "lever": LeverSource(),
    "ashby": AshbySource(),
    "smartrecruiters": SmartRecruitersSource(),
}


def source_for(ats: str):
    source = _SOURCES.get(ats)
    if source is None:
        raise SourceError(f"No parser wired for ATS type {ats!r}.")
    return source
