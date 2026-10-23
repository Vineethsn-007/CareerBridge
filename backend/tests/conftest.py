"""Hermetic test environment, applied before any app module is imported.

`app.core.config._load_env_file()` loads a developer's real `backend/.env`
(overridden=False, real environment always wins), so pytest must pin the
offline settings itself to stay network-free and deterministic:

- `LLM_PROVIDER=mock`: every LLM-backed service falls back to its documented
  baseline instead of making live provider calls.
- `DATABASE_URL=sqlite://`: the app engine points at a throwaway in-memory
  database, so the DB-first API paths exercise the documented fallback to the
  curated file store rather than reading a developer's scraped database.
"""

import os

os.environ["LLM_PROVIDER"] = "mock"
os.environ["DATABASE_URL"] = "sqlite://"
