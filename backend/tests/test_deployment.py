"""Deployment configuration tests: CORS parsing, CORS middleware, health endpoint."""

from fastapi.testclient import TestClient

import app.core.config as config
from app.main import app

client = TestClient(app)


# ---------------- CORS_ORIGINS parsing ----------------


def test_cors_origins_parses_comma_separated_env(monkeypatch):
    monkeypatch.setenv("CORS_ORIGINS", "https://a.example.com, https://b.example.com ,")
    assert config._origins() == ["https://a.example.com", "https://b.example.com"]


def test_cors_origins_blank_env_falls_back_to_local_default(monkeypatch):
    monkeypatch.setenv("CORS_ORIGINS", "")
    assert config._origins() == ["http://localhost:3000"]


def test_cors_origins_unset_env_uses_local_default(monkeypatch):
    monkeypatch.delenv("CORS_ORIGINS", raising=False)
    assert config._origins() == ["http://localhost:3000"]


def test_cors_origins_never_wildcards_or_leaks():
    # Production operators configure real origins in the environment; no wildcard
    # default exists in code and no personal URL is hardcoded.
    assert "*" not in config._origins()


# ---------------- CORS middleware behaviour ----------------


def test_configured_frontend_origin_is_allowed():
    res = client.get("/api/health", headers={"Origin": config.settings.cors_origins[0]})
    assert res.status_code == 200
    assert res.headers.get("access-control-allow-origin") == config.settings.cors_origins[0]


# ---------------- health endpoint contract ----------------


def test_health_is_stable_and_leaks_nothing():
    res = client.get("/api/health")
    assert res.status_code == 200
    # Exactly one stable field; no secrets, stack traces or infra details.
    assert res.json() == {"status": "ok"}
