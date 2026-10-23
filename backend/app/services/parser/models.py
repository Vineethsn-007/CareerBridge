"""Pydantic models for the LLM resume-extraction agent (owner: lead).

Validated against the LLM's strict structured output. Every model maps onto additive
fields of `schemas.ParsedResume`; nothing here invents data — the prompt and the fallback
guarantee only resume-grounded values survive.
"""

from typing import Literal

from pydantic import BaseModel, Field


class SkillMention(BaseModel):
    """A skill the resume mentions, with the kind of evidence found for it."""

    skill: str
    category: Literal["work experience", "project", "listed only"] = "listed only"
    proficiency: str | None = None  # "basic" | "intermediate" | "advanced" | None
    years: float | None = Field(default=None, ge=0)


class ExperienceEntry(BaseModel):
    title: str
    company: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    duration_months: int | None = Field(default=None, ge=0)
    technologies: list[str] = Field(default_factory=list)
    impact: list[str] = Field(default_factory=list)
    seniority: str | None = None


class EducationEntry(BaseModel):
    institution: str
    degree: str | None = None
    year: str | None = None


class CertificationEntry(BaseModel):
    name: str
    issuer: str | None = None
    year: str | None = None


class InsightItem(BaseModel):
    """A single strength / gap tied to concrete resume evidence."""

    text: str
    evidence: str | None = None


class Insights(BaseModel):
    strengths: list[InsightItem] = Field(default_factory=list)
    gaps: list[InsightItem] = Field(default_factory=list)
    summary: str | None = None
    target_roles: list[str] = Field(default_factory=list)
    tips: list[str] = Field(default_factory=list)


class ResumeExtraction(BaseModel):
    """The complete structured payload requested from the LLM in one call."""

    summary: str | None = None
    experiences: list[ExperienceEntry] = Field(default_factory=list)
    education: list[EducationEntry] = Field(default_factory=list)
    certifications: list[CertificationEntry] = Field(default_factory=list)
    skills: list[SkillMention] = Field(default_factory=list)
    projects: list[str] = Field(default_factory=list)
    total_experience_months: int | None = Field(default=None, ge=0)
    insights: Insights | None = None
