"""API contract. THIS FILE IS THE SOURCE OF TRUTH.

Changing a model here means changing `frontend/lib/types.ts` in the same PR
and telling the team in chat. Add fields freely; avoid renaming/removing them.
"""

from __future__ import annotations

from typing import Any, Literal

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
    # Additive (Task 4 scraper): direct application link when one is verified.
    apply_url: str | None = None


class MatchRequest(BaseModel):
    resume: ParsedResume
    top_k: int = Field(default=10, ge=1, le=50)
    verified_only: bool = True
    location: str | None = None
    job_type: str | None = None
    persona: PersonaInput | None = None


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


# ---------- Admin scraping (Task 4, additive) ----------


class AdminScrapeRequest(BaseModel):
    company: str | None = None  # None -> every enabled source
    dry_run: bool = False


class SourceReport(BaseModel):
    company: str
    ats: str
    fetched: int = 0
    india_matches: int = 0
    accepted: int = 0
    verified: int = 0
    rejected: int = 0
    skipped: int = 0
    errors: list[str] = Field(default_factory=list)
    created: int = 0
    updated: int = 0
    stale_disabled: int = 0


class ScrapeRunReport(BaseModel):
    started_at: str
    dry_run: bool
    sources: list[SourceReport] = Field(default_factory=list)


# ---------- Persona Q&A (additive, Task 3) ----------

PersonaTopic = Literal[
    "leadership", "teamwork", "ownership", "communication", "initiative", "learning agility"
]


class PersonaStartRequest(BaseModel):
    resume: ParsedResume | None = None
    resume_profile_id: int | None = None


class PersonaQuestion(BaseModel):
    index: int = Field(ge=1)
    topic: PersonaTopic
    question: str


class PersonaStartResponse(BaseModel):
    persona_id: int
    resume_profile_id: int
    total_questions: int
    completed: bool = False
    question: PersonaQuestion


class PersonaAnswerRequest(BaseModel):
    persona_id: int
    question: PersonaQuestion
    answer: str | None = None
    skip: bool = False


class PersonaStrength(BaseModel):
    """A strength the candidate described in their own words, with a direct quote."""

    strength: str
    quote: str
    topic: PersonaTopic


class PersonaProfileResult(BaseModel):
    persona_id: int
    resume_profile_id: int
    strengths: list[PersonaStrength] = Field(default_factory=list)
    summary: str | None = None
    confidence: Literal["high", "medium", "low"] = "low"
    completed: bool = True


class PersonaAnswerResponse(BaseModel):
    completed: bool
    question: PersonaQuestion | None = None
    profile: PersonaProfileResult | None = None


# ---------- Interview Sessions & Plan ----------


class PersonaInput(BaseModel):
    summary: str | None = None
    strengths: list[str] = Field(default_factory=list)
    confidence: str | None = None
    answers: list[dict[str, str]] = Field(default_factory=list)


class InterviewPlanQuestion(BaseModel):
    id: str
    text: str
    type: Literal["warmup", "project", "technical", "behavioural", "closing"]
    focus_skill_or_project: str | None = None
    difficulty: Literal["easy", "medium", "hard"]
    expected_key_points: list[str] = Field(default_factory=list)
    follow_up: str | None = None
    time_guide_seconds: int = 120


class InterviewPlan(BaseModel):
    job_id: str
    role_title: str
    company_name: str
    questions: list[InterviewPlanQuestion]


class ClientQuestion(BaseModel):
    id: str
    text: str
    type: Literal["warmup", "project", "technical", "behavioural", "closing"]
    focus_skill_or_project: str | None = None
    difficulty: Literal["easy", "medium", "hard"]
    time_guide_seconds: int = 120


class InterviewSessionCreate(BaseModel):
    resume: ParsedResume
    job_id: str
    persona: PersonaInput | None = None
    num_questions: int = Field(default=5, ge=1, le=15)
    duration_minutes: int | None = Field(default=15, ge=5, le=60)
    consent_recording: bool = False
    consent_transcript: bool = True
    consent_integrity: bool = False


class InterviewSessionResponse(BaseModel):
    session_id: str
    job_id: str
    role_title: str
    company_name: str
    status: str
    num_questions: int
    duration_minutes: int
    questions: list[ClientQuestion]
    conversation_url: str | None = None
    created_at: str
    consent_recording: bool = False
    consent_transcript: bool = True
    consent_integrity: bool = False
    has_report: bool = False


class TavusWebhookPayload(BaseModel):
    event_type: str
    conversation_id: str
    message_type: str | None = None
    timestamp: str | None = None
    webhook_url: str | None = None
    properties: dict[str, Any] = Field(default_factory=dict)


class EndInterviewRequest(BaseModel):
    reason: str | None = None


# ---------- Task 4: Interview Evaluation & Report ----------


class QuestionEvaluation(BaseModel):
    question_id: str
    question_text: str
    question_type: str = "technical"
    focus_skill_or_project: str | None = None
    difficulty: str = "medium"
    score: float = Field(ge=0.0, le=10.0, description="Score from 0 to 10")
    candidate_answer: str = ""
    covered_points: list[str] = Field(default_factory=list)
    missed_points: list[str] = Field(default_factory=list)
    strengths: list[str] = Field(default_factory=list)
    improvements: list[str] = Field(default_factory=list)
    sample_answer: str = ""


class CommunicationMetrics(BaseModel):
    words_per_minute: float = 0.0
    filler_word_count: int = 0
    filler_percentage: float = 0.0
    filler_breakdown: dict[str, int] = Field(default_factory=dict)
    average_answer_duration_seconds: float = 0.0
    average_answer_words: float = 0.0
    long_pauses_count: int = 0
    skipped_questions_count: int = 0
    clarity_score: float = Field(default=8.0, ge=0.0, le=10.0)
    conciseness_score: float = Field(default=8.0, ge=0.0, le=10.0)
    confidence_score: float = Field(default=8.0, ge=0.0, le=10.0)
    star_structure_score: float = Field(default=8.0, ge=0.0, le=10.0)


class IntegritySummary(BaseModel):
    integrity_score: int = 100
    total_events: int = 0
    tab_switch_count: int = 0
    fullscreen_exit_count: int = 0
    face_missing_count: int = 0
    multiple_faces_count: int = 0
    flags: list[str] = Field(default_factory=list)


class ReportNextStep(BaseModel):
    title: str
    skill: str
    action: str
    url: str | None = None
    kind: str = "practice"


class InterviewReport(BaseModel):
    session_id: str
    job_id: str
    role_title: str
    company_name: str
    candidate_name: str | None = None
    overall_score: int = Field(ge=0, le=100)
    readiness_level: str = "Nearly Ready"
    summary: str
    top_strengths: list[str] = Field(default_factory=list)
    top_improvements: list[str] = Field(default_factory=list)
    next_steps: list[ReportNextStep] = Field(default_factory=list)
    question_evaluations: list[QuestionEvaluation] = Field(default_factory=list)
    communication_metrics: CommunicationMetrics = Field(default_factory=CommunicationMetrics)
    presentation_cues: list[str] | None = None
    integrity_summary: IntegritySummary | None = None
    created_at: str


# ---------- Resume Tailoring (Task: resume-tailoring-agent) ----------


class TailoredExperience(BaseModel):
    """A rewritten experience entry; only facts from the source profile."""

    title: str
    company: str | None = None
    duration: str | None = None
    bullets: list[str] = Field(default_factory=list)


class TailoredProject(BaseModel):
    """A selected/reordered project entry from the source profile."""

    name: str
    description: str | None = None
    highlights: list[str] = Field(default_factory=list)


class ChangeEntry(BaseModel):
    """One atomic change the agent made, with its rationale."""

    section: str  # e.g. "headline", "summary", "experience[0]"
    what: str  # short description of the change
    why: str  # reason (job keyword matched, relevance, etc.)


class TailoredResume(BaseModel):
    """AI-tailored resume content derived strictly from the candidate's profile."""

    # Core sections
    headline: str
    summary: str
    skills_grouped: dict[str, list[str]] = Field(default_factory=dict)
    experience: list[TailoredExperience] = Field(default_factory=list)
    projects: list[TailoredProject] = Field(default_factory=list)
    education: list[Education] = Field(default_factory=list)
    certifications: list[Certification] = Field(default_factory=list)

    # Metadata
    change_log: list[ChangeEntry] = Field(default_factory=list)
    ats_keywords_matched: list[str] = Field(default_factory=list)
    gaps_not_added: list[str] = Field(default_factory=list)

    # ATS scores (0-100) computed by the deterministic skill-score function
    ats_score_before: float = Field(default=0.0, ge=0, le=100)
    ats_score_after: float = Field(default=0.0, ge=0, le=100)


class TailorRequest(BaseModel):
    """Body for POST /api/resume/tailor."""

    job_id: str
    # The caller may pass the current parsed resume or rely on the stored one.
    resume: ParsedResume | None = None


class TailoredResumeRecord(BaseModel):
    """Persisted tailored-resume record returned by the API."""

    id: int
    user_id: str
    job_id: str
    version: int
    content: TailoredResume
    created_at: str


class TailoredResumeListItem(BaseModel):
    """Slim version list entry (no full content)."""

    id: int
    version: int
    job_id: str
    ats_score_after: float
    created_at: str
