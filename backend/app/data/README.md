# CareerBridge Job Listings Dataset (Teammate B)

This directory manages the core job listings dataset for the CareerBridge platform.

## Directory Structure

* **`jobs.json`**: The canonical compiled JSON file loaded by `backend/app/services/jobs/service.py`.
* **`jobs_template.csv`**: The curated source CSV spreadsheet containing listing records.
* **`import_jobs.py`**: Automated conversion, validation, and CLI tool that parses CSV data and atomically compiles `jobs.json`.

---

## Confirmed Vacancies vs. Representative Role Profiles

CareerBridge distinguishes between **confirmed, live vacancies** and **unverified representative role profiles**:

1. **Representative Role Profiles (`verified: false`, `last_verified: null`):**
   * Curated profiles reflecting typical entry-level and fresher opportunities across Web Development, Data Analytics, Machine Learning, QA, Embedded/IoT, and Technical Support.
   * Source URLs point to general company careers landing pages, national employment services (`ncs.gov.in`), or apprenticeship search portals (`apprenticeshipindia.gov.in/apprenticeship/opportunity-search`).
   * **Important:** These general careers and portal links serve as **reference destinations**, not confirmed proof of an individual active vacancy.
   * In `/api/match`, `MatchRequest.verified_only` defaults to `true`. When all records are unverified, `/api/match` returns an empty list unless the caller explicitly passes `"verified_only": false`.

2. **Confirmed Live Vacancies (`verified: true`, `last_verified: "YYYY-MM-DD"`):**
   * Requires that a human reviewer has personally opened the specific application URL, inspected the job posting, and confirmed active vacancy status on that date.
   * The `source_url` must link directly to the specific job requisition or official application form.

---

## Data Schema & Field Constraints

Every record must strictly satisfy the `Job` model defined in `backend/app/schemas.py`:

| Field | Type | Rules & Allowed Values |
|---|---|---|
| `id` | `str` | Unique listing identifier (e.g. `job-web-001`). Rejects duplicates. |
| `title` | `str` | Job title (e.g. `Junior Python Backend Developer`). |
| `company` | `str` | Organisation name. |
| `location` | `str` | Job city or `Remote` (e.g. `Bengaluru`, `Hyderabad`). |
| `job_type` | `str` | `full-time`, `internship`, `part-time`, `contract`. |
| `experience_level` | `str` | `fresher`, `junior`, `mid`, `senior`. |
| `skills_required` | `list[str]` | Semicolon-delimited (`Python;SQL;Git`). **Must strictly belong to `backend/app/core/taxonomy.py`.** |
| `description` | `str` | Summary of role duties and scope. |
| `source_url` | `str` | Valid `http://` or `https://` URL. Rejects `example.com`, incomplete NCS URLs, and fabricated opportunity slugs. |
| `verified` | `bool` | `true` if manually confirmed by a human; `false` otherwise. |
| `last_verified` | `str \| null` | ISO date (`YYYY-MM-DD`). Required if `verified=true`; must be empty if `verified=false`. |

---

## Importer CLI Usage

The validation engine can be run directly from the command line:

```bash
# From the backend/ directory:
python -m app.data.import_jobs

# With custom paths:
python -m app.data.import_jobs --csv path/to/input.csv --json path/to/output.json

# View help and options:
python -m app.data.import_jobs --help
```

### Exit Codes & Behavior
* **Exit code 0:** All records passed validation; the destination JSON file was updated atomically.
* **Exit code 1:** One or more validation errors occurred; errors are printed with CSV row numbers and the destination JSON file remains completely unchanged.

---

## Verification Workflow for Human Reviewers

To transition a representative listing to a verified vacancy:

1. **Locate an active requisition:** Open the company careers portal or portal search link in a browser and find an open, specific vacancy.
2. **Update the record in `jobs_template.csv`:**
   * Replace `source_url` with the exact URL of the specific vacancy page.
   * Set `verified` to `true`.
   * Set `last_verified` to today's date in `YYYY-MM-DD` format (e.g., `2026-10-23`).
3. **Recompile `jobs.json`:**
   ```bash
   python -m app.data.import_jobs
   ```
