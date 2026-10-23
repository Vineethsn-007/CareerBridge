"""Tests for the strict-schema converter and schema-backed `complete_json`.

The provider client is faked; nothing touches the network.
"""

from typing import Literal

import pytest
from pydantic import BaseModel, ValidationError

from app.core.llm import LLMResponseInvalid, complete_json
from app.core.strict_schema import UnsupportedSchemaError, to_strict_json_schema
from tests.test_llm import FakeRateLimitError, FakeResponse, base_settings, paste_complete

# ---------------- converter: structure ----------------


class Address(BaseModel):
    city: str
    postal_code: str | None = None


class Sample(BaseModel):
    name: str
    age: int | None = None
    tags: list[str] = []
    level: Literal["fresher", "junior", "mid", "senior"] = "fresher"
    score: float = 0.0
    active: bool = False
    address: Address | None = None


def assert_strict_object(node: dict) -> None:
    if node.get("type") == "object" or "properties" in node:
        assert node.get("additionalProperties") is False, node
        assert set(node.get("required", [])) == set(node.get("properties", {})), node
        for child in node.get("properties", {}).values():
            assert_strict_object(child)


def test_every_property_is_required_in_strict_schema():
    schema = to_strict_json_schema(Sample)
    assert schema["required"] == list(Sample.model_fields.keys())


def test_root_and_nested_objects_have_additional_properties_false():
    schema = to_strict_json_schema(Sample)
    assert schema["additionalProperties"] is False
    assert_strict_object(schema)


def test_optional_fields_are_nullable_but_required():
    schema = to_strict_json_schema(Sample)
    age = schema["properties"]["age"]
    assert age == {"anyOf": [{"type": "integer"}, {"type": "null"}]}
    address = schema["properties"]["address"]
    assert address["anyOf"][1] == {"type": "null"}
    assert address["anyOf"][0]["type"] == "object"


def test_nested_model_is_inlined_and_strict():
    schema = to_strict_json_schema(Sample)
    nested = schema["properties"]["address"]["anyOf"][0]
    assert set(nested["properties"]) == {"city", "postal_code"}
    assert nested["additionalProperties"] is False
    assert nested["required"] == ["city", "postal_code"]


def test_lists_enums_and_scalars_map_correctly():
    props = to_strict_json_schema(Sample)["properties"]
    assert props["tags"] == {"type": "array", "items": {"type": "string"}}
    assert props["level"] == {"type": "string", "enum": ["fresher", "junior", "mid", "senior"]}
    assert props["score"] == {"type": "number"}
    assert props["active"] == {"type": "boolean"}
    assert props["name"] == {"type": "string"}


def test_unsupported_union_raises_explicit_error():
    class Bad(BaseModel):
        value: str | int | None = None

    with pytest.raises(UnsupportedSchemaError, match="Only Optional"):
        to_strict_json_schema(Bad)


def test_non_base_model_input_raises():
    with pytest.raises(UnsupportedSchemaError, match="not a pydantic BaseModel"):
        to_strict_json_schema(dict)  # type: ignore[arg-type]


# ---------------- structured-output completion ----------------


class Extract(BaseModel):
    summary: str
    skills: list[str] = []


GOOD = '{"summary": "Backend intern", "skills": ["Python", "SQL"]}'


def test_complete_json_sends_strict_response_format(monkeypatch):
    completions = paste_complete(monkeypatch, base_settings(), [FakeResponse(GOOD)])
    result = complete_json("extract", schema_model=Extract)

    assert result == Extract(summary="Backend intern", skills=["Python", "SQL"])
    sent = completions.calls[0]
    fmt = sent["response_format"]
    assert fmt["type"] == "json_schema"
    assert fmt["json_schema"]["name"] == "Extract"
    assert fmt["json_schema"]["strict"] is True
    assert fmt["json_schema"]["schema"]["additionalProperties"] is False


def test_complete_json_validates_response_with_pydantic(monkeypatch):
    paste_complete(monkeypatch, base_settings(), [FakeResponse(GOOD)])
    result = complete_json("extract", schema_model=Extract)
    assert isinstance(result, Extract)


def test_complete_json_tolerates_markdown_fences(monkeypatch):
    paste_complete(monkeypatch, base_settings(), [FakeResponse(f"```json\n{GOOD}\n```")])
    result = complete_json("extract", schema_model=Extract)
    assert result.summary == "Backend intern"


def test_complete_json_invalid_data_raises_without_retry(monkeypatch):
    completions = paste_complete(
        monkeypatch, base_settings(), [FakeResponse('{"summary": 42, "skills": []}')]
    )
    with pytest.raises(LLMResponseInvalid):
        complete_json("extract", schema_model=Extract)
    assert completions.calls[0].get("response_format") is not None
    # Validation failure is permanent: exactly one network attempt.


def test_complete_json_missing_required_field_raises(monkeypatch):
    paste_complete(monkeypatch, base_settings(), [FakeResponse('{"skills": []}')])
    with pytest.raises((LLMResponseInvalid, ValidationError)):
        complete_json("extract", schema_model=Extract)


def test_complete_json_retries_transient_failures_with_schema(monkeypatch):
    completions = paste_complete(
        monkeypatch,
        base_settings(),
        [FakeRateLimitError("slow down"), FakeResponse(GOOD)],
    )
    result = complete_json("extract", schema_model=Extract)
    assert result.skills == ["Python", "SQL"]
    assert len(completions.calls) == 2


def test_complete_json_invalid_json_without_schema_unchanged(monkeypatch):
    paste_complete(monkeypatch, base_settings(), [FakeResponse("not json")])
    with pytest.raises(ValueError, match="invalid JSON"):
        complete_json("extract")


def test_complete_json_with_model_override_uses_requested_model(monkeypatch):
    completions = paste_complete(monkeypatch, base_settings(), [FakeResponse(GOOD)])
    complete_json("extract", schema_model=Extract, model="fast-model")
    assert completions.calls[0]["model"] == "fast-model"


def test_llm_response_invalid_is_a_value_error():
    assert issubclass(LLMResponseInvalid, ValueError)
