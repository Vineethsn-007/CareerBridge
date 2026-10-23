"""Unit tests for manual job listing link checker (owner: Teammate B).

All network interactions are strictly mocked. No external websites contacted.
"""

from __future__ import annotations

import socket
import urllib.error
from unittest.mock import MagicMock, patch

import pytest

from app.core.config import settings
from app.schemas import Job
from app.services.jobs.link_check import (
    SSRFSecurityError,
    check_job_links,
    check_single_url,
    main,
    validate_url_security,
)


def _make_dummy_job(
    job_id: str = "test-job-001",
    title: str = "Test Developer",
    url: str = "https://example-careers.org/job/1",
) -> Job:
    return Job(
        id=job_id,
        title=title,
        company="Acme Corp",
        location="Bengaluru",
        job_type="full-time",
        experience_level="fresher",
        skills_required=["Python"],
        description="Test role description",
        source_url=url,
        verified=False,
        last_verified=None,
    )


def _mock_dns_public(hostname, port, type=socket.SOCK_STREAM):
    """Mock socket.getaddrinfo returning a public IP."""
    return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", port))]


def _mock_dns_private(hostname, port, type=socket.SOCK_STREAM):
    """Mock socket.getaddrinfo returning a private IP."""
    return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("192.168.1.100", port))]


def _mock_dns_loopback(hostname, port, type=socket.SOCK_STREAM):
    """Mock socket.getaddrinfo returning a loopback IP."""
    return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("127.0.0.1", port))]


# ---------------- Security & SSRF Validation Tests ----------------


def test_validate_url_security_accepts_public_url():
    with patch("socket.getaddrinfo", side_effect=_mock_dns_public):
        url, ips = validate_url_security("https://careers.google.com/jobs")
        assert url == "https://careers.google.com/jobs"
        assert "93.184.216.34" in ips


def test_validate_url_security_rejects_unsupported_scheme():
    for bad_scheme in ["ftp://files.example.com", "file:///etc/passwd", "gopher://bad"]:
        with pytest.raises(SSRFSecurityError, match="Unsupported URL scheme"):
            validate_url_security(bad_scheme)


def test_validate_url_security_rejects_embedded_credentials():
    with pytest.raises(SSRFSecurityError, match="Embedded credentials"):
        validate_url_security("https://user:password@legit-site.com/jobs")


def test_validate_url_security_rejects_loopback_ip_literal():
    with pytest.raises(SSRFSecurityError, match="non-public or prohibited"):
        validate_url_security("http://127.0.0.1/admin")


def test_validate_url_security_rejects_private_ip_literal():
    for private_ip in ["10.0.0.1", "172.16.0.5", "192.168.1.1", "169.254.169.254"]:
        with pytest.raises(SSRFSecurityError, match="non-public or prohibited"):
            validate_url_security(f"http://{private_ip}/status")


def test_validate_url_security_rejects_hostname_resolving_to_private_or_loopback():
    with patch("socket.getaddrinfo", side_effect=_mock_dns_private):
        with pytest.raises(SSRFSecurityError, match="is non-public or prohibited"):
            validate_url_security("https://internal.corp/careers")

    with patch("socket.getaddrinfo", side_effect=_mock_dns_loopback):
        with pytest.raises(SSRFSecurityError, match="is non-public or prohibited"):
            validate_url_security("https://localhost.localdomain/jobs")


# ---------------- URL Check Execution Tests (Mocked) ----------------


def test_check_single_url_success_200():
    mock_resp = MagicMock()
    mock_resp.status = 200
    mock_resp.__enter__.return_value = mock_resp

    with patch("socket.getaddrinfo", side_effect=_mock_dns_public):
        with patch("urllib.request.OpenerDirector.open", return_value=mock_resp):
            res = check_single_url("j-01", "Software Engineer", "https://valid.org/job/1")
            assert res.status == "ok"
            assert res.status_code == 200
            assert res.error_reason is None
            # Crucial requirement: HTTP 200 never proves vacancy is active
            assert res.is_active_vacancy_proven is False


def test_check_single_url_http_404_error():
    http_error = urllib.error.HTTPError(
        url="https://valid.org/job/404",
        code=404,
        msg="Not Found",
        hdrs={},
        fp=None,
    )

    with patch("socket.getaddrinfo", side_effect=_mock_dns_public):
        with patch("urllib.request.OpenerDirector.open", side_effect=http_error):
            res = check_single_url("j-02", "QA Engineer", "https://valid.org/job/404")
            assert res.status == "error"
            assert res.status_code == 404
            assert "404" in res.error_reason


def test_check_single_url_timeout():
    timeout_err = urllib.error.URLError(reason=TimeoutError("timed out"))

    with patch("socket.getaddrinfo", side_effect=_mock_dns_public):
        with patch("urllib.request.OpenerDirector.open", side_effect=timeout_err):
            res = check_single_url("j-03", "Data Analyst", "https://valid.org/slow")
            assert res.status == "error"
            assert res.status_code is None
            assert "timed out" in res.error_reason.lower()


def test_check_single_url_dns_failure():
    with patch("socket.getaddrinfo", side_effect=socket.gaierror(-2, "Name or service not known")):
        res = check_single_url("j-04", "DevOps Trainee", "https://nonexistent-domain-xyz.net/jobs")
        assert res.status == "error"
        assert res.status_code is None
        assert "DNS resolution failure" in res.error_reason


def test_check_single_url_blocked_for_ssrf():
    with patch("socket.getaddrinfo", side_effect=_mock_dns_loopback):
        res = check_single_url("j-05", "Backend Dev", "http://localhost:8080/jobs")
        assert res.status == "blocked"
        assert res.status_code is None
        assert "Security check blocked request" in res.error_reason


def test_check_single_url_redirect_to_safe_destination():
    redirect_err = urllib.error.HTTPError(
        url="https://init.org/jobs",
        code=301,
        msg="Moved Permanently",
        hdrs={"Location": "https://final.org/careers"},
        fp=None,
    )
    final_resp = MagicMock()
    final_resp.status = 200
    final_resp.__enter__.return_value = final_resp

    with patch("socket.getaddrinfo", side_effect=_mock_dns_public):
        with patch(
            "urllib.request.OpenerDirector.open",
            side_effect=[redirect_err, final_resp],
        ):
            res = check_single_url("j-06", "Frontend Dev", "https://init.org/jobs")
            assert res.status == "ok"
            assert res.status_code == 200


def test_check_single_url_redirect_to_prohibited_destination():
    redirect_err = urllib.error.HTTPError(
        url="https://init.org/jobs",
        code=302,
        msg="Found",
        hdrs={"Location": "http://169.254.169.254/latest/meta-data"},
        fp=None,
    )

    with patch("socket.getaddrinfo", side_effect=_mock_dns_public):
        with patch("urllib.request.OpenerDirector.open", side_effect=[redirect_err]):
            res = check_single_url("j-07", "Cloud Engineer", "https://init.org/jobs")
            assert res.status == "blocked"
            assert "non-public or prohibited" in res.error_reason


def test_check_single_url_head_405_falls_back_to_get():
    err_405 = urllib.error.HTTPError(
        url="https://valid.org/job",
        code=405,
        msg="Method Not Allowed",
        hdrs={},
        fp=None,
    )
    get_resp = MagicMock()
    get_resp.status = 200
    get_resp.__enter__.return_value = get_resp

    with patch("socket.getaddrinfo", side_effect=_mock_dns_public):
        with patch(
            "urllib.request.OpenerDirector.open",
            side_effect=[err_405, get_resp],
        ):
            res = check_single_url("j-08", "Full Stack", "https://valid.org/job")
            assert res.status == "ok"
            assert res.status_code == 200


def test_check_single_url_exceeds_max_redirects():
    redirect_err = urllib.error.HTTPError(
        url="https://loop.org/1",
        code=302,
        msg="Found",
        hdrs={"Location": "https://loop.org/2"},
        fp=None,
    )

    with patch("socket.getaddrinfo", side_effect=_mock_dns_public):
        with patch("urllib.request.OpenerDirector.open", side_effect=redirect_err):
            res = check_single_url("j-09", "Looper", "https://loop.org/1", max_redirects=2)
            assert res.status == "error"
            assert "Exceeded max redirects" in res.error_reason


# ---------------- Dataset Immutability Test ----------------


def test_check_job_links_never_modifies_dataset():
    """Verify that running link checks never alters jobs.json or marks records verified."""
    with open(settings.jobs_path, encoding="utf-8") as f:
        original_json_content = f.read()

    job1 = _make_dummy_job("test-1", "Role 1", "https://site.org/1")
    job2 = _make_dummy_job("test-2", "Role 2", "http://127.0.0.1/bad")

    with patch("socket.getaddrinfo", side_effect=_mock_dns_public):
        mock_resp = MagicMock()
        mock_resp.status = 200
        mock_resp.__enter__.return_value = mock_resp
        with patch("urllib.request.OpenerDirector.open", return_value=mock_resp):
            results = check_job_links([job1, job2])
            assert len(results) == 2

    # Check disk state
    with open(settings.jobs_path, encoding="utf-8") as f:
        current_json_content = f.read()

    assert original_json_content == current_json_content
    # Confirm records in memory also remained unverified
    assert job1.verified is False
    assert job1.last_verified is None


# ---------------- CLI Invocation Test ----------------


def test_link_checker_cli_invocation_single_job():
    mock_resp = MagicMock()
    mock_resp.status = 200
    mock_resp.__enter__.return_value = mock_resp

    with patch("socket.getaddrinfo", side_effect=_mock_dns_public):
        with patch("urllib.request.OpenerDirector.open", return_value=mock_resp):
            import io

            buf = io.StringIO()
            with patch("sys.stdout", buf):
                exit_code = main(["--job-id", "job-web-001"])
            assert exit_code == 0
            captured = buf.getvalue()
            assert "CAREERBRIDGE MANUAL JOB LINK CHECKER" in captured
            assert "job-web-001" in captured
            assert "[OK]" in captured
