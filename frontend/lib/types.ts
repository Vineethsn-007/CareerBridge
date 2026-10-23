// Mirrors backend/app/schemas.py. Change both in the same PR.

export interface Education {
  institution: string;
  degree?: string | null;
  year?: string | null;
}

export interface Experience {
  title: string;
  company?: string | null;
  duration?: string | null;
  summary?: string | null;
  // Additive (resume parsing agent):
  start_date?: string | null;
  end_date?: string | null;
  duration_months?: number | null;
  technologies?: string[];
  impact?: string[];
  seniority?: string | null;
}

export interface Certification {
  name: string;
  issuer?: string | null;
  year?: string | null;
}

export type SkillEvidenceCategory = "work experience" | "project" | "listed only";

export interface SkillEvidence {
  skill: string;
  category: SkillEvidenceCategory;
  weighted_strength: number;
  proficiency?: string | null;
  years?: number | null;
}

export interface ResumeInsight {
  text: string;
  evidence?: string | null;
}

export interface ResumeInsights {
  strengths: ResumeInsight[];
  gaps: ResumeInsight[];
  summary?: string | null;
  target_roles: string[];
  tips: string[];
}

export interface ParsedResume {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  summary?: string | null;
  skills: string[];
  education: Education[];
  experience: Experience[];
  projects: string[];
  raw_text: string;
  // Additive (resume parsing agent): always present in API payloads since the
  // agent PR; optional here so hand-built demo objects stay valid.
  skill_evidence?: SkillEvidence[];
  certifications?: Certification[];
  total_experience_months?: number | null;
  insights?: ResumeInsights | null;
}

export type JobType = "full-time" | "internship" | "part-time" | "contract";
export type ExperienceLevel = "fresher" | "junior" | "mid" | "senior";

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  job_type: JobType;
  experience_level: ExperienceLevel;
  skills_required: string[];
  description: string;
  source_url: string;
  verified: boolean;
  last_verified?: string | null;
}

export interface MatchRequest {
  resume: ParsedResume;
  top_k?: number;
  verified_only?: boolean;
  location?: string | null;
  job_type?: string | null;
}

export interface JobMatch {
  job: Job;
  score: number;
  matched_skills: string[];
  missing_skills: string[];
  rationale: string;
}

export interface SkillGapRequest {
  resume: ParsedResume;
  job_id: string;
}

export type Priority = "high" | "medium" | "low";

export interface MissingSkill {
  skill: string;
  priority: Priority;
  why: string;
}

export interface SkillGap {
  job_id: string;
  job_title: string;
  coverage_pct: number;
  matched: string[];
  missing: MissingSkill[];
}

export interface PrepPlanRequest {
  gap: SkillGap;
  weeks?: number;
  hours_per_week?: number;
}

export interface Resource {
  title: string;
  url?: string | null;
  kind: "course" | "docs" | "practice" | "project" | "video";
}

export interface PlanWeek {
  week: number;
  focus: string;
  tasks: string[];
  resources: Resource[];
}

export interface PrepPlan {
  job_id: string;
  total_weeks: number;
  weeks: PlanWeek[];
}

export interface InterviewRequest {
  resume: ParsedResume;
  job_id: string;
  num_questions?: number;
}

export interface InterviewQuestion {
  id: string;
  question: string;
  kind: "technical" | "behavioural" | "hr";
  focus_skill?: string | null;
}

export interface EvaluateRequest {
  job_id: string;
  question: InterviewQuestion;
  answer: string;
}

export interface AnswerFeedback {
  score: number;
  strengths: string[];
  improvements: string[];
  sample_answer?: string | null;
}
