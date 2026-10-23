"""apply_url verification (Task 4 rules).

A listing may only be marked `verified=true, last_verified=<today>` when:
1. The URL's host is the employer's domain (or subdomain), or a recognized ATS
   page host. Redirect targets outside these hosts are rejected.
2. The page fetches successfully with HTTP 200.
3. robots.txt of the page host allows our User-Agent.

Conversely, a syntactically valid URL is never treated as verified: network
errors, non-200 responses and disallowed hosts all leave the listing
`verified=false` (and are logged), never hidden behind a fake checkmark.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from urllib.parse import urlsplit

from app.scraper.http import fetch_text, robots_allowed

logger = logging.getLogger(__name__)

# Recognized ATS page hosts (board APIs live elsewhere; page hosts only).
ATS_PAGE_HOSTS: frozenset[str] = frozenset(
    {
        "boards.greenhouse.io",
        "job-boards.greenhouse.io",
        "jobs.lever.co",
        "jobs.ashbyhq.com",
        "jobs.smartrecruiters.com",
    }
)


@dataclass(frozen=True)
class VerificationResult:
    ok: bool
    status: int | None
    reason: str


def _host_allowed(url: str, employer_domains: tuple[str, ...]) -> bool:
    host = (urlsplit(url).netloc or "").lower().removeprefix("www.")
    if not host:
        return False
    if host in ATS_PAGE_HOSTS or host.endswith(".greenhouse.io"):
        return True
    for domain in employer_domains:
        if host == domain or host.endswith(f".{domain}"):
            return True
    return False


def verify_apply_url(
    url: str,
    employer_domains: tuple[str, ...],
    *,
    fetch: object = None,
) -> VerificationResult:
    """Verify one apply_url. `fetch` is injectable for tests (fetch_text-like)."""
    if not url:
        return VerificationResult(ok=False, status=None, reason="Missing apply_url.")
    if not _host_allowed(url, employer_domains):
        return VerificationResult(ok=False, status=None, reason=f"Untrusted host for {url}")
    if not robots_allowed(url):
        return VerificationResult(ok=False, status=None, reason=f"robots.txt disallows {url}")

    do_fetch = fetch or fetch_text
    try:
        response = do_fetch(url)  # type: ignore[operator]
        status = int(response.status)
    except Exception as exc:  # noqa: BLE001 - every failure means "not verified"
        return VerificationResult(ok=False, status=None, reason=f"Fetch failed: {exc}")

    if status != 200:
        return VerificationResult(ok=False, status=status, reason=f"HTTP {status} (not 200).")
    return VerificationResult(ok=True, status=200, reason="verified")
