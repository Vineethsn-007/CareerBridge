"""Tests for app.core.llm. The provider client is faked; nothing touches the network."""

from types import SimpleNamespace

import pytest

from app.core import llm
from app.core.llm import LLMUnavailable, complete, complete_json


class FakeRateLimitError(Exception): ...


class FakeTimeoutError(Exception): ...


class FakeConnectionError(Exception): ...


class FakeServerError(Exception): ...


class FakeAuthError(Exception): ...


class FakeResponse:
    def __init__(self, content, n_choices=1):
        choices = [SimpleNamespace(message=SimpleNamespace(content=content))]
        choices *= n_choices
        self.choices = choices


class FakeCompletions:
    """chat.completions stub that replays a scripted list of outcomes."""

    def __init__(self, outcomes, **client_kwargs):
        self.outcomes = list(outcomes)
        self.calls: list[dict] = []
        self.client_kwargs = client_kwargs
        self.client = None

    def create(self, **kwargs):
        self.calls.append(kwargs)
        outcome = self.outcomes.pop(0) if self.outcomes else FakeServerError("scripted out")
        if isinstance(outcome, Exception):
            raise outcome
        return outcome


def base_settings(**overrides):
    values = {
        "llm_provider": "groq",
        "llm_api_key": "test-key",
        "llm_base_url": "https://example.test/v1",
        "llm_model": "test-model",
        "llm_timeout": 1.0,
        "llm_extra_field": None,
    }
    values.update(overrides)
    return SimpleNamespace(**values)


def paste_complete(monkeypatch, settings_ns, outcomes, sleep_calls=None):
    """Wire a fake client into app.core.llm and return the completions stub."""
    completions = FakeCompletions(outcomes)
    fake_client = SimpleNamespace(chat=SimpleNamespace(completions=completions))

    monkeypatch.setattr(llm, "settings", settings_ns)
    monkeypatch.setattr(llm, "_client", lambda: fake_client)
    monkeypatch.setattr(
        llm,
        "_RETRYABLE_EXCEPTIONS",
        (FakeRateLimitError, FakeTimeoutError, FakeConnectionError, FakeServerError),
    )
    if sleep_calls is not None:
        monkeypatch.setattr(llm.time, "sleep", lambda s: sleep_calls.append(s))
    return completions


# ---------------- provider selection / configuration ----------------


def test_client_is_built_with_configured_timeout_and_no_sdk_retries(monkeypatch):
    captured: dict = {}

    def fake_openai(**kwargs):
        captured.update(kwargs)
        return SimpleNamespace()

    monkeypatch.setattr(llm, "settings", base_settings())
    monkeypatch.setattr(llm, "OpenAI", fake_openai)
    llm._client()
    assert captured == {
        "api_key": "test-key",
        "base_url": "https://example.test/v1",
        "timeout": 1.0,
        "max_retries": 0,
    }


# ---------------- mock / no-key fallback behaviour ----------------


def test_mock_provider_raises_unavailable_and_never_calls_network(monkeypatch):
    monkeypatch.setattr(llm, "settings", base_settings(llm_provider="mock"))

    def boom():
        raise AssertionError("network client must not be built for mock provider")

    monkeypatch.setattr(llm, "_client", boom)
    with pytest.raises(LLMUnavailable):
        complete("hi")
    with pytest.raises(LLMUnavailable):
        complete_json("hi")


def test_missing_api_key_raises_unavailable_and_never_calls_network(monkeypatch):
    monkeypatch.setattr(llm, "settings", base_settings(llm_api_key=""))

    def boom():
        raise AssertionError("network client must not be built without an API key")

    monkeypatch.setattr(llm, "_client", boom)
    with pytest.raises(LLMUnavailable):
        complete("hi")


def test_unsupported_provider_raises_unavailable(monkeypatch):
    monkeypatch.setattr(llm, "settings", base_settings(llm_provider="anthropic"))
    monkeypatch.setattr(llm, "_client", lambda: (_ for _ in ()).throw(AssertionError("no call")))
    with pytest.raises(LLMUnavailable):
        complete("hi")


# ---------------- successful completion ----------------


def test_successful_completion_returns_text(monkeypatch):
    completions = paste_complete(monkeypatch, base_settings(), [FakeResponse("  hello world  ")])
    assert complete("hi", system="be brief") == "hello world"
    assert len(completions.calls) == 1
    assert completions.calls[0]["model"] == "test-model"
    assert completions.calls[0]["messages"] == [
        {"role": "system", "content": "be brief"},
        {"role": "user", "content": "hi"},
    ]


def test_successful_completion_without_system_message(monkeypatch):
    completions = paste_complete(monkeypatch, base_settings(), [FakeResponse("ok")])
    assert complete("hi") == "ok"
    assert completions.calls[0]["messages"] == [{"role": "user", "content": "hi"}]


# ---------------- malformed provider responses ----------------


def test_empty_choices_is_a_clear_error(monkeypatch):
    paste_complete(monkeypatch, base_settings(), [FakeResponse("x", n_choices=0)])
    with pytest.raises(ValueError, match="malformed response"):
        complete("hi")


def test_missing_content_is_a_clear_error(monkeypatch):
    paste_complete(monkeypatch, base_settings(), [FakeResponse(None)])
    with pytest.raises(ValueError, match="no completion content"):
        complete("hi")


def test_blank_content_is_a_clear_error(monkeypatch):
    paste_complete(monkeypatch, base_settings(), [FakeResponse("   ")])
    with pytest.raises(ValueError, match="no completion content"):
        complete("hi")


# ---------------- retries ----------------


def test_exactly_two_retries_with_backoff_then_success(monkeypatch):
    sleep_calls: list[float] = []
    completions = paste_complete(
        monkeypatch,
        base_settings(),
        [
            FakeRateLimitError("slow down"),
            FakeServerError("try again"),
            FakeResponse("made it"),
        ],
        sleep_calls,
    )
    assert complete("hi") == "made it"
    assert len(completions.calls) == 3  # initial attempt + exactly two retries
    # Exponential backoff: 0.5s after attempt 1, then 1.0s after attempt 2.
    assert sleep_calls == [llm._BACKOFF_BASE_SECONDS, llm._BACKOFF_BASE_SECONDS * 2]


def test_connection_failure_retry_then_timeout_retry_then_success(monkeypatch):
    sleep_calls: list[float] = []
    completions = FakeCompletions(
        [FakeConnectionError("conn"), FakeTimeoutError("late"), FakeResponse("ok")]
    )
    monkeypatch.setattr(llm, "settings", base_settings())
    monkeypatch.setattr(
        llm, "_client", lambda: SimpleNamespace(chat=SimpleNamespace(completions=completions))
    )
    monkeypatch.setattr(
        llm,
        "_RETRYABLE_EXCEPTIONS",
        (FakeRateLimitError, FakeTimeoutError, FakeConnectionError, FakeServerError),
    )
    monkeypatch.setattr(llm.time, "sleep", lambda s: sleep_calls.append(s))
    assert complete("hi") == "ok"
    assert len(completions.calls) == 3


def test_backoff_is_exponential(monkeypatch):
    sleep_calls: list[float] = []
    completions = FakeCompletions(
        [
            FakeRateLimitError("a"),
            FakeRateLimitError("b"),
            FakeResponse("ok"),
        ]
    )
    monkeypatch.setattr(llm, "settings", base_settings())
    monkeypatch.setattr(
        llm, "_client", lambda: SimpleNamespace(chat=SimpleNamespace(completions=completions))
    )
    monkeypatch.setattr(
        llm,
        "_RETRYABLE_EXCEPTIONS",
        (FakeRateLimitError, FakeTimeoutError, FakeConnectionError, FakeServerError),
    )
    monkeypatch.setattr(llm.time, "sleep", lambda s: sleep_calls.append(s))
    assert complete("hi") == "ok"
    assert sleep_calls == [0.5, 1.0]


def test_retry_gives_up_after_two_retries(monkeypatch):
    sleep_calls: list[float] = []
    completions = FakeCompletions(
        [FakeRateLimitError("1"), FakeTimeoutError("2"), FakeServerError("3")]
    )
    monkeypatch.setattr(llm, "settings", base_settings())
    monkeypatch.setattr(
        llm, "_client", lambda: SimpleNamespace(chat=SimpleNamespace(completions=completions))
    )
    monkeypatch.setattr(
        llm,
        "_RETRYABLE_EXCEPTIONS",
        (FakeRateLimitError, FakeTimeoutError, FakeConnectionError, FakeServerError),
    )
    monkeypatch.setattr(llm.time, "sleep", lambda s: sleep_calls.append(s))
    with pytest.raises(RuntimeError, match="failed after 3 attempts"):
        complete("hi")
    assert len(completions.calls) == 3
    assert sleep_calls == [0.5, 1.0]


def test_timeout_is_retried_transiently(monkeypatch):
    sleep_calls: list[float] = []
    completions = FakeCompletions([FakeTimeoutError("late"), FakeResponse("ok")])
    monkeypatch.setattr(llm, "settings", base_settings())
    monkeypatch.setattr(
        llm, "_client", lambda: SimpleNamespace(chat=SimpleNamespace(completions=completions))
    )
    monkeypatch.setattr(
        llm,
        "_RETRYABLE_EXCEPTIONS",
        (FakeRateLimitError, FakeTimeoutError, FakeConnectionError, FakeServerError),
    )
    monkeypatch.setattr(llm.time, "sleep", lambda s: sleep_calls.append(s))
    assert complete("hi") == "ok"
    assert len(completions.calls) == 2


# ---------------- permanent errors are not retried ----------------


def test_permanent_error_is_not_retried(monkeypatch):
    completions = FakeCompletions([FakeAuthError("bad key")])
    monkeypatch.setattr(llm, "settings", base_settings())
    monkeypatch.setattr(
        llm, "_client", lambda: SimpleNamespace(chat=SimpleNamespace(completions=completions))
    )
    monkeypatch.setattr(
        llm,
        "_RETRYABLE_EXCEPTIONS",
        (FakeRateLimitError, FakeTimeoutError, FakeConnectionError, FakeServerError),
    )
    monkeypatch.setattr(
        llm.time, "sleep", lambda s: (_ for _ in ()).throw(AssertionError("no sleep on fatal"))
    )
    with pytest.raises(FakeAuthError):
        complete("hi with secret details that must not appear")
    assert len(completions.calls) == 1


# ---------------- complete_json ----------------


def test_complete_json_parses_plain_json(monkeypatch):
    fake_settings = base_settings()
    completions = FakeCompletions(
        [FakeResponse('{"a": 1, "b": ["x"]}'), FakeResponse('{"ok": true}')]
    )
    monkeypatch.setattr(llm, "settings", fake_settings)
    monkeypatch.setattr(
        llm, "_client", lambda: SimpleNamespace(chat=SimpleNamespace(completions=completions))
    )
    monkeypatch.setattr(
        llm,
        "_RETRYABLE_EXCEPTIONS",
        (FakeRateLimitError, FakeTimeoutError, FakeConnectionError, FakeServerError),
    )
    assert complete_json("give json") == {"a": 1, "b": ["x"]}
    assert complete_json("give json again") == {"ok": True}


def test_complete_json_strips_markdown_fences(monkeypatch):
    completions = FakeCompletions(
        [
            FakeResponse('```json\n{"a": 1}\n```'),
            FakeResponse('```\n{"b": 2}\n```'),
        ]
    )
    monkeypatch.setattr(llm, "settings", base_settings())
    monkeypatch.setattr(
        llm, "_client", lambda: SimpleNamespace(chat=SimpleNamespace(completions=completions))
    )
    monkeypatch.setattr(
        llm,
        "_RETRYABLE_EXCEPTIONS",
        (FakeRateLimitError, FakeTimeoutError, FakeConnectionError, FakeServerError),
    )
    assert complete_json("hi") == {"a": 1}
    assert complete_json("hi") == {"b": 2}


def test_complete_json_invalid_json_raises_clear_error(monkeypatch):
    completions = FakeCompletions([FakeResponse("definitely not { valid json")])
    monkeypatch.setattr(llm, "settings", base_settings())
    monkeypatch.setattr(
        llm, "_client", lambda: SimpleNamespace(chat=SimpleNamespace(completions=completions))
    )
    monkeypatch.setattr(
        llm,
        "_RETRYABLE_EXCEPTIONS",
        (FakeRateLimitError, FakeTimeoutError, FakeConnectionError, FakeServerError),
    )
    with pytest.raises(ValueError, match="invalid JSON"):
        complete_json("turn this into json pleaz")


def test_complete_json_non_object_raises_clear_error(monkeypatch):
    completions = FakeCompletions([FakeResponse('["a", "b"]'), FakeResponse("42")])
    monkeypatch.setattr(llm, "settings", base_settings())
    monkeypatch.setattr(
        llm, "_client", lambda: SimpleNamespace(chat=SimpleNamespace(completions=completions))
    )
    monkeypatch.setattr(
        llm,
        "_RETRYABLE_EXCEPTIONS",
        (FakeRateLimitError, FakeTimeoutError, FakeConnectionError, FakeServerError),
    )
    with pytest.raises(ValueError, match="not an object"):
        complete_json("hi")
    with pytest.raises(ValueError, match="not an object"):
        complete_json("hi")
