"""API contract. THIS FILE IS THE SOURCE OF TRUTH.

Changing a model here means changing `frontend/lib/types.ts` in the same PR
and telling the team in chat. Add fields freely; avoid renaming/removing them.
"""

from typing import Literal

from pydantic import BaseModel, Field

# ---------- Resume ----------


class Education(BaseModel):
    institution: str
    degree: str | None = None
    year: str | None = None


class Experience(BaseModel):
    title: str
    company: str | None = None
    duration: str | None = None
    summary: str | None = None
    # Additive (Task 2): evidence-rich experience fields.
    start_date: str | None = None
    end_date: str | None = None
    duration_months: int | None = Field(default=None, ge=0)
    technologies: list[str] = Field(default_factory=list)
    impact: list[str] = Field(default_factory=list)
    seniority: str | None = None


class Certification(BaseModel):
    name: str
    issuer: str | None = None
    year: str | None = None


SkillEvidenceCategory = Literal["work experience", "project", "listed only"]


class SkillEvidence(BaseModel):
    """One skill with the evidence the resume actually contains for it."""

    skill: str
    category: SkillEvidenceCategory = "listed only"
    weighted_strength: float = Field(default=0.3, ge=0, le=1)
    proficiency: str | None = None  # e.g. "basic" | "intermediate" | "advanced"
    years: float | None = Field(default=None, ge=0)


class ResumeInsight(BaseModel):
    """An evidence-tied insight: every claim points at resume evidence."""

    text: str
    evidence: str | None = None


class ResumeInsights(BaseModel):
    strengths: list[ResumeInsight] = Field(default_factory=list)
    gaps: list[ResumeInsight] = Field(default_factory=list)
    summary: str | None = None
    target_roles: list[str] = Field(default_factory=list)
    tips: list[str] = Field(default_factory=list)


class ParsedResume(BaseModel):
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    summary: str | None = None
    skills: list[str] = Field(default_factory=list)
    education: list[Education] = Field(default_factory=list)
    experience: list[Experience] = Field(default_factory=list)
    projects: list[str] = Field(default_factory=list)
    raw_text: str = ""
    # Additive (Task 2): evidence-weighted skills, certifications and insights.
    skill_evidence: list[SkillEvidence] = Field(default_factory=list)
    certifications: list[Certification] = Field(default_factory=list)
    total_experience_months: int | None = Field(default=None, ge=0)
    insights: ResumeInsights | None = None


# ---------- Jobs & matching ----------


class Job(BaseModel):
    id: str
    title: str
    company: str
    location: str
    job_type: Literal["full-time", "internship", "part-time", "contract"] = "full-time"
    experience_level: Literal["fresher", "junior", "mid", "senior"] = "fresher"
    skills_required: list[str]
    description: str
    source_url: str
    verified: bool = False
    last_verified: str | None = None  # ISO date, e.g. "2026-10-20"


class MatchRequest(BaseModel):
    resume: ParsedResume
    top_k: int = Field(default=10, ge=1, le=50)
    verified_only: bool = True
    location: str | None = None
    job_type: str | None = None


class JobMatch(BaseModel):
    job: Job
    score: float = Field(ge=0, le=100)
    matched_skills: list[str]
    missing_skills: list[str]
    rationale: str


# ---------- Skill gap & prep plan ----------


class SkillGapRequest(BaseModel):
    resume: ParsedResume
    job_id: str


class MissingSkill(BaseModel):
    skill: str
    priority: Literal["high", "medium", "low"]
    why: str


class SkillGap(BaseModel):
    job_id: str
    job_title: str
    coverage_pct: float = Field(ge=0, le=100)
    matched: list[str]
    missing: list[MissingSkill]


class PrepPlanRequest(BaseModel):
    gap: SkillGap
    weeks: int = Field(default=4, ge=1, le=12)
    hours_per_week: int = Field(default=8, ge=1, le=60)


class Resource(BaseModel):
    title: str
    url: str | None = None
    kind: Literal["course", "docs", "practice", "project", "video"] = "docs"


class PlanWeek(BaseModel):
    week: int
    focus: str
    tasks: list[str]
    resources: list[Resource] = Field(default_factory=list)


class PrepPlan(BaseModel):
    job_id: str
    total_weeks: int
    weeks: list[PlanWeek]


# ---------- Interview practice ----------


class InterviewRequest(BaseModel):
    resume: ParsedResume
    job_id: str
    num_questions: int = Field(default=5, ge=1, le=15)


class InterviewQuestion(BaseModel):
    id: str
    question: str
    kind: Literal["technical", "behavioural", "hr"]
    focus_skill: str | None = None


class EvaluateRequest(BaseModel):
    job_id: str
    question: InterviewQuestion
    answer: str


class AnswerFeedback(BaseModel):
    score: int = Field(ge=0, le=10)
    strengths: list[str]
    improvements: list[str]
    sample_answer: str | None = None
