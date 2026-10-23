import os
from dataclasses import dataclass, field
from pathlib import Path

APP_DIR = Path(__file__).resolve().parents[1]


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


settings = Settings()
