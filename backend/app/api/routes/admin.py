"""Protected admin routes (Task 4).

POST /api/admin/scrape triggers a scraper run. Authorization compares the
`X-Admin-Token` header against the ADMIN_TOKEN setting with
`secrets.compare_digest`; the token value is never logged or echoed. When no
ADMIN_TOKEN is configured the endpoint reports 503 — scraping is opt-in.
"""

from __future__ import annotations

import secrets
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.db import get_session
from app.schemas import AdminScrapeRequest, ScrapeRunReport
from app.scraper import load_companies, run_scrape

router = APIRouter()


def require_admin_token(x_admin_token: str | None = Header(default=None)) -> None:
    """503 when unset, 401 when wrong; the token value is never logged."""
    if not settings.admin_token:
        raise HTTPException(status_code=503, detail="Admin scraping is not configured.")
    if not x_admin_token or not secrets.compare_digest(x_admin_token, settings.admin_token):
        raise HTTPException(status_code=401, detail="Invalid or missing admin token.")


@router.post(
    "/scrape",
    response_model=ScrapeRunReport,
    dependencies=[Depends(require_admin_token)],
)
def trigger_scrape(
    request: AdminScrapeRequest,
    session: Annotated[Session, Depends(get_session)],
) -> ScrapeRunReport:
    companies = load_companies()
    if request.company:
        wanted = request.company.lower()
        companies = [c for c in companies if c.name.lower() == wanted]
        if not companies:
            raise HTTPException(status_code=404, detail="No enabled source with that name.")
    report = run_scrape(session, companies, dry_run=request.dry_run)
    return ScrapeRunReport(**report.to_dict())
