"""Tests for jobs dataset, canonical taxonomy compliance, and CSV import validation."""

import json
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse

import pytest

from app.core.config import settings
from app.core.taxonomy import SKILLS
from app.data.import_jobs import (
    DEFAULT_CSV_PATH,
    DEFAULT_JSON_PATH,
    JobImportError,
    convert_csv_to_jobs,
    import_csv_to_json,
    main,
)
from app.schemas import Job

TAXONOMY_SKILLS = set(SKILLS)


# ---------------- Dataset integrity tests ----------------


def test_dataset_entries_validate_against_job_schema():
    """1. Every current dataset entry validates against Job."""
    with open(settings.jobs_path, encoding="utf-8") as f:
        data = json.load(f)

    assert len(data) >= 50, f"Expected at least 50 listings, found {len(data)}"
    jobs = [Job(**item) for item in data]
    assert len(jobs) == len(data)
    for job in jobs:
        assert isinstance(job, Job)
        assert job.id
        assert job.title
        assert job.company
        assert job.location
        assert job.description
        assert len(job.skills_required) > 0


def test_dataset_ids_are_unique():
    """2. IDs are unique."""
    with open(settings.jobs_path, encoding="utf-8") as f:
        data = json.load(f)

    ids = [item["id"] for item in data]
    assert len(ids) == len(set(ids)), f"Duplicate IDs found: {[x for x in ids if ids.count(x) > 1]}"


def test_dataset_source_urls_are_valid_and_not_example():
    """3. source_url values are valid and do not use example.com."""
    with open(settings.jobs_path, encoding="utf-8") as f:
        data = json.load(f)

    for item in data:
        url = item["source_url"]
        parsed = urlparse(url)
        assert parsed.scheme in {"http", "https"}, f"Invalid scheme in URL {url!r}"
        assert parsed.netloc, f"Missing host in URL {url!r}"
        assert "example.com" not in parsed.netloc.lower(), f"URL cannot use example.com: {url!r}"


def test_dataset_contains_no_incomplete_or_invented_portal_urls():
    """Dataset contains no incomplete NCS URLs or invented Apprenticeship India slugs."""
    with open(settings.jobs_path, encoding="utf-8") as f:
        data = json.load(f)

    for item in data:
        url = item["source_url"]
        parsed = urlparse(url)
        netloc = parsed.netloc.lower()
        if "ncs.gov.in" in netloc and "jobdetails.aspx" in parsed.path.lower():
            assert parsed.query and "jobid=" in parsed.query.lower(), (
                f"Incomplete NCS URL in job {item['id']}: {url}"
            )
        if (
            "apprenticeshipindia.gov.in" in netloc
            and "/opportunity-details/" in parsed.path.lower()
        ):
            slug = parsed.path.rstrip("/").split("/")[-1]
            assert slug.isdigit(), f"Invented Apprenticeship India slug in job {item['id']}: {url}"


def test_dataset_skills_belong_to_taxonomy():
    """4. Skills belong to the supported taxonomy."""
    with open(settings.jobs_path, encoding="utf-8") as f:
        data = json.load(f)

    for item in data:
        for skill in item["skills_required"]:
            assert skill in TAXONOMY_SKILLS, (
                f"Skill {skill!r} in job {item['id']} is not in canonical taxonomy"
            )


def test_dataset_verification_metadata_is_consistent():
    """5. Verification metadata is consistent."""
    with open(settings.jobs_path, encoding="utf-8") as f:
        data = json.load(f)

    for item in data:
        verified = item["verified"]
        last_verified = item["last_verified"]
        if verified:
            assert last_verified is not None, (
                f"Job {item['id']} is verified but has no last_verified date"
            )
            datetime.strptime(last_verified, "%Y-%m-%d")
        else:
            assert last_verified is None, (
                f"Job {item['id']} is unverified but has last_verified: {last_verified}"
            )


def test_dataset_all_records_are_currently_unverified():
    """Confirms all records currently remain verified=false and last_verified=null."""
    with open(settings.jobs_path, encoding="utf-8") as f:
        data = json.load(f)

    for item in data:
        assert item["verified"] is False, f"Job {item['id']} unexpectedly marked verified=true"
        assert item["last_verified"] is None, f"Job {item['id']} unexpectedly has last_verified"


# ---------------- CSV conversion & validation tests ----------------


def test_csv_conversion_valid_records(tmp_path: Path):
    """6. CSV conversion works for valid records."""
    csv_file = tmp_path / "valid_jobs.csv"
    csv_file.write_text(
        "id,title,company,location,job_type,experience_level,skills_required,description,source_url,verified,last_verified\n"
        "test-001,Backend Engineer,Acme Corp,Bengaluru,full-time,fresher,Python;SQL;Git,Build APIs,https://acme.org/jobs/001,false,\n"
        "test-002,Frontend Intern,Beta Labs,Remote,internship,fresher,React;JavaScript;HTML,Build UI,https://beta.dev/jobs/002,true,2026-10-23\n",
        encoding="utf-8",
    )

    jobs = convert_csv_to_jobs(csv_file)
    assert len(jobs) == 2
    assert jobs[0].id == "test-001"
    assert jobs[0].skills_required == ["Python", "SQL", "Git"]
    assert jobs[0].verified is False
    assert jobs[0].last_verified is None

    assert jobs[1].id == "test-002"
    assert jobs[1].verified is True
    assert jobs[1].last_verified == "2026-10-23"


def test_csv_conversion_invalid_records_produce_useful_errors(tmp_path: Path):
    """7. Invalid records produce useful errors with row numbers."""
    csv_file = tmp_path / "invalid_records.csv"
    csv_file.write_text(
        "id,title,company,location,job_type,experience_level,skills_required,description,source_url,verified,last_verified\n"
        ",Missing ID,Acme,Bengaluru,full-time,fresher,Python,Desc,https://acme.org/1,false,\n"
        "test-002,,Acme,Bengaluru,full-time,fresher,Python,Desc,not-a-url,false,\n"
        "test-003,Dev,Acme,Bengaluru,full-time,fresher,Python,Desc,https://example.com/test,false,\n",
        encoding="utf-8",
    )

    with pytest.raises(JobImportError) as exc_info:
        convert_csv_to_jobs(csv_file)

    msg = str(exc_info.value)
    assert "Row 2: 'id' is required" in msg
    assert "Row 3: 'title' is required" in msg
    assert "Row 3: 'source_url' 'not-a-url' is malformed" in msg
    assert "Row 4: 'source_url' 'https://example.com/test' cannot use 'example.com'" in msg


def test_csv_conversion_rejects_incomplete_portal_urls(tmp_path: Path):
    """Rejection of incomplete NCS jobdetails URLs and invented Apprenticeship India slugs."""
    csv_file = tmp_path / "bad_urls.csv"
    csv_file.write_text(
        "id,title,company,location,job_type,experience_level,skills_required,description,source_url,verified,last_verified\n"
        "test-001,Dev,Acme,Bengaluru,full-time,fresher,Python,Desc,https://www.ncs.gov.in/job-seeker/pages/jobdetails.aspx,false,\n"
        "test-002,Dev,Acme,Bengaluru,full-time,fresher,Python,Desc,https://www.apprenticeshipindia.gov.in/apprenticeship/opportunity-details/web-developer,false,\n",
        encoding="utf-8",
    )

    with pytest.raises(JobImportError) as exc_info:
        convert_csv_to_jobs(csv_file)

    msg = str(exc_info.value)
    assert "incomplete NCS job-detail URL" in msg
    assert "invalid opportunity-detail slug 'web-developer'" in msg


def test_csv_conversion_rejects_duplicate_ids(tmp_path: Path):
    """8. Duplicate IDs are rejected."""
    csv_file = tmp_path / "dup_ids.csv"
    csv_file.write_text(
        "id,title,company,location,job_type,experience_level,skills_required,description,source_url,verified,last_verified\n"
        "dup-001,Role 1,Acme,Bengaluru,full-time,fresher,Python,Desc,https://acme.org/1,false,\n"
        "dup-001,Role 2,Acme,Bengaluru,full-time,fresher,Python,Desc,https://acme.org/2,false,\n",
        encoding="utf-8",
    )

    with pytest.raises(JobImportError) as exc_info:
        convert_csv_to_jobs(csv_file)

    msg = str(exc_info.value)
    assert "duplicate id 'dup-001'" in msg
    assert "Row 3" in msg


def test_csv_conversion_rejects_invalid_skills_and_enums(tmp_path: Path):
    """9. Invalid skills and invalid enum values are rejected."""
    csv_file = tmp_path / "invalid_enums.csv"
    csv_file.write_text(
        "id,title,company,location,job_type,experience_level,skills_required,description,source_url,verified,last_verified\n"
        "test-001,Role,Acme,Bengaluru,freelance,expert,QuantumSkill,Desc,https://acme.org/1,false,\n",
        encoding="utf-8",
    )

    with pytest.raises(JobImportError) as exc_info:
        convert_csv_to_jobs(csv_file)

    msg = str(exc_info.value)
    assert "invalid job_type 'freelance'" in msg
    assert "invalid experience_level 'expert'" in msg
    assert "QuantumSkill" in msg


def test_csv_conversion_rejects_inconsistent_verification(tmp_path: Path):
    """Verification metadata consistency validation."""
    csv_file = tmp_path / "bad_verification.csv"
    csv_file.write_text(
        "id,title,company,location,job_type,experience_level,skills_required,description,source_url,verified,last_verified\n"
        "test-001,Role 1,Acme,Bengaluru,full-time,fresher,Python,Desc,https://acme.org/1,true,\n"
        "test-002,Role 2,Acme,Bengaluru,full-time,fresher,Python,Desc,https://acme.org/2,false,2026-10-23\n"
        "test-003,Role 3,Acme,Bengaluru,full-time,fresher,Python,Desc,https://acme.org/3,true,invalid-date\n",
        encoding="utf-8",
    )

    with pytest.raises(JobImportError) as exc_info:
        convert_csv_to_jobs(csv_file)

    msg = str(exc_info.value)
    assert "Row 2: 'verified' is True but 'last_verified' date is missing" in msg
    assert "Row 3: 'verified' is False but 'last_verified'" in msg
    assert "Row 4: 'last_verified' 'invalid-date' is not a valid ISO date" in msg


def test_failed_conversion_never_overwrites_existing_dataset(tmp_path: Path):
    """10. A failed conversion never overwrites the existing dataset."""
    json_target = tmp_path / "jobs.json"
    initial_content = '[{"preserved": true}]'
    json_target.write_text(initial_content, encoding="utf-8")

    csv_file = tmp_path / "bad_jobs.csv"
    csv_file.write_text(
        "id,title,company,location,job_type,experience_level,skills_required,description,source_url,verified,last_verified\n"
        "bad-001,,Acme,Bengaluru,full-time,fresher,Python,Desc,https://acme.org/1,false,\n",
        encoding="utf-8",
    )

    with pytest.raises(JobImportError):
        import_csv_to_json(csv_file, json_target)

    # Content must remain completely unchanged
    assert json_target.read_text(encoding="utf-8") == initial_content


def test_successful_conversion_writes_json(tmp_path: Path):
    """A valid conversion writes the JSON file accurately."""
    json_target = tmp_path / "jobs.json"
    csv_file = tmp_path / "good_jobs.csv"
    csv_file.write_text(
        "id,title,company,location,job_type,experience_level,skills_required,description,source_url,verified,last_verified\n"
        "ok-001,Developer,Acme,Bengaluru,full-time,fresher,Python;SQL,Good job,https://acme.org/jobs/1,false,\n",
        encoding="utf-8",
    )

    jobs = import_csv_to_json(csv_file, json_target)
    assert len(jobs) == 1
    assert json_target.exists()

    with open(json_target, encoding="utf-8") as f:
        saved_data = json.load(f)
    assert len(saved_data) == 1
    assert saved_data[0]["id"] == "ok-001"
    assert saved_data[0]["skills_required"] == ["Python", "SQL"]


# ---------------- CLI entrypoint tests ----------------


def test_importer_cli_success(tmp_path: Path):
    """CLI successfully converts valid CSV to destination JSON with exit code 0."""
    csv_file = tmp_path / "cli_jobs.csv"
    json_file = tmp_path / "cli_jobs.json"
    csv_file.write_text(
        "id,title,company,location,job_type,experience_level,skills_required,description,source_url,verified,last_verified\n"
        "cli-001,Developer,Acme,Bengaluru,full-time,fresher,Python,Desc,https://acme.org/1,false,\n",
        encoding="utf-8",
    )

    exit_code = main(["--csv", str(csv_file), "--json", str(json_file)])
    assert exit_code == 0
    assert json_file.exists()

    with open(json_file, encoding="utf-8") as f:
        data = json.load(f)
    assert len(data) == 1
    assert data[0]["id"] == "cli-001"


def test_importer_cli_failure_leaves_target_unchanged(tmp_path: Path):
    """CLI returns non-zero exit code and preserves target on invalid input."""
    csv_file = tmp_path / "cli_bad.csv"
    json_file = tmp_path / "cli_target.json"
    sentinel = '[{"original": "data"}]'
    json_file.write_text(sentinel, encoding="utf-8")

    csv_file.write_text(
        "id,title,company,location,job_type,experience_level,skills_required,description,source_url,verified,last_verified\n"
        "cli-001,,Acme,Bengaluru,full-time,fresher,Python,Desc,https://acme.org/1,false,\n",
        encoding="utf-8",
    )

    exit_code = main(["--csv", str(csv_file), "--json", str(json_file)])
    assert exit_code == 1
    assert json_file.read_text(encoding="utf-8") == sentinel


def test_importer_cli_default_paths():
    """Default paths correctly resolve to existing project files."""
    assert DEFAULT_CSV_PATH.is_file()
    assert DEFAULT_JSON_PATH.is_file()
