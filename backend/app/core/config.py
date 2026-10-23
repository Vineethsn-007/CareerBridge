import os
from dataclasses import dataclass, field
from pathlib import Path

APP_DIR = Path(__file__).resolve().parents[1]


def _load_env_file() -> None:
    """Load the local `.env` next to `app/` once, before any settings are read.

    Real environment variables always win (override=False), so production
    containers keep their injected configuration. This exists because the
    documented start commands (`uvicorn app.main:app`) do NOT pass --env-file,
    and without it the backend silently runs the mock LLM even when `.env`
    contains a valid provider configuration.
    """
    try:
        from dotenv import load_dotenv
    except ImportError:  # dependency missing: behave as before
        return
    candidates = [Path.cwd() / ".env", APP_DIR.parent / ".env"]
    for path in candidates:
        if path.is_file():
            load_dotenv(dotenv_path=str(path), override=False)
            return


_load_env_file()


def _origins() -> list[str]:
    # Unset falls back to the local dev default; an empty value falls back too, so a
    # misconfigured (blank) production variable never silently disables CORS.
    raw = os.getenv("CORS_ORIGINS") or "http://localhost:3000"
    return [o.strip() for o in raw.split(",") if o.strip()]


@dataclass(frozen=True)
class Settings:
    cors_origins: list[str] = field(default_factory=_origins)
    llm_provider: str = os.getenv("LLM_PROVIDER", "mock")
    llm_api_key: str = os.getenv("LLM_API_KEY", "")
    llm_base_url: str = os.getenv("LLM_BASE_URL", "https://api.groq.com/openai/v1")
    llm_model: str = os.getenv("LLM_MODEL", "openai/gpt-oss-120b")
    # Smaller model for inexpensive calls (bulk normalization, simple classifications).
    llm_fast_model: str = os.getenv("LLM_FAST_MODEL", "openai/gpt-oss-20b")
    llm_timeout: float = float(os.getenv("LLM_TIMEOUT", "30"))
    # SQLite by default for the MVP; point DATABASE_URL at PostgreSQL in deployment.
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./careerbridge.db")
    youtube_api_key: str = os.getenv("YOUTUBE_API_KEY", "")
    jobs_path: Path = Path(os.getenv("JOBS_PATH", str(APP_DIR / "data" / "jobs.json")))
    max_upload_bytes: int = 5 * 1024 * 1024
    # Task 4 scraper settings.
    admin_token: str = os.getenv("ADMIN_TOKEN", "")
    scraper_user_agent: str = os.getenv(
        "SCRAPER_USER_AGENT",
        "CareerBridge-Scraper/0.1 (+https://github.com/Vineethsn-007/CareerBridge)",
    )
    scraper_timeout: float = float(os.getenv("SCRAPER_TIMEOUT", "20"))
    scraper_request_interval: float = float(os.getenv("SCRAPER_REQUEST_INTERVAL", "2.0"))
    scraper_max_listings: int = int(os.getenv("SCRAPER_MAX_LISTINGS", "25"))
    scraper_stale_days: int = int(os.getenv("SCRAPER_STALE_DAYS", "14"))

    # Tavus Conversational Video Interface (CVI) config
    tavus_api_key: str = os.getenv("TAVUS_API_KEY", "")
    tavus_face_id: str = os.getenv("TAVUS_FACE_ID", "ra066ab28864")
    tavus_pal_id: str = os.getenv("TAVUS_PAL_ID", "")
    tavus_api_base: str = os.getenv("TAVUS_API_BASE", "https://tavusapi.com/v2")
    webhook_base_url: str = os.getenv("WEBHOOK_BASE_URL", "http://localhost:8000")
    max_interview_minutes: int = int(os.getenv("MAX_INTERVIEW_MINUTES", "30"))


settings = Settings()
