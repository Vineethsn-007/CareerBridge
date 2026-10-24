# AI Resume Tailoring Agent

CareerBridge provides an AI-powered resume tailoring service designed specifically for Indian college students and fresh graduates. Given a candidate's parsed profile (and optional persona interview results) and a target job listing, the tailoring agent generates a job-aligned, single-column, ATS-friendly resume.

---

## 1. Truthfulness Guarantee (Non-Negotiable)

A core principle of CareerBridge is **absolute truthfulness**. The tailoring agent reorders, selects, and rephrases the candidate's authentic experiences, but **must never hallucinate or fabricate**:
- No unearned skills or technologies.
- No invented employers, job titles, or institutions.
- No fabricated dates or durations.
- No fictitious projects or degrees.
- No invented metrics, percentages, or numbers.

### Two-Layer Enforcement

1. **System Prompt Enforcement (`prompts.py`)**:
   Strict system instructions explicitly forbid inventing facts. If the target job requires skills the candidate lacks, the agent is instructed to place them into `gaps_not_added` rather than weaving them into the resume text.

2. **Code-Level Truthfulness Validator (`validator.py`)**:
   After generation, `validate_and_clean_tailored_resume()` inspects the generated output against the source profile:
   - **Skills Verification**: Every skill in `skills_grouped` is checked against the candidate's parsed skill taxonomy. Unmatched skills are moved to `gaps_not_added`.
   - **Company / Role Verification**: Rewritten experience blocks must match original company names.
   - **Metric / Number Verification**: Any numbers or percentages in generated bullets must appear in the original source bullet or profile; ungrounded numbers cause the bullet to revert to the candidate's original text.
   - **Fallback Mechanism**: If LLM output fails validation twice or if the LLM is unreachable, the system triggers `build_fallback_tailored_resume()`, producing a deterministic, relevance-sorted version of the original profile with zero risk of hallucination.

---

## 2. Rendering Templates (PDF & DOCX)

Tailored resumes are rendered **on demand** from the stored JSON model; raw PDF/DOCX binary files are never stored in the database.

- **ATS-Friendly Single-Column Design**:
  Modern Applicant Tracking Systems (ATS) struggle with multi-column tables, sidebars, and graphics. The template uses a clear single-column structure:
  - Header: Name, Contact Information, LinkedIn / GitHub.
  - Target Role Headline & 2–3 line tailored Summary.
  - Grouped Skills: Core / Must-have competencies prioritized.
  - Relevant Experience: Action verbs, project context, and grounded metrics.
  - Selected Projects: Ordered by alignment with target role.
  - Education & Certifications.

- **DOCX Rendering (`python-docx`)**:
  Builds a pure `.docx` document formatted with standard margins, bullet lists, bold run highlights, and ATS-parseable typography.

- **PDF Rendering (`xhtml2pdf`)**:
  Transforms an HTML/CSS ATS template into a clean PDF using `xhtml2pdf`.
  - **Zero browser dependency**: Does not require Chromium, Puppeteer, or Playwright.
  - Installs cleanly in standard CI/CD pipelines and production Linux containers (Render, Railway, Docker).

---

## 3. User Identity & Ownership Assumption

CareerBridge MVP does not require a complex authentication provider (e.g. Supabase, Firebase) to deliver a seamless user experience.

### Per-Browser Identity (`get_current_user`)
- The frontend client generates a random UUID upon first visit and stores it in `localStorage` under `cb_user_id`.
- Every API request from the frontend automatically attaches this ID via the `X-User-ID` HTTP header (`frontend/lib/api.ts`).
- The backend dependency `get_current_user` (`backend/app/core/auth.py`) extracts and validates this UUID.
- If missing (e.g. raw curl or test client), a transient UUID is used so endpoints function gracefully.

### Ownership & Privacy
- All tailored resume records in the database (`tailored_resumes`) are tied to `user_id`.
- Query endpoints (`GET /api/resume/tailored/{id}`, `PUT /api/resume/tailored/{id}`, `GET /api/resume/tailored/{id}/download`) filter strictly by `user_id`.
- Attempting to access or modify another user's tailored resume returns `HTTP 404 Not Found`.

### Team Swap-In Guide
When migrating to real authentication (e.g. NextAuth, Clerk, Supabase, OAuth JWT):
1. Update `backend/app/core/auth.py` to decode and verify the JWT/session cookie.
2. Return the authenticated user's ID as `str`.
3. Downstream services and endpoints do not need to change.

---

## 4. Environment Variables & Configuration

Configure these variables in your deployment environment (e.g. Render environment settings or `.env`):

| Variable | Description | Default |
|---|---|---|
| `LLM_PROVIDER` | LLM service provider: `groq`, `openai`, or `mock` (used in tests/offline) | `groq` |
| `LLM_API_KEY` | Provider API secret key | *(Required in prod)* |
| `LLM_BASE_URL` | Provider endpoint URL (e.g. `https://api.groq.com/openai/v1`) | `https://api.groq.com/openai/v1` |
| `LLM_MODEL` | Target LLM model (e.g. `openai/gpt-oss-120b` or `llama-3.3-70b-versatile`) | `openai/gpt-oss-120b` |
| `LLM_TIMEOUT` | Provider HTTP timeout in seconds | `30` |
| `DATABASE_URL` | SQLite / PostgreSQL connection string | `sqlite:///./careerbridge.db` |
| `CORS_ORIGINS` | Allowed frontend origins (comma-separated) | `http://localhost:3000` |

### Rate Limiting
- The tailoring generation endpoint (`POST /api/resume/tailor`) is rate-limited per `user_id` to **10 calls per minute** to protect against LLM cost spikes and abuse.
- Exceeding the threshold returns `HTTP 429 Too Many Requests`.

---

## 5. API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/resume/tailor` | Generates a tailored resume for given `job_id` and persists version 1. |
| `GET` | `/api/resume/tailored?job_id={id}` | Lists version history of tailored resumes for the user and target job. |
| `GET` | `/api/resume/tailored/{id}` | Retrieves a tailored resume record by ID (enforces ownership). |
| `PUT` | `/api/resume/tailored/{id}` | Saves user edits as an incremented version (recalculating ATS score). |
| `GET` | `/api/resume/tailored/{id}/download?format=pdf\|docx` | Renders and downloads binary PDF or DOCX file on demand. |
