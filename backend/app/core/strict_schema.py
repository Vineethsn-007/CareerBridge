"""Convert Pydantic models into strict JSON schemas for provider structured output.

Providers that support strict structured outputs (Groq, OpenAI) require a JSON schema
subset where every object has `additionalProperties: false`, every property is listed in
`required`, and optional values are represented as nullable but still required. This module
converts supported Pydantic models into that format, recursively and inlined.

Unsupported annotations (non-null unions, heterogeneous tuples, exotic types) raise
`UnsupportedSchemaError` explicitly as required, instead of silently emitting an invalid
schema.
"""

import datetime as dt
import enum
import types
import typing

from pydantic import BaseModel

_ALWAYS_JSON_TYPES = (str, int, float, bool)


class UnsupportedSchemaError(TypeError):
    """A requested Pydantic model cannot be represented as a strict JSON schema."""


def to_strict_json_schema(model: type[BaseModel]) -> dict:
    """Build the strict schema for `model` (and every nested model it references)."""
    if not (isinstance(model, type) and issubclass(model, BaseModel)):
        raise UnsupportedSchemaError(f"{model!r} is not a pydantic BaseModel class.")
    return _object_schema(model)


def _object_schema(model: type[BaseModel]) -> dict:
    properties: dict[str, dict] = {}
    required: list[str] = []
    for name, field in model.model_fields.items():
        node = _type_schema(field.annotation)
        if field.description:
            node = _with_description(node, field.description)
        properties[name] = node
        # Optional fields stay required but become nullable, as strict mode demands.
        required.append(name)
    return {
        "type": "object",
        "properties": properties,
        "required": required,
        "additionalProperties": False,
    }


def _with_description(node: dict, description: str) -> dict:
    if "anyOf" in node:
        # Attach the description to the first non-null variant so the node stays valid.
        merged = {**node["anyOf"][0], "description": description}
        return {**node, "anyOf": [merged, *node["anyOf"][1:]]}
    return {**node, "description": description}


def _type_schema(annotation: object) -> dict:
    """Resolve one field annotation to a strict-schema node (recursively)."""
    origin = typing.get_origin(annotation)

    # Annotated[T, ...] -> T.
    if origin is typing.Annotated:
        args = typing.get_args(annotation)
        return _type_schema(args[0])

    # Optional[T] (T | None or Union[...]) -> anyOf [T, null]. Everything else unsupported.
    if origin is typing.Union or origin is types.UnionType:
        args = typing.get_args(annotation)
        non_nulls = [a for a in args if not _is_none_type(a)]
        nulls = [a for a in args if _is_none_type(a)]
        if not nulls or len(non_nulls) != 1:
            raise UnsupportedSchemaError(
                "Only Optional[T] unions can be represented in a strict JSON schema; "
                f"got {annotation!r}. Use a nullable field instead."
            )
        return {"anyOf": [_type_schema(non_nulls[0]), {"type": "null"}]}

    return _plain_schema(annotation, origin)


def _is_none_type(annotation: object) -> bool:
    return annotation is None or annotation is type(None)


def _plain_schema(annotation: object, origin: object) -> dict:
    if annotation is None or annotation is type(None):
        return {"type": "null"}
    if annotation is str:
        return {"type": "string"}
    if annotation is int:
        return {"type": "integer"}
    if annotation is float:
        return {"type": "number"}
    if annotation is bool:
        return {"type": "boolean"}
    if annotation in (dt.datetime, dt.date, dt.time):
        return {"type": "string"}

    if origin in (list, set, frozenset, tuple, typing.Sequence):
        # list[T] / set[T] / tuple[T] homogeneous sequences -> array with items.
        args = [a for a in typing.get_args(annotation) if a is not ...]
        if len(args) > 1:
            raise UnsupportedSchemaError(
                f"Heterogeneous tuples are not supported in strict schemas: {annotation!r}"
            )
        items = _type_schema(args[0]) if args else {}
        return {"type": "array", "items": items}
    if annotation in (list, tuple, set, frozenset):
        return {"type": "array", "items": {}}

    if origin is dict or annotation is dict:
        args = typing.get_args(annotation) if origin is dict else ()
        if args and args[0] is not str:
            raise UnsupportedSchemaError(f"Only dict[str, T] maps are supported: {annotation!r}")
        value_schema = _type_schema(args[1]) if len(args) == 2 else {}
        return {
            "type": "object",
            "properties": {},
            "required": [],
            "additionalProperties": value_schema,
        }

    if origin is typing.Literal:
        values = list(typing.get_args(annotation))
        if not all(isinstance(v, _ALWAYS_JSON_TYPES + (None,)) for v in values):
            raise UnsupportedSchemaError(f"Literal {annotation!r} has unsupported members.")
        return {"type": "string", "enum": [str(v) for v in values]}

    if isinstance(annotation, type) and issubclass(annotation, enum.Enum):
        values = [e.value for e in annotation]
        if not all(isinstance(v, str) for v in values):
            raise UnsupportedSchemaError(f"Only string enums are supported: {annotation!r}")
        return {"type": "string", "enum": values}

    if isinstance(annotation, type) and issubclass(annotation, BaseModel):
        return _object_schema(annotation)

    raise UnsupportedSchemaError(
        f"Annotation {annotation!r} cannot be represented in a strict JSON schema."
    )
