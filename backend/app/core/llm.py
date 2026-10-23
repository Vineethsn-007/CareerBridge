"""Shared LLM wrapper (owner: lead).

Everyone calls `complete()` / `complete_json()`; nobody imports a provider SDK directly.
That keeps the provider swappable (Gemini / OpenAI / Anthropic) and keys in one place.

While LLM_PROVIDER=mock, calls raise LLMUnavailable so services can use their
heuristic fallback. Wire a real provider in `complete()` when keys are available.
"""

import json

from app.core.config import settings


class LLMUnavailable(RuntimeError):
    """Raised when no LLM is configured; callers should fall back to heuristics."""


def complete(prompt: str, system: str | None = None) -> str:
    if settings.llm_provider == "mock" or not settings.llm_api_key:
        raise LLMUnavailable("No LLM configured (set LLM_PROVIDER and LLM_API_KEY).")
    raise NotImplementedError("TODO(lead): call the chosen provider here.")


def complete_json(prompt: str, system: str | None = None) -> dict:
    """Ask for JSON and parse it. Callers should validate the result with a pydantic model."""
    return json.loads(complete(prompt, system))
