"""Strict-input models for the persona Q&A agent (owner: lead - new service)."""

from typing import Literal

from pydantic import BaseModel, Field

PersonaTopicLiteral = Literal[
    "leadership", "teamwork", "ownership", "communication", "initiative", "learning agility"
]


class QuestionSpec(BaseModel):
    """One Q&A question, grounded in the resume and prior answers."""

    topic: PersonaTopicLiteral
    question: str


class StrengthSpec(BaseModel):
    """A self-described strength with a verbatim quote from the candidate's answer."""

    strength: str
    quote: str
    topic: PersonaTopicLiteral


class ProfileSpec(BaseModel):
    """Final persona payload; quotes must come from actual answers."""

    strengths: list[StrengthSpec] = Field(default_factory=list)
    summary: str | None = None
