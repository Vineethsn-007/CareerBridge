"""CSV import validation and conversion for job listings (owner: Teammate B).

Converts and validates CSV files into the canonical backend/app/data/jobs.json dataset.
Enforces Pydantic schema validation, canonical taxonomy adherence, URL integrity,
and verification metadata consistency.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from app.core.taxonomy import SKILLS
from app.schemas import Job

DEFAULT_DATA_DIR = Path(__file__).resolve().parent
DEFAULT_CSV_PATH = DEFAULT_DATA_DIR / "jobs_template.csv"
DEFAULT_JSON_PATH = DEFAULT_DATA_DIR / "jobs.json"

ALLOWED_JOB_TYPES: frozenset[str] = frozenset({"full-time", "internship", "part-time", "contract"})
ALLOWED_EXPERIENCE_LEVELS: frozenset[str] = frozenset({"fresher", "junior", "mid", "senior"})
TAXONOMY_SKILLS_SET: frozenset[str] = frozenset(SKILLS)
DATE_REGEX = re.compile(r"^\d{4}-\d{2}-\d{2}$")


class JobImportError(ValueError):
    """Raised when one or more rows in the input CSV fail validation."""

    def __init__(self, errors: list[str]) -> None:
        self.errors = errors
        message = f"CSV import failed with {len(errors)} error(s):\n" + "\n".join(
            f"  - {err}" for err in errors
        )
        super().__init__(message)


def _parse_bool(val: Any) -> bool:
    if val is None:
        return False
    return str(val).strip().lower() in {"true", "1", "yes", "t"}


def _parse_skills(val: Any) -> list[str]:
    if not val:
        return []
    text = str(val).strip()
    if not text:
        return []
    delimiter = ";" if ";" in text else ","
    return [s.strip() for s in text.split(delimiter) if s.strip()]


def _validate_url(url: str, row_idx: int) -> list[str]:
    errors: list[str] = []
    if not url or not url.strip():
        errors.append(f"Row {row_idx}: 'source_url' is required.")
        return errors

    clean_url = url.strip()
    parsed = urlparse(clean_url)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        errors.append(
            f"Row {row_idx}: 'source_url' {clean_url!r} is malformed "
            "(must start with http:// or https://)."
        )
        return errors

    netloc_lower = parsed.netloc.lower()
    if "example.com" in netloc_lower:
        errors.append(f"Row {row_idx}: 'source_url' {clean_url!r} cannot use 'example.com'.")

    # Reject incomplete NCS detail pages missing query parameters
    if "ncs.gov.in" in netloc_lower and parsed.path.lower().endswith("jobdetails.aspx"):
        if not parsed.query or "jobid=" not in parsed.query.lower():
            errors.append(
                f"Row {row_idx}: 'source_url' {clean_url!r} is an incomplete NCS "
                "job-detail URL missing required job ID parameters. "
                "Use the portal reference URL or a specific job query."
            )

    # Reject invented opportunity-detail slugs on Apprenticeship India
    if (
        "apprenticeshipindia.gov.in" in netloc_lower
        and "/opportunity-details/" in parsed.path.lower()
    ):
        slug = parsed.path.rstrip("/").split("/")[-1]
        if slug and not slug.isdigit() and not re.match(r"^[0-9a-fA-F]{10,}$", slug):
            errors.append(
                f"Row {row_idx}: 'source_url' {clean_url!r} uses an invalid "
                f"opportunity-detail slug {slug!r}. Use the official "
                "opportunity-search page or a genuine opportunity ID."
            )

    return errors


def _validate_verification(verified: bool, last_verified: str | None, row_idx: int) -> list[str]:
    errors: list[str] = []
    if verified:
        if not last_verified or not last_verified.strip():
            errors.append(f"Row {row_idx}: 'verified' is True but 'last_verified' date is missing.")
        else:
            date_str = last_verified.strip()
            if not DATE_REGEX.match(date_str):
                errors.append(
                    f"Row {row_idx}: 'last_verified' {date_str!r} "
                    "is not a valid ISO date (YYYY-MM-DD)."
                )
            else:
                try:
                    datetime.strptime(date_str, "%Y-%m-%d")
                except ValueError:
                    errors.append(
                        f"Row {row_idx}: 'last_verified' {date_str!r} is not a valid calendar date."
                    )
    else:
        if last_verified and last_verified.strip():
            errors.append(
                f"Row {row_idx}: 'verified' is False but "
                f"'last_verified' ({last_verified!r}) was provided."
            )
    return errors


def parse_csv_record(raw: dict[str, Any], row_idx: int) -> tuple[Job | None, list[str]]:
    """Parse and validate a single CSV record into a Job instance."""
    row_errors: list[str] = []

    job_id = str(raw.get("id", "")).strip()
    if not job_id:
        row_errors.append(f"Row {row_idx}: 'id' is required.")

    title = str(raw.get("title", "")).strip()
    if not title:
        row_errors.append(f"Row {row_idx}: 'title' is required.")

    company = str(raw.get("company", "")).strip()
    if not company:
        row_errors.append(f"Row {row_idx}: 'company' is required.")

    location = str(raw.get("location", "")).strip()
    if not location:
        row_errors.append(f"Row {row_idx}: 'location' is required.")

    job_type = str(raw.get("job_type", "full-time")).strip()
    if job_type not in ALLOWED_JOB_TYPES:
        allowed = sorted(ALLOWED_JOB_TYPES)
        row_errors.append(
            f"Row {row_idx}: invalid job_type {job_type!r}. Must be one of {allowed}."
        )

    exp_level = str(raw.get("experience_level", "fresher")).strip()
    if exp_level not in ALLOWED_EXPERIENCE_LEVELS:
        allowed = sorted(ALLOWED_EXPERIENCE_LEVELS)
        row_errors.append(
            f"Row {row_idx}: invalid experience_level {exp_level!r}. Must be one of {allowed}."
        )

    skills = _parse_skills(raw.get("skills_required"))
    if not skills:
        row_errors.append(f"Row {row_idx}: 'skills_required' must have at least one skill.")
    else:
        unknown_skills = [s for s in skills if s not in TAXONOMY_SKILLS_SET]
        if unknown_skills:
            row_errors.append(
                f"Row {row_idx}: skills {unknown_skills} are not in canonical taxonomy."
            )

    description = str(raw.get("description", "")).strip()
    if not description:
        row_errors.append(f"Row {row_idx}: 'description' is required.")

    source_url = str(raw.get("source_url", "")).strip()
    row_errors.extend(_validate_url(source_url, row_idx))

    verified = _parse_bool(raw.get("verified"))
    raw_last_verified = raw.get("last_verified")
    last_verified = str(raw_last_verified).strip() if raw_last_verified else None
    if last_verified == "":
        last_verified = None

    row_errors.extend(_validate_verification(verified, last_verified, row_idx))

    if row_errors:
        return None, row_errors

    try:
        job = Job(
            id=job_id,
            title=title,
            company=company,
            location=location,
            job_type=job_type,  # type: ignore[arg-type]
            experience_level=exp_level,  # type: ignore[arg-type]
            skills_required=skills,
            description=description,
            source_url=source_url,
            verified=verified,
            last_verified=last_verified,
        )
        return job, []
    except Exception as exc:
        return None, [f"Row {row_idx}: schema validation error: {exc}"]


def convert_csv_to_jobs(csv_path: str | Path) -> list[Job]:
    """Read CSV and convert to a list of Job objects.

    Rejects duplicate IDs, malformed URLs, uncanonical skills, invalid enums,
    and inconsistent verification metadata.
    """
    path = Path(csv_path)
    if not path.is_file():
        raise FileNotFoundError(f"CSV file not found: {path}")

    all_errors: list[str] = []
    seen_ids: dict[str, int] = {}
    valid_jobs: list[Job] = []

    with open(path, encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row_idx, row in enumerate(reader, start=2):
            job, errors = parse_csv_record(row, row_idx)
            if errors:
                all_errors.extend(errors)
            if job:
                if job.id in seen_ids:
                    prev_row = seen_ids[job.id]
                    all_errors.append(
                        f"Row {row_idx}: duplicate id {job.id!r} "
                        f"(previously seen on row {prev_row})."
                    )
                else:
                    seen_ids[job.id] = row_idx
                    valid_jobs.append(job)

    if all_errors:
        raise JobImportError(all_errors)

    return valid_jobs


def import_csv_to_json(csv_path: str | Path, json_path: str | Path) -> list[Job]:
    """Validate CSV and write to JSON ONLY if 100% valid.

    If any validation error occurs, json_path is left untouched.
    """
    jobs = convert_csv_to_jobs(csv_path)
    output_path = Path(json_path)

    data = [job.model_dump() for job in jobs]
    content = json.dumps(data, indent=2, ensure_ascii=False) + "\n"

    tmp_path = output_path.with_suffix(".tmp")
    tmp_path.write_text(content, encoding="utf-8")
    tmp_path.replace(output_path)

    return jobs


def main(argv: list[str] | None = None) -> int:
    """CLI entry point for importing and compiling CSV into jobs.json."""
    parser = argparse.ArgumentParser(
        description="Validate and compile job listings CSV into jobs.json"
    )
    parser.add_argument(
        "--csv",
        type=Path,
        default=DEFAULT_CSV_PATH,
        help=f"Path to source CSV file (default: {DEFAULT_CSV_PATH})",
    )
    parser.add_argument(
        "--json",
        type=Path,
        default=DEFAULT_JSON_PATH,
        help=f"Path to destination JSON file (default: {DEFAULT_JSON_PATH})",
    )
    args = parser.parse_args(argv)

    try:
        jobs = import_csv_to_json(args.csv, args.json)
        print(f"Successfully validated and imported {len(jobs)} jobs to {args.json}")
        return 0
    except JobImportError as exc:
        print(f"Validation error importing jobs from {args.csv}:\n{exc}", file=sys.stderr)
        return 1
    except Exception as exc:
        print(f"Error importing jobs: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
