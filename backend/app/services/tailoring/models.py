"""Internal Pydantic models for the tailoring LLM call (strict JSON schema)."""

from __future__ import annotations

from pydantic import BaseModel, Field


class LLMTailoredExperience(BaseModel):
    title: str
    company: str
    duration: str
    bullets: list[str]


class LLMTailoredProject(BaseModel):
    name: str
    description: str
    highlights: list[str]


class LLMChangeEntry(BaseModel):
    section: str
    what: str
    why: str


class LLMTailoredResume(BaseModel):
    """Strict structured-output schema sent to the LLM.

    Every field maps 1-to-1 onto TailoredResume in schemas.py.
    We use flat lists (no nested dicts) so strict JSON schema works with Groq.
    """

    headline: str
    summary: str
    # Flat skill group representation: "must_have", "nice_to_have", "other"
    skills_must_have: list[str] = Field(default_factory=list)
    skills_nice_to_have: list[str] = Field(default_factory=list)
    skills_other: list[str] = Field(default_factory=list)
    experience: list[LLMTailoredExperience] = Field(default_factory=list)
    projects: list[LLMTailoredProject] = Field(default_factory=list)
    change_log: list[LLMChangeEntry] = Field(default_factory=list)
    ats_keywords_matched: list[str] = Field(default_factory=list)
    gaps_not_added: list[str] = Field(default_factory=list)
