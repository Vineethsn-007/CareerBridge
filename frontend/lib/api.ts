import type {
  AnswerFeedback,
  EvaluateRequest,
  InterviewQuestion,
  InterviewRequest,
  InterviewSessionCreate,
  InterviewSessionResponse,
  EndInterviewRequest,
  IntegrityEvent,
  IntegrityReportResponse,
  Job,
  JobMatch,
  MatchRequest,
  ParsedResume,
  PersonaAnswerRequest,
  PersonaAnswerResponse,
  PersonaStartRequest,
  PersonaStartResponse,
  PrepPlan,
  PrepPlanRequest,
  SkillGap,
  SkillGapRequest,
} from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}/api${path}`, init);
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      if (typeof body?.detail === "string") detail = body.detail;
    } catch {
      // keep statusText
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

function post<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export const api = {
  parseResume(file: File): Promise<ParsedResume> {
    const form = new FormData();
    form.append("file", file);
    return request<ParsedResume>("/resume/parse", { method: "POST", body: form });
  },
  listJobs(params: { verifiedOnly?: boolean; q?: string } = {}): Promise<Job[]> {
    const qs = new URLSearchParams();
    if (params.verifiedOnly) qs.set("verified_only", "true");
    if (params.q) qs.set("q", params.q);
    const suffix = qs.toString() ? `?${qs}` : "";
    return request<Job[]>(`/jobs${suffix}`);
  },
  getJob(id: string): Promise<Job> {
    return request<Job>(`/jobs/${encodeURIComponent(id)}`);
  },
  match(body: MatchRequest): Promise<JobMatch[]> {
    return post<JobMatch[]>("/match", body);
  },
  skillGap(body: SkillGapRequest): Promise<SkillGap> {
    return post<SkillGap>("/skills/gap", body);
  },
  prepPlan(body: PrepPlanRequest): Promise<PrepPlan> {
    return post<PrepPlan>("/skills/plan", body);
  },
  interviewQuestions(body: InterviewRequest): Promise<InterviewQuestion[]> {
    return post<InterviewQuestion[]>("/interview/questions", body);
  },
  evaluateAnswer(body: EvaluateRequest): Promise<AnswerFeedback> {
    return post<AnswerFeedback>("/interview/evaluate", body);
  },
  personaStart(body: PersonaStartRequest): Promise<PersonaStartResponse> {
    return post<PersonaStartResponse>("/persona/start", body);
  },
  personaAnswer(body: PersonaAnswerRequest): Promise<PersonaAnswerResponse> {
    return post<PersonaAnswerResponse>("/persona/answer", body);
  createInterviewSession(body: InterviewSessionCreate): Promise<InterviewSessionResponse> {
    return post<InterviewSessionResponse>("/interview/sessions", body);
  },
  getInterviewSession(sessionId: string): Promise<InterviewSessionResponse> {
    return request<InterviewSessionResponse>(`/interview/sessions/${encodeURIComponent(sessionId)}`);
  },
  endInterviewSession(sessionId: string, body?: EndInterviewRequest): Promise<InterviewSessionResponse> {
    return post<InterviewSessionResponse>(`/interview/sessions/${encodeURIComponent(sessionId)}/end`, body ?? {});
  },
  logIntegrityEvents(sessionId: string, events: IntegrityEvent[]): Promise<IntegrityReportResponse> {
    return post<IntegrityReportResponse>(`/interview/sessions/${encodeURIComponent(sessionId)}/integrity`, { events });
  },
};
