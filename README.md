# CareerBridge

AI platform that helps Indian students and job seekers find suitable verified jobs, understand
their skill gaps, and prepare for interviews.

**MVP:** resume parser, job matching, skill-gap analysis + prep plan, interview practice.

- Stack: FastAPI (Python 3.11) backend, Next.js 15 + TypeScript frontend
- No database for the MVP: jobs live in `backend/app/data/jobs.json`, and the frontend passes
  the parsed resume with each request (stateless backend, easy to demo and deploy)
- Team split and rules: [docs/WORK_SPLIT.md](docs/WORK_SPLIT.md), [CONTRIBUTING.md](CONTRIBUTING.md)

## Repo layout

```
.
├── .github/
│   ├── workflows/ci.yml          # lint + test + build; "CI gate" is the required check
│   ├── CODEOWNERS                # auto-requests the right reviewer per folder
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── ISSUE_TEMPLATE/task.md
├── backend/
│   ├── app/
│   │   ├── main.py               # FastAPI app
│   │   ├── schemas.py            # API CONTRACT (source of truth)
│   │   ├── api/routes/           # thin HTTP layer, one file per area
│   │   ├── core/                 # config, llm wrapper, skill taxonomy (lead)
│   │   ├── services/
│   │   │   ├── parser/           # resume parsing            (lead)
│   │   │   ├── jobs/             # job store                 (B)
│   │   │   ├── matching/         # resume <-> job scoring    (B)
│   │   │   ├── skills/           # skill gap + prep plan     (C)
│   │   │   └── interview/        # questions + evaluation    (C)
│   │   └── data/jobs.json        # job listings              (B)
│   ├── tests/
│   ├── requirements.txt / requirements-dev.txt
│   └── pyproject.toml            # ruff + pytest config
├── frontend/                     # Next.js app                (D)
│   ├── app/                      # pages
│   └── lib/                      # api.ts (typed client), types.ts (mirrors schemas.py)
├── docs/WORK_SPLIT.md
├── scripts/protect-main.sh       # one-command branch protection
├── Makefile                      # setup / dev / check
└── .pre-commit-config.yaml       # optional local hooks
```

Every endpoint already returns schema-valid data (baseline heuristics), so the frontend can be
built against the real API from the first hour.

## Run locally

```bash
make setup            # backend venv + deps, frontend npm install
make dev-backend      # http://localhost:8000  (Swagger UI at /docs)
make dev-frontend     # http://localhost:3000
make check            # exactly what CI runs: lint, types, tests, build
```

Copy `backend/.env.example` to `backend/.env` and `frontend/.env.example` to
`frontend/.env.local` when you need to change settings. Never commit real keys.

## API (all under `/api`)

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | liveness |
| POST | `/resume/parse` | multipart file (pdf/txt) -> `ParsedResume` |
| GET | `/jobs`, `/jobs/{id}` | list / detail (`verified_only`, `q` params) |
| POST | `/match` | resume -> ranked `JobMatch[]` |
| POST | `/skills/gap` | resume + job -> `SkillGap` |
| POST | `/skills/plan` | gap -> weekly `PrepPlan` |
| POST | `/interview/questions` | resume + job -> `InterviewQuestion[]` |
| POST | `/interview/evaluate` | question + answer -> `AnswerFeedback` |

## One-time repo setup (lead only)

1. **Install the first lockfile** so CI's `npm ci` works:
   ```bash
   cd frontend && npm install && cd ..   # creates package-lock.json
   ```
2. **Create the repo and push `main` directly (this is the only direct push ever):**
   ```bash
   git init -b main && git add . && git commit -m "chore: initial scaffold"
   gh repo create YOUR-ORG-OR-USER/careerbridge --private --source=. --push
   ```
3. **Replace the `@TEAMMATE_*` handles** in `.github/CODEOWNERS` with real usernames and
   merge that via a PR later (or edit before the first commit).
4. **Invite teammates with the Write role** (Settings > Collaborators). Do not give Admin.
5. **Open a throwaway PR once** so the `CI gate` check exists, then lock main:
   ```bash
   ./scripts/protect-main.sh YOUR-ORG-OR-USER/careerbridge
   ```
6. Enable secret scanning + push protection (Settings > Code security).

> **Plan requirement:** branch protection on a *private* repo needs GitHub Pro/Team. The
> GitHub Student Developer Pack gives Pro for free; otherwise make the repo public or use
> an organisation on a paid plan. Without it the rules silently cannot be enforced.

### What `main` enforces after step 5

- No direct pushes, no force pushes, no deletion: everything goes through a pull request
- 1 approving review (stale approvals dismissed on new pushes)
- The `CI gate` check must pass, and the branch must be up to date with `main`
- All review conversations resolved, squash merge only, linear history
- Merged branches are deleted automatically

Admin bypass is left on by default so you can rescue a broken `main` during the hackathon.
Run with `ENFORCE_ADMINS=true` to lock yourself out too, or `CODEOWNERS_REQUIRED=true` to
require the folder owner's approval.

