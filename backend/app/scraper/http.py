"""HTTP fetching for the scraper (Scrapling `Fetcher`, plain HTTP only).

- Identifying User-Agent on every request (never spoofed as Googlebot-like
  traffic; scrapling's default referer behaviour is accepted for board APIs).
- Per-host throttle: at least `SCRAPER_REQUEST_INTERVAL` seconds between
  requests to the same host. Concurrency stays at one worker (well below the
  two-worker cap) so a single process run is trivially compliant.
- Public board APIs are fetched directly from their documented JSON endpoints;
  page fetches (apply_url verification) additionally consult robots.txt for the
  page's host and skip when disallowed.
- URLs are validated with the SSRF guard from Teammate B's link checker before
  any request is issued (reading/using that module is fine; we never modify it).

This module is the single seam that tests monkeypatch; nothing else in the
scraper performs network I/O.
"""

from __future__ import annotations

import html
import logging
import re
import threading
import time
import urllib.robotparser
from dataclasses import dataclass
from urllib.parse import urlsplit

from app.core.config import settings
from app.services.jobs.link_check import validate_url_security

logger = logging.getLogger(__name__)

_TAG_RE = re.compile(r"<[^>]+>")
_WHITESPACE_RE = re.compile(r"\s+")


@dataclass(frozen=True)
class FetchResult:
    status: int
    body: str  # text or JSON-in-string form

    def json(self) -> object:
        import json

        return json.loads(self.body)


_lock = threading.Lock()
_last_request_at: dict[str, float] = {}
_robots_cache: dict[str, urllib.robotparser.RobotFileParser] = {}


def _throttle(host: str) -> None:
    interval = settings.scraper_request_interval
    with _lock:
        last = _last_request_at.get(host)
        now = time.monotonic()
        wait = interval if last is None else max(0.0, last + interval - now)
        if wait > 0:
            time.sleep(wait)
        _last_request_at[host] = time.monotonic()


def fetch_text(url: str, *, timeout: float | None = None) -> FetchResult:
    """GET a URL with the identifying UA and per-host throttling.

    Raises RuntimeError on network failures and ValueError on SSRF-unsafe URLs.
    Tests patch this function at the `app.scraper.http` boundary.
    """
    validate_url_security(url)  # SSRF-safe hosts only; raises before connecting
    from scrapling.fetchers import Fetcher

    _throttle(urlsplit(url).netloc)
    response = Fetcher.get(
        url,
        headers={"User-Agent": settings.scraper_user_agent},
        timeout=timeout or settings.scraper_timeout,
        retries=1,
        retry_delay=2,
        follow_redirects=True,
    )
    body = response.body if response.body else (response.text or "")
    if isinstance(body, bytes):
        body = body.decode(response.encoding or "utf-8", errors="replace")
    return FetchResult(status=response.status, body=body)


def robots_allowed(url: str) -> bool:
    """robots.txt consent for page fetches. Unreachable robots.txt = allow."""
    parts = urlsplit(url)
    base = f"{parts.scheme}://{parts.netloc}"
    if base in _robots_cache:
        return _robots_cache[base].can_fetch(settings.scraper_user_agent, url)
    parser = urllib.robotparser.RobotFileParser()
    try:
        parser.read(f"{base}/robots.txt")
    except Exception as exc:  # noqa: BLE001 - robots must never block a legit run
        logger.debug("robots.txt unreadable for %s (%s); allowing.", base, exc)
        _robots_cache[base] = parser
        return True
    _robots_cache[base] = parser
    return parser.can_fetch(settings.scraper_user_agent, url)


def strip_html(markup: str) -> str:
    """Plain-text extraction: tags removed, entities unescaped, whitespace folded."""
    text = html.unescape(_TAG_RE.sub(" ", markup or ""))
    return _WHITESPACE_RE.sub(" ", text).strip()
