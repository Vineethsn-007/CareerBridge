# Work split (4 people)

**Principle: contract first, folders second.** `backend/app/schemas.py` defines every request and
response, and every endpoint already returns schema-valid baseline data. So nobody waits for
anyone: the frontend builds against the real API on day one, and each backend person upgrades
their own service behind a stable interface.

Rename A/B/C/D to real names and update `.github/CODEOWNERS`.

## Ownership at a glance

| | Role | Owns (folders) | Touches rarely |
|---|---|---|---|
| **A** (Vineeth) | Lead: platform, parser, integration | `.github/`, `backend/app/core/`, `schemas.py`, `services/parser/`, deployment | everything, via review |
| **B** | Jobs data + matching | `services/jobs/`, `services/matching/`, `app/data/` | `core/taxonomy.py` (ask C) |
| **C** | Skill gap, prep plan, interview | `services/skills/`, `services/interview/`, `core/taxonomy.py` (after A's first version) | |
| **D** | Frontend + demo polish | `frontend/` | `lib/types.ts` (with A) |

## A: Lead, platform, parser, integration

Unblock others first, then build features.

1. Repo setup, CI, branch protection, invites (README "One-time repo setup"). Target: first hour.
2. Freeze the v1 contract in `schemas.py` and walk the team through it in a 10-minute call.
3. `core/llm.py`: wire one real provider (Gemini free tier, OpenAI or Anthropic), with JSON
   output, retries and a timeout. Everyone else imports `complete()` / `complete_json()`.
   Share the API key through a password manager or the host's secret store, never in git.
4. **Parser** (`services/parser/`): keep the regex baseline as a fallback, then add DOCX
   support (`python-docx`) and LLM extraction of education, experience and projects into
   `ParsedResume`. Test on 5 to 10 real, messy resumes (two-column PDFs are the usual failure).
5. Deployment: backend on Render/Railway/Fly, frontend on Vercel, CORS origins set via
   `CORS_ORIGINS`, health check on `/api/health`. Do a deploy rehearsal early, not at the deadline.
6. Integration owner: run the full journey (upload, matches, gap, plan, interview) daily and
   file issues for whatever breaks. Own the demo script and pitch with D.

**Done when:** a messy PDF/DOCX resume becomes a clean `ParsedResume` and the live demo URL works.

## B: Jobs data + matching

The "verified listings" promise is your responsibility, and it is the project's differentiator.

1. **Dataset** in `app/data/jobs.json`: aim for 50 to 100 real fresher/intern listings across
   roles (web, data, ML, QA, embedded/IoT, support). Each needs `source_url` (official apply
   page), `verified: true` and `last_verified` (the date you checked it). Good sources:
   company careers pages, the National Career Service portal, Apprenticeship India, college
   placement boards. Remove the five `SAMPLE` entries when real ones land. Do not invent
   listings; an honest small dataset beats a fake large one.
2. **Matching** (`services/matching/`): upgrade the skill-overlap baseline to blend
   (a) weighted skill overlap, (b) embedding similarity between resume text and job
   description (sentence-transformers `all-MiniLM-L6-v2` runs on CPU), (c) experience-level
   and location/job-type filters. Return a human-readable `rationale`.
3. Sanity-check ranking by hand-labelling about 10 resume/job pairs ("should rank high / low").
   Add them as tests. This doubles as your demo evidence.
4. If listings get stale, add a small script that flags entries whose `source_url` no longer
   responds.

**Done when:** `POST /api/match` returns sensible, explained rankings over real verified jobs.

## C: Skill gap, prep plan, interview practice

All three features share prompts, an LLM client and a skill vocabulary, so one person keeps them
coherent.

1. **Taxonomy** (`core/taxonomy.py`): add synonyms (JS = JavaScript, ML = Machine Learning),
   categories and aliases so the parser, matcher and gap analysis speak the same language.
   Coordinate with A (parser) and B (matching) on the interface.
2. **Skill gap** (`services/skills/`): priority (high/medium/low) from how central a skill is
   to the job, plus a short "why it matters" per missing skill.
3. **Prep plan**: weekly plan sized by `weeks` and `hours_per_week`. Use a **hand-curated
   skill-to-resource map** (official docs, NPTEL, freeCodeCamp, etc.) for links; let the LLM
   write tasks but not URLs, because invented links kill credibility.
4. **Interview** (`services/interview/`): technical, behavioural and HR questions tailored to
   the resume and the job; rubric-based answer evaluation (score, strengths, improvements,
   sample answer) with STAR guidance for behavioural questions.
5. Keep prompts in `prompts.py` files next to each service, request JSON output, and validate
   it with the pydantic models; fall back to the baseline if the LLM call or parsing fails.

**Done when:** a missing-skills list turns into a believable 4-week plan and a mock interview
that gives useful feedback.

## D: Frontend + demo polish

Build against the running backend; `lib/api.ts` and `lib/types.ts` already exist.

1. App shell and navigation, loading and error states everywhere (the LLM calls are slow).
2. **Resume upload** page: drag and drop, show the parsed result, let the user edit skills
   before matching (parser mistakes happen; editability builds trust).
3. **Matches dashboard**: ranked cards with score, matched/missing skills, "Verified" badge
   with `last_verified`, link out to `source_url`; filters for location and job type.
4. **Job detail + skill gap**: coverage meter, missing skills by priority.
5. **Prep plan** view: week-by-week checklist.
6. **Interview practice**: question-by-question chat style UI with feedback after each answer.
7. Keep the resume in React state plus `localStorage` so refreshes do not lose it.
8. Mobile-first and light on data (many users are on phones and slow connections).
   Stretch: Hindi/Kannada UI labels, which fits the "accessibility for Indian youth" theme.
9. In the last day: screenshots, demo video and the slides with A.

**Done when:** a first-time user completes the whole journey on a phone without help.

## Timeline

| Phase | Who | What |
|---|---|---|
| **0. Foundation** (first 1 to 2 h) | A | Repo, CI, protection, invites, contract frozen, LLM wrapper |
| **1. Parallel build** (bulk of time) | A, B, C, D | Each person on their folder; small PRs, merged often |
| **2. Integration** (about 40% from the end) | A leads, all | Real data and LLM wired through the full journey; fix bugs found by the daily run |
| **3. Feature freeze** (last 6 to 8 h) | All | Bug-fix PRs only; deployment verified |
| **4. Demo prep** (last 2 to 3 h) | A, D lead | Scripted demo on the deployed app, backup recording, slides |

## Handoffs and dependencies

- A to everyone: frozen `schemas.py` + `core/llm.py` (phase 0).
- B to C: skill names in job listings must come from the shared taxonomy; B proposes new
  skills, C adds them.
- A (parser) to B and C: `ParsedResume.skills` uses canonical taxonomy names.
- D to backend owners: report any missing field early; the contract can grow, not shrink.

## Cross-review pairs (so approvals are never a bottleneck)

A reviews B and D; B reviews A; C reviews A and B; D reviews C. Anyone may approve any PR,
so the pairs just say who to ping first.

## Definition of done for any task

Code merged to `main` through a PR, tests added where there is logic, `make check` green,
and the part of the user journey it affects still works end to end.
