"""Manual job listing link checker with SSRF protection (owner: Teammate B).

Checks HTTP/HTTPS reachability of job source URLs without modifying dataset
records or asserting active vacancy verification. Diagnostic only.
"""

from __future__ import annotations

import argparse
import ipaddress
import socket
import sys
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import asdict, dataclass
from typing import Any
from urllib.parse import urlsplit

from app.schemas import Job
from app.services.jobs.service import list_jobs

# Default timeouts (seconds)
DEFAULT_TIMEOUT: float = 8.0
MAX_REDIRECTS: int = 5
DEFAULT_USER_AGENT: str = (
    "CareerBridge-LinkChecker/1.0 (+https://github.com/Vineethsn-007/CareerBridge)"
)


@dataclass(frozen=True)
class LinkCheckResult:
    job_id: str
    job_title: str
    source_url: str
    status: str  # "ok", "error", "blocked"
    status_code: int | None
    error_reason: str | None
    is_active_vacancy_proven: bool = False  # Always False per contract requirements

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class SSRFSecurityError(ValueError):
    """Raised when a URL targets a private, loopback, or non-public IP or invalid scheme."""


def is_safe_ip(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    """Return True if IP is a globally reachable public address, False otherwise."""
    return not (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_multicast
        or ip.is_reserved
        or ip.is_unspecified
    )


def validate_url_security(url: str) -> tuple[str, list[str]]:
    """Validate URL scheme, credentials, and resolved IP addresses.

    Returns (normalized_url, resolved_ip_addresses) if safe.
    Raises SSRFSecurityError or ValueError if unsafe.
    """
    if not url or not isinstance(url, str):
        raise SSRFSecurityError("Empty or invalid URL")

    parsed = urlsplit(url)

    # 1. Scheme check: only http and https permitted
    if parsed.scheme.lower() not in {"http", "https"}:
        raise SSRFSecurityError(
            f"Unsupported URL scheme: {parsed.scheme!r}. Only HTTP/HTTPS allowed."
        )

    # 2. Reject credentials embedded in URL (user:pass@host)
    if parsed.username or parsed.password:
        raise SSRFSecurityError("Embedded credentials in URL are prohibited.")

    hostname = parsed.hostname
    if not hostname:
        raise SSRFSecurityError("Missing hostname in URL.")

    # 3. Check raw IP literal first before DNS resolution
    raw_ip = None
    try:
        raw_ip = ipaddress.ip_address(hostname)
    except ValueError:
        pass

    if raw_ip is not None:
        if not is_safe_ip(raw_ip):
            raise SSRFSecurityError(f"Target IP address is non-public or prohibited: {raw_ip}")
        return url, [str(raw_ip)]

    # Resolve via DNS
    try:
        port = parsed.port or (443 if parsed.scheme.lower() == "https" else 80)
        addr_info = socket.getaddrinfo(hostname, port, type=socket.SOCK_STREAM)
        resolved_ips: list[str] = []
        for item in addr_info:
            ip_str = item[4][0]
            resolved_ips.append(ip_str)
            ip_obj = ipaddress.ip_address(ip_str)
            if not is_safe_ip(ip_obj):
                raise SSRFSecurityError(
                    f"Resolved IP for {hostname!r} is non-public or prohibited: {ip_str}"
                )
    except socket.gaierror as exc:
        raise ConnectionError(f"DNS resolution failure for host {hostname!r}: {exc}") from exc

    if not resolved_ips:
        raise ConnectionError(f"No IP addresses resolved for host {hostname!r}")

    return url, resolved_ips


def check_single_url(
    job_id: str,
    job_title: str,
    url: str,
    timeout: float = DEFAULT_TIMEOUT,
    max_redirects: int = MAX_REDIRECTS,
) -> LinkCheckResult:
    """Safely check URL reachability with redirect revalidation and SSRF protection."""
    current_url = url
    redirect_count = 0

    while True:
        try:
            validate_url_security(current_url)
        except SSRFSecurityError as sec_err:
            return LinkCheckResult(
                job_id=job_id,
                job_title=job_title,
                source_url=url,
                status="blocked",
                status_code=None,
                error_reason=f"Security check blocked request: {sec_err}",
            )
        except ConnectionError as dns_err:
            return LinkCheckResult(
                job_id=job_id,
                job_title=job_title,
                source_url=url,
                status="error",
                status_code=None,
                error_reason=str(dns_err),
            )
        except Exception as exc:
            return LinkCheckResult(
                job_id=job_id,
                job_title=job_title,
                source_url=url,
                status="error",
                status_code=None,
                error_reason=f"URL validation error: {exc}",
            )

        # Build request with HEAD first, fallback to GET if HEAD method not allowed (405)
        # We handle redirects manually so we can revalidate each hop
        class NoRedirectHandler(urllib.request.HTTPRedirectHandler):
            def redirect_request(self, req, fp, code, msg, headers, newurl):
                # Intercept redirect: return None to prevent automatic following
                return None

        opener = urllib.request.build_opener(NoRedirectHandler)

        req = urllib.request.Request(
            current_url,
            method="HEAD",
            headers={
                "User-Agent": DEFAULT_USER_AGENT,
                "Accept": "*/*",
            },
        )

        try:
            with opener.open(req, timeout=timeout) as resp:
                status_code = resp.status
                return LinkCheckResult(
                    job_id=job_id,
                    job_title=job_title,
                    source_url=url,
                    status="ok" if status_code < 400 else "error",
                    status_code=status_code,
                    error_reason=None,
                )
        except urllib.error.HTTPError as http_err:
            status_code = http_err.code

            # Handle redirects manually
            if status_code in {301, 302, 303, 307, 308}:
                redirect_count += 1
                if redirect_count > max_redirects:
                    return LinkCheckResult(
                        job_id=job_id,
                        job_title=job_title,
                        source_url=url,
                        status="error",
                        status_code=status_code,
                        error_reason=f"Exceeded max redirects ({max_redirects})",
                    )
                location = http_err.headers.get("Location")
                if not location:
                    return LinkCheckResult(
                        job_id=job_id,
                        job_title=job_title,
                        source_url=url,
                        status="error",
                        status_code=status_code,
                        error_reason=f"HTTP {status_code} redirect without Location header",
                    )
                # Resolve relative redirects safely
                current_url = urllib.parse.urljoin(current_url, location)
                continue

            # Some servers reject HEAD with 405 Method Not Allowed; retry once with GET
            if status_code == 405:
                try:
                    get_req = urllib.request.Request(
                        current_url,
                        method="GET",
                        headers={"User-Agent": DEFAULT_USER_AGENT, "Accept": "*/*"},
                    )
                    with opener.open(get_req, timeout=timeout) as get_resp:
                        return LinkCheckResult(
                            job_id=job_id,
                            job_title=job_title,
                            source_url=url,
                            status="ok" if get_resp.status < 400 else "error",
                            status_code=get_resp.status,
                            error_reason=None,
                        )
                except urllib.error.HTTPError as get_http_err:
                    if get_http_err.code in {301, 302, 303, 307, 308}:
                        redirect_count += 1
                        location = get_http_err.headers.get("Location")
                        if location and redirect_count <= max_redirects:
                            current_url = urllib.parse.urljoin(current_url, location)
                            continue
                    return LinkCheckResult(
                        job_id=job_id,
                        job_title=job_title,
                        source_url=url,
                        status="error",
                        status_code=get_http_err.code,
                        error_reason=f"HTTP Error {get_http_err.code}: {get_http_err.reason}",
                    )
                except Exception as get_exc:
                    return LinkCheckResult(
                        job_id=job_id,
                        job_title=job_title,
                        source_url=url,
                        status="error",
                        status_code=None,
                        error_reason=str(get_exc),
                    )

            return LinkCheckResult(
                job_id=job_id,
                job_title=job_title,
                source_url=url,
                status="error",
                status_code=status_code,
                error_reason=f"HTTP Error {status_code}: {http_err.reason}",
            )
        except urllib.error.URLError as url_err:
            reason = url_err.reason
            if isinstance(reason, socket.timeout) or "timed out" in str(reason).lower():
                return LinkCheckResult(
                    job_id=job_id,
                    job_title=job_title,
                    source_url=url,
                    status="error",
                    status_code=None,
                    error_reason=f"Connection timed out ({timeout}s)",
                )
            return LinkCheckResult(
                job_id=job_id,
                job_title=job_title,
                source_url=url,
                status="error",
                status_code=None,
                error_reason=f"Network connection error: {reason}",
            )
        except TimeoutError:
            return LinkCheckResult(
                job_id=job_id,
                job_title=job_title,
                source_url=url,
                status="error",
                status_code=None,
                error_reason=f"Connection timed out ({timeout}s)",
            )
        except Exception as exc:
            return LinkCheckResult(
                job_id=job_id,
                job_title=job_title,
                source_url=url,
                status="error",
                status_code=None,
                error_reason=f"Unexpected error: {type(exc).__name__}: {exc}",
            )


def check_job_links(
    jobs: list[Job] | None = None,
    timeout: float = DEFAULT_TIMEOUT,
    max_redirects: int = MAX_REDIRECTS,
) -> list[LinkCheckResult]:
    """Check links for provided jobs (or all loaded jobs if None provided).

    Diagnostic only: does NOT modify jobs or mark vacancies active.
    """
    if jobs is None:
        jobs = list_jobs(verified_only=False)

    results: list[LinkCheckResult] = []
    for job in jobs:
        res = check_single_url(
            job_id=job.id,
            job_title=job.title,
            url=job.source_url,
            timeout=timeout,
            max_redirects=max_redirects,
        )
        results.append(res)
    return results


def print_summary_report(results: list[LinkCheckResult], file=sys.stdout) -> None:
    """Print human-readable diagnostic report."""
    total = len(results)
    ok_count = sum(1 for r in results if r.status == "ok")
    blocked_count = sum(1 for r in results if r.status == "blocked")
    err_count = sum(1 for r in results if r.status == "error")

    print("=" * 78, file=file)
    print("CAREERBRIDGE MANUAL JOB LINK CHECKER (DIAGNOSTIC REPORT)", file=file)
    print("=" * 78, file=file)
    print(
        "NOTE: A reachable HTTP response (status 'ok') indicates network availability\n"
        "only and does NOT prove that an individual job vacancy is active or open.",
        file=file,
    )
    print("-" * 78, file=file)
    print(f"Total links inspected: {total}", file=file)
    print(f"Reachable (status 'ok'): {ok_count}", file=file)
    print(f"Blocked by security:     {blocked_count}", file=file)
    print(f"Errors / unreachable:    {err_count}", file=file)
    print("-" * 78, file=file)

    for r in results:
        code_str = str(r.status_code) if r.status_code is not None else "---"
        status_tag = f"[{r.status.upper()}] (HTTP {code_str})"
        print(f"{status_tag:<22} {r.job_id} | {r.job_title}", file=file)
        print(f"  URL: {r.source_url}", file=file)
        if r.error_reason:
            print(f"  Reason: {r.error_reason}", file=file)
    print("=" * 78, file=file)


def main(argv: list[str] | None = None) -> int:
    """CLI entry point for manual link checker invocation."""
    parser = argparse.ArgumentParser(
        description="Manual diagnostic link checker for CareerBridge job listings"
    )
    parser.add_argument(
        "--job-id",
        type=str,
        default=None,
        help="Optional specific job ID to check (checks all if omitted)",
    )
    parser.add_argument(
        "--timeout",
        type=float,
        default=DEFAULT_TIMEOUT,
        help=f"Per-request timeout in seconds (default: {DEFAULT_TIMEOUT})",
    )
    parser.add_argument(
        "--max-redirects",
        type=int,
        default=MAX_REDIRECTS,
        help=f"Maximum allowed redirects (default: {MAX_REDIRECTS})",
    )
    args = parser.parse_args(argv)

    all_jobs = list_jobs(verified_only=False)
    if args.job_id:
        jobs_to_check = [j for j in all_jobs if j.id == args.job_id]
        if not jobs_to_check:
            print(f"Error: Job ID {args.job_id!r} not found in dataset.", file=sys.stderr)
            return 1
    else:
        jobs_to_check = all_jobs

    results = check_job_links(
        jobs=jobs_to_check,
        timeout=args.timeout,
        max_redirects=args.max_redirects,
    )
    print_summary_report(results, file=sys.stdout)
    return 0


if __name__ == "__main__":
    sys.exit(main())
