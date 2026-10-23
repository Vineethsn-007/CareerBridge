"""Verified ATS job scraper (Task 4).

scrapes real listings from public ATS board APIs (Greenhouse, Lever, Ashby,
SmartRecruiters), normalizes them with a Groq LLM agent, validates against the
`Job` contract, verifies every `apply_url` before marking it verified, and
upserts deduplicated rows into the database.

Rules of the road:
- Only the documented public board APIs and the employer submit pages are
  fetched. LinkedIn / Indeed / Naukri / captcha-protected pages are never touched.
- A clear identifying User-Agent is sent on every request and per-host requests
  are throttled (see `http.py`); `link_check.py`-style SSRF guard rules apply.
- The LLM only normalizes content that exists in the fetched listing. It never
  invents titles, skills, salaries, deadlines or URLs. Salary/deadline strings
  are kept only when their text actually appears in the source listing.
- A source that fails is skipped and logged, never replaced with invented data.

CLI:
    python -m app.scraper.run --company "Databricks" [--dry-run]

Admin endpoint (requires the ADMIN_TOKEN setting):
    POST /api/admin/scrape  {"company": "Databricks", "dry_run": false}
"""

from app.scraper.config import CompanyConfig, load_companies
from app.scraper.runner import RunReport, run_scrape

__all__ = ["CompanyConfig", "RunReport", "run_scrape", "load_companies"]
