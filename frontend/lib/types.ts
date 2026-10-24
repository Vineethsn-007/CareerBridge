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
  // Additive (Task 4 scraper): direct application link when verified.
  apply_url?: string | null;
}

// Additive (Task 4 scraper): admin scrape trigger/report.
export interface AdminScrapeRequest {
  company?: string | null;
  dry_run?: boolean;
}

export interface ScrapeSourceReport {
  company: string;
  ats: string;
  fetched: number;
  india_matches: number;
  accepted: number;
  verified: number;
  rejected: number;
  skipped: number;
  errors: string[];
  created: number;
  updated: number;
  stale_disabled: number;
}

export interface ScrapeRunReport {
  started_at: string;
  dry_run: boolean;
  sources: ScrapeSourceReport[];
}

export interface MatchRequest {
  resume: ParsedResume;
  top_k?: number;
  verified_only?: boolean;
  location?: string | null;
  job_type?: string | null;
  persona?: PersonaInput | null;
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

// ---------- Persona Q&A (additive) ----------

export type PersonaTopic =
  | "leadership"
  | "teamwork"
  | "ownership"
  | "communication"
  | "initiative"
  | "learning agility";

export interface PersonaStartRequest {
  resume?: ParsedResume | null;
  resume_profile_id?: number | null;
}

export interface PersonaQuestion {
  index: number;
  topic: PersonaTopic;
  question: string;
}

export interface PersonaStartResponse {
  persona_id: number;
  resume_profile_id: number;
  total_questions: number;
  completed: boolean;
  question: PersonaQuestion;
}

export interface PersonaAnswerRequest {
  persona_id: number;
  question: PersonaQuestion;
  answer?: string | null;
  skip?: boolean;
}

export interface PersonaStrength {
  strength: string;
  quote: string;
  topic: PersonaTopic;
}

export interface PersonaProfileResult {
  persona_id: number;
  resume_profile_id: number;
  strengths: PersonaStrength[];
  summary?: string | null;
  confidence: "high" | "medium" | "low";
  completed: boolean;
}

export interface PersonaAnswerResponse {
  completed: boolean;
  question?: PersonaQuestion | null;
  profile?: PersonaProfileResult | null;
}

// ---------- Interview Sessions & Plan ----------

export interface PersonaInput {
  summary?: string | null;
  strengths?: string[];
  confidence?: string | null;
  answers?: Record<string, string>[];
}

export type QuestionType = "warmup" | "project" | "technical" | "behavioural" | "closing";
export type QuestionDifficulty = "easy" | "medium" | "hard";

export interface ClientQuestion {
  id: string;
  text: string;
  type: QuestionType;
  focus_skill_or_project?: string | null;
  difficulty: QuestionDifficulty;
  time_guide_seconds: number;
}

export interface InterviewSessionCreate {
  resume: ParsedResume;
  job_id: string;
  persona?: PersonaInput | null;
  num_questions?: number;
  duration_minutes?: number | null;
  consent_recording?: boolean;
  consent_transcript?: boolean;
  consent_integrity?: boolean;
}

export interface InterviewSessionResponse {
  session_id: string;
  job_id: string;
  role_title: string;
  company_name: string;
  status: string;
  num_questions: number;
  duration_minutes: number;
  questions: ClientQuestion[];
  conversation_url?: string | null;
  created_at: string;
  consent_recording?: boolean;
  consent_transcript?: boolean;
  consent_integrity?: boolean;
  has_report?: boolean;
}

export interface TavusWebhookPayload {
  event_type: string;
  conversation_id: string;
  message_type?: string | null;
  timestamp?: string | null;
  webhook_url?: string | null;
  properties?: Record<string, unknown>;
}

export interface EndInterviewRequest {
  reason?: string | null;
}
export interface IntegrityEvent {
  event_type: "tab_switch" | "window_blur" | "fullscreen_exit" | "multiple_faces" | "no_face";
  timestamp: string;
  details?: Record<string, unknown>;
}

export interface IntegrityReportResponse {
  status: string;
  integrity_score: number;
  total_events: number;
}

// ---------- Task 4: Interview Evaluation & Report ----------

export interface QuestionEvaluation {
  question_id: string;
  question_text: string;
  question_type: string;
  focus_skill_or_project?: string | null;
  difficulty: string;
  score: number;
  candidate_answer: string;
  covered_points: string[];
  missed_points: string[];
  strengths: string[];
  improvements: string[];
  sample_answer: string;
}

export interface CommunicationMetrics {
  words_per_minute: number;
  filler_word_count: number;
  filler_percentage: number;
  filler_breakdown: Record<string, number>;
  average_answer_duration_seconds: number;
  average_answer_words: number;
  long_pauses_count: number;
  skipped_questions_count: number;
  clarity_score: number;
  conciseness_score: number;
  confidence_score: number;
  star_structure_score: number;
}

export interface IntegritySummary {
  integrity_score: number;
  total_events: number;
  tab_switch_count: number;
  fullscreen_exit_count: number;
  face_missing_count: number;
  multiple_faces_count: number;
  flags: string[];
}

export interface ReportNextStep {
  title: string;
  skill: string;
  action: string;
  url?: string | null;
  kind: string;
}

export interface InterviewReport {
  session_id: string;
  job_id: string;
  role_title: string;
  company_name: string;
  candidate_name?: string | null;
  overall_score: number;
  readiness_level: string;
  summary: string;
  top_strengths: string[];
  top_improvements: string[];
  next_steps: ReportNextStep[];
  question_evaluations: QuestionEvaluation[];
  communication_metrics: CommunicationMetrics;
  presentation_cues?: string[] | null;
  integrity_summary?: IntegritySummary | null;
  created_at: string;
}



// ---------- Resume Tailoring (Task: resume-tailoring-agent) ----------

export interface TailoredExperience {
  title: string;
  company?: string | null;
  duration?: string | null;
  bullets: string[];
}

export interface TailoredProject {
  name: string;
  description?: string | null;
  highlights: string[];
}

export interface ChangeEntry {
  section: string;
  what: string;
  why: string;
}

export interface TailoredResume {
  headline: string;
  summary: string;
  skills_grouped: Record<string, string[]>;
  experience: TailoredExperience[];
  projects: TailoredProject[];
  education: Education[];
  certifications: Certification[];
  change_log: ChangeEntry[];
  ats_keywords_matched: string[];
  gaps_not_added: string[];
  ats_score_before: number;
  ats_score_after: number;
}

export interface TailorRequest {
  job_id: string;
  resume?: ParsedResume | null;
}

export interface TailoredResumeRecord {
  id: number;
  user_id: string;
  job_id: string;
  version: number;
  content: TailoredResume;
  created_at: string;
}

export interface TailoredResumeListItem {
  id: number;
  version: number;
  job_id: string;
  ats_score_after: number;
  created_at: string;
}
