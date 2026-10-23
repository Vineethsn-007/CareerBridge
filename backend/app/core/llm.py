"""Shared LLM wrapper (owner: lead).

Everyone calls `complete()` / `complete_json()`; nobody imports a provider SDK directly.
That keeps the provider swappable and keys in one place.

The real integration targets Groq's OpenAI-compatible chat-completions API, so the
OpenAI SDK is used with a configurable base URL. When LLM_PROVIDER=mock or no API key is
configured, calls raise `LLMUnavailable` so services can use their heuristic fallback.
"""

import json
import logging
import re
import time

from openai import (
    APIConnectionError,
    APITimeoutError,
    InternalServerError,
    OpenAI,
    RateLimitError,
)

from app.core.config import settings

logger = logging.getLogger(__name__)

# Providers this client can actually speak to (OpenAI-compatible REST APIs).
SUPPORTED_PROVIDERS: frozenset[str] = frozenset({"groq", "openai"})

# One initial attempt plus exactly two retries after it.
ATTEMPTS: int = 3
_BACKOFF_BASE_SECONDS: float = 0.5

# Transient failures worth retrying: rate limits, temporary server errors, timeouts and
# connection failures. Permanent auth/config/validation errors are deliberately absent
# from this tuple so they fail fast without burning retries.
_RETRYABLE_EXCEPTIONS: tuple[type[Exception], ...] = (
    RateLimitError,
    APITimeoutError,
    APIConnectionError,
    InternalServerError,
)

_OPENING_FENCE_RE = re.compile(r"^```[A-Za-z0-9_-]*[ \t]*\n?")
_CLOSING_FENCE_RE = re.compile(r"\n?[ \t]*```$")


class LLMUnavailable(RuntimeError):
    """Raised when no LLM is configured; callers should fall back to heuristics."""


def _backoff_seconds(failed_attempt_index: int) -> float:
    """Exponential backoff: 0.5s after attempt 1, 1.0s after attempt 2."""
    return _BACKOFF_BASE_SECONDS * (2**failed_attempt_index)


def _client() -> OpenAI:
    """Build the provider client. SDK-level retries are off; retrying lives here."""
    return OpenAI(
        api_key=settings.llm_api_key,
        base_url=settings.llm_base_url,
        timeout=settings.llm_timeout,
        max_retries=0,
    )


def _extract_completion_text(response: object) -> str:
    try:
        choices = response.choices  # type: ignore[attr-defined]
        content = choices[0].message.content  # type: ignore[index,attr-defined]
    except (AttributeError, IndexError, KeyError, TypeError) as exc:
        raise ValueError(
            "LLM provider returned a malformed response: no choices[0].message."
        ) from exc
    if not content or not str(content).strip():
        raise ValueError("LLM provider returned no completion content.")
    return str(content).strip()


def complete(prompt: str, system: str | None = None) -> str:
    """Complete a prompt and return the raw text.

    Raises `LLMUnavailable` when the provider is mock, unsupported, or no API key is
    configured. Retries transient provider failures exactly twice with exponential
    backoff; permanent errors (auth, config, validation) fail immediately.
    """
    if settings.llm_provider == "mock":
        raise LLMUnavailable("LLM_PROVIDER is 'mock'; no LLM is configured.")
    if not settings.llm_api_key:
        raise LLMUnavailable("No LLM_API_KEY configured.")
    if settings.llm_provider not in SUPPORTED_PROVIDERS:
        raise LLMUnavailable(
            f"Unsupported LLM_PROVIDER {settings.llm_provider!r}; "
            f"supported providers: {', '.join(sorted(SUPPORTED_PROVIDERS))}."
        )

    messages: list[dict[str, str]] = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    client = _client()
    last_error: Exception | None = None
    for attempt in range(ATTEMPTS):
        try:
            response = client.chat.completions.create(
                model=settings.llm_model,
                messages=messages,
                temperature=0,
            )
        except _RETRYABLE_EXCEPTIONS as exc:
            last_error = exc
            if attempt == ATTEMPTS - 1:
                raise RuntimeError(
                    f"LLM request failed after {ATTEMPTS} attempts "
                    f"(last error: {type(exc).__name__})."
                ) from exc
            delay = _backoff_seconds(attempt)
            logger.debug(
                "LLM attempt %d failed (%s); retrying in %.1fs",
                attempt + 1,
                type(exc).__name__,
                delay,
            )
            time.sleep(delay)
        else:
            return _extract_completion_text(response)

    raise RuntimeError(f"LLM request failed after {ATTEMPTS} attempts.") from last_error


def _strip_code_fences(text: str) -> str:
    """Strip optional Markdown code fences, including fences labelled `json`."""
    stripped = text.strip()
    if stripped.startswith("```"):
        stripped = _OPENING_FENCE_RE.sub("", stripped, count=1)
        if stripped.endswith("```"):
            stripped = _CLOSING_FENCE_RE.sub("", stripped, count=1)
    return stripped.strip()


def complete_json(prompt: str, system: str | None = None) -> dict:
    """Ask for JSON and parse it. Callers should validate the result with a pydantic model."""
    raw = complete(prompt, system)
    candidate = _strip_code_fences(raw)
    try:
        parsed = json.loads(candidate)
    except json.JSONDecodeError as exc:
        raise ValueError(
            f"LLM returned invalid JSON (line {exc.lineno}, column {exc.colno}): {exc.msg}"
        ) from exc
    if not isinstance(parsed, dict):
        raise ValueError("LLM returned JSON that is not an object.")
    return parsed
