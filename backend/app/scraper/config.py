"""Scraper source configuration.

Sources live in app/scraper/companies.yaml (yaml.safe_load; no third-party YAML
features are used).  Every entry must be a documented public ATS board with a
real, already-verified token — tokens are never guessed.

Adding a source: verify the board API with a manual request first, confirm the
employer's careers page allows programmatic reading, then add an entry here with
`enabled: true`. Keep `employer_domains` authoritative — verification never
trusts redirect targets outside these domains (plus the ATS host itself).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

import yaml

from app.core.taxonomy import canonical_skill

ATS_TYPES: frozenset[str] = frozenset({"greenhouse", "lever", "ashby", "smartrecruiters"})


@dataclass(frozen=True)
class SectionConfig:
    """One must/nice section block from the LLM normalization prompt."""

    must: list[str] = field(default_factory=list)
    nice: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class CompanyConfig:
    name: str
    ats: str
    token: str
    employer_domains: tuple[str, ...] = ()
    careers_url: str | None = None
    india_only: bool = True
    enabled: bool = True

    def __post_init__(self) -> None:
        if self.ats not in ATS_TYPES:
            raise ValueError(f"Unsupported ATS type {self.ats!r} for {self.name!r}.")
        if not self.token:
            raise ValueError(f"Missing board token for {self.name!r}.")

    @property
    def job_id_prefix(self) -> str:
        """Stable, deterministic job id prefix: ats-token, e.g. greenhouse-databricks-*."""
        slug = self.token.lower().replace("/", "-")
        return f"{self.ats}-{slug}"


def _parse_company(raw: dict) -> CompanyConfig:
    name = str(raw.get("name", "")).strip()
    ats = str(raw.get("ats", "")).strip().lower()
    token = str(raw.get("token", "")).strip()
    domains = tuple(
        str(d).strip().lower() for d in (raw.get("employer_domains") or []) if str(d).strip()
    )
    careers_url = raw.get("careers_url") or None
    return CompanyConfig(
        name=name,
        ats=ats,
        token=token,
        employer_domains=domains,
        careers_url=str(careers_url) if careers_url else None,
        india_only=bool(raw.get("india_only", True)),
        enabled=bool(raw.get("enabled", True)),
    )


def load_companies(path: Path | None = None) -> list[CompanyConfig]:
    """Load the enabled companies from companies.yaml. Unknown formats raise."""
    config_path = path or Path(__file__).parent / "companies.yaml"
    with open(config_path, encoding="utf-8") as f:
        payload = yaml.safe_load(f) or {}
    entries = payload.get("companies")
    if not isinstance(entries, list):
        raise ValueError(f"{config_path} must contain a 'companies:' list.")
    companies = [_parse_company(e) for e in entries if isinstance(e, dict)]
    enabled = [c for c in companies if c.enabled and c.name and c.token]
    return enabled


def canonical_skills(names: list[str]) -> list[str]:
    """Map raw skill name strings through the taxonomy; unknown names are dropped."""
    out: list[str] = []
    for name in names:
        canon = canonical_skill(name)
        if canon and canon not in out:
            out.append(canon)
    return out
