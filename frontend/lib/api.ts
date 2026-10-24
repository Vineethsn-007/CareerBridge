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
  InterviewReport,
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
  TailoredResume,
  TailorRequest,
  TailoredResumeRecord,
  TailoredResumeListItem,
} from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const USER_ID_STORAGE_KEY = "careerbridge_user_id";

export function getBrowserUserId(): string {
  if (typeof window === "undefined") {
    return "00000000-0000-0000-0000-000000000000";
  }
  let id = localStorage.getItem(USER_ID_STORAGE_KEY);
  if (!id) {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      id = crypto.randomUUID();
    } else {
      id = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    }
    localStorage.setItem(USER_ID_STORAGE_KEY, id);
  }
  return id;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/api${path}`, init);
  } catch (err) {
    console.error(`Network error connecting to API at ${BASE_URL}/api${path}:`, err);
    throw new Error(
      "Unable to connect to the CareerBridge backend server. Please verify the backend is running on port 8000."
    );
  }

  const headers = new Headers(init?.headers);
  if (!headers.has("X-User-ID")) {
    headers.set("X-User-ID", getBrowserUserId());
  }

  const res = await fetch(`${BASE_URL}/api${path}`, {
    ...init,
    headers,
  });

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

function put<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: "PUT",
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
  },
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
  getInterviewReport(sessionId: string): Promise<InterviewReport> {
    return request<InterviewReport>(`/interview/sessions/${encodeURIComponent(sessionId)}/report`);
  },
  deleteInterviewData(sessionId: string): Promise<{ status: string; session_id: string }> {
    return request<{ status: string; session_id: string }>(
      `/interview/sessions/${encodeURIComponent(sessionId)}/data`,
      { method: "DELETE" }
    );
  },

  // ---------- Resume Tailoring API ----------
  tailorResume(body: TailorRequest): Promise<TailoredResumeRecord> {
    return post<TailoredResumeRecord>("/resume/tailor", body);
  },
  getTailoredResume(id: number): Promise<TailoredResumeRecord> {
    return request<TailoredResumeRecord>(`/resume/tailored/${id}`);
  },
  updateTailoredResume(id: number, content: TailoredResume): Promise<TailoredResumeRecord> {
    return put<TailoredResumeRecord>(`/resume/tailored/${id}`, content);
  },
  listTailoredResumes(jobId?: string): Promise<TailoredResumeListItem[]> {
    const qs = jobId ? `?job_id=${encodeURIComponent(jobId)}` : "";
    return request<TailoredResumeListItem[]>(`/resume/tailored${qs}`);
  },
  async downloadTailoredResume(id: number, format: "pdf" | "docx", filename?: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/api/resume/tailored/${id}/download?format=${format}`, {
      headers: { "X-User-ID": getBrowserUserId() },
    });
    if (!res.ok) {
      throw new Error(`Failed to download ${format.toUpperCase()} resume.`);
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || `tailored_resume_${id}.${format}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
};
