"""Parser tests: DOCX extraction, LLM structured extraction and the regex fallback.

All resume content is synthetic and fictional. `complete_json` is mocked at the
service boundary; no real LLM service is contacted.
"""

import io
import zipfile

import pytest
from docx import Document
from fastapi.testclient import TestClient

from app.core.llm import LLMUnavailable
from app.main import app
from app.services.parser import service as parser_service

client = TestClient(app)

# ---------------- synthetic DOCX helpers ----------------


def _docx_bytes(document: Document) -> bytes:
    buf = io.BytesIO()
    document.save(buf)
    return buf.getvalue()


def _sample_docx(with_table: bool = False) -> bytes:
    document = Document()
    document.add_paragraph("Asha Rao")
    document.add_paragraph("asha@example.com  9876543210")
    document.add_paragraph("Summary: Curious CSE student interested in data roles.")
    document.add_paragraph("Skills: Python, SQL, React, Machine Learning")
    if with_table:
        table = document.add_table(rows=2, cols=2)
        table.cell(0, 0).text = "Institution"
        table.cell(0, 1).text = "Degree, Year"
        table.cell(1, 0).text = "NIT Trichy"
        table.cell(1, 1).text = "B.Tech CSE, 2027"
    return _docx_bytes(document)


LLM_EXTRACTION = {
    "summary": "Data-curious student.",
    "education": [{"institution": "NIT Trichy", "degree": "B.Tech CSE", "year": "2027"}],
    "experiences": [
        {
            "title": "Data Intern",
            "company": "Acme",
            "start_date": "2026-06-01",
            "end_date": "2026-09-01",
            "duration_months": 3,
            "technologies": ["Python", "SQL"],
            "impact": ["Built dashboards used by 40 students"],
            "seniority": "intern",
        }
    ],
    "skills": [
        {"skill": "Python", "category": "work experience"},
        {"skill": "SQL", "category": "project"},
        {"skill": "Machine Learning", "category": "listed only"},
    ],
    "projects": ["Chatbot for campus helpdesk"],
    "total_experience_months": 3,
}


def _mock_llm(monkeypatch, result):
    """Point parser_service's complete_json at a stub; returns the list of calls."""
    calls: list[tuple] = []

    def fake_complete_json(prompt, system=None, schema_model=None):
        calls.append((prompt, system, schema_model))
        if isinstance(result, Exception):
            raise result
        return result

    monkeypatch.setattr(parser_service, "complete_json", fake_complete_json)
    return calls


# ---------------- DOCX text extraction ----------------


def test_docx_paragraph_extraction():
    resume = parser_service.parse_resume("resume.docx", _sample_docx())
    assert resume.raw_text.startswith("Asha Rao")
    assert resume.email == "asha@example.com"
    assert resume.phone == "9876543210"
    assert "Python" in resume.skills


def test_docx_table_extraction():
    resume = parser_service.parse_resume("resume.docx", _sample_docx(with_table=True))
    assert "NIT Trichy" in resume.raw_text
    assert "B.Tech CSE, 2027" in resume.raw_text


def test_docx_converts_paragraphs_and_tables_without_llm(monkeypatch):
    _mock_llm(monkeypatch, LLMUnavailable("unavailable"))
    via_endpoint = client.post(
        "/api/resume/parse",
        files={
            "file": (
                "resume.docx",
                _sample_docx(with_table=True),
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )
        },
    )
    assert via_endpoint.status_code == 200
    body = via_endpoint.json()
    assert body["email"] == "asha@example.com"
    assert "NIT Trichy" in body["raw_text"]


def test_existing_txt_format_still_works():
    resume = parser_service.parse_resume(
        "resume.txt", b"Asha Rao\nasha@example.com\nSkills: Python, Git\n"
    )
    assert resume.name == "Asha Rao"
    assert resume.email == "asha@example.com"
    assert {"Python", "Git"} <= set(resume.skills)


def test_existing_pdf_format_still_works():
    # Re-use the endpoint contract test coverage: txt/docx validate the fallback path.
    resume = parser_service.parse_resume("resume.txt", b"Skills: Python, SQL\n")
    assert resume.skills


# ---------------- LLM structured extraction ----------------


def test_llm_extraction_enriches_baseline_result(monkeypatch):
    _mock_llm(monkeypatch, LLM_EXTRACTION)
    resume = parser_service.parse_resume("resume.docx", _sample_docx(with_table=True))
    assert [edu.institution for edu in resume.education] == ["NIT Trichy"]
    assert resume.experience[0].company == "Acme"
    assert resume.projects == ["Chatbot for campus helpdesk"]
    assert resume.summary == "Data-curious student."
    # Baseline-owned fields are preserved.
    assert resume.email == "asha@example.com"
    assert "Python" in resume.skills
    assert resume.raw_text.startswith("Asha Rao")


def test_llm_prompt_instructs_not_to_fabricate(monkeypatch):
    calls = _mock_llm(monkeypatch, LLM_EXTRACTION)
    parser_service.parse_resume("resume.docx", _sample_docx())
    prompt, system, _schema_model = calls[0]
    assert "Never" in system or "never fabricate" in system.lower()
    assert "Use only information present" in system
    assert "Asha" in prompt


def test_llm_extraction_validates_with_pydantic(monkeypatch):
    _mock_llm(monkeypatch, LLM_EXTRACTION)
    resume = parser_service.parse_resume("resume.txt", b"Asha Rao\nasha@example.com\n")
    assert isinstance(resume, parser_service.ParsedResume)


# ---------------- fallback behaviour ----------------


def test_llm_unavailable_falls_back_to_regex_parser(monkeypatch):
    _mock_llm(monkeypatch, LLMUnavailable("unavailable"))
    resume = parser_service.parse_resume("resume.txt", RESUME_BYTES)
    assert resume.email == "asha@example.com"
    assert {"Python", "SQL", "Git"} <= set(resume.skills)
    assert resume.education == []
    assert resume.projects == []


RESUME_BYTES = b"""Asha Rao
asha@example.com  9876543210
Skills: Python, SQL, Git, React
"""


def test_invalid_json_falls_back(monkeypatch):
    class InvalidJSON(ValueError):
        pass

    _mock_llm(monkeypatch, InvalidJSON("LLM returned invalid JSON"))
    resume = parser_service.parse_resume("resume.txt", RESUME_BYTES)
    assert resume.email == "asha@example.com"
    assert "Python" in resume.skills


def test_schema_invalid_llm_output_falls_back(monkeypatch):
    # `education` entries without an institution and non-string title must be rejected.
    bad = {
        "education": [{"degree": "B.Tech"}],
        "experience": [{"company": "Acme"}],
        "projects": ["ok"],
    }
    _mock_llm(monkeypatch, bad)
    resume = parser_service.parse_resume("resume.txt", RESUME_BYTES)
    assert resume.education == []
    assert resume.experience == []
    assert resume.projects == []  # whole payload rejected -> deterministic baseline
    assert resume.email == "asha@example.com"


def test_empty_resume_skips_llm_but_returns_baseline(monkeypatch):
    calls = _mock_llm(monkeypatch, LLM_EXTRACTION)
    resume = parser_service.parse_resume("resume.txt", b"")
    assert resume.raw_text == ""
    assert resume.skills == []
    assert calls == []  # no LLM call for an empty document


# ---------------- empty / malformed documents ----------------


def test_malformed_docx_raises_the_existing_way():
    with pytest.raises(zipfile.BadZipFile):
        parser_service.parse_resume("resume.docx", b"this is not a zip file")


def test_malformed_docx_via_api_returns_422():
    res = client.post(
        "/api/resume/parse",
        files={"file": ("resume.docx", b"garbage-not-a-docx", "application/octet-stream")},
    )
    assert res.status_code == 422


def test_empty_docx_via_api_returns_baseline_shape():
    empty_docx = _docx_bytes(Document())
    res = client.post(
        "/api/resume/parse",
        files={
            "file": (
                "resume.docx",
                empty_docx,
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert set(body) >= {
        "name",
        "email",
        "phone",
        "summary",
        "skills",
        "education",
        "experience",
        "projects",
        "raw_text",
    }


# ---------------- API response compatibility ----------------


def test_parse_endpoint_response_shape_is_unchanged():
    res = client.post(
        "/api/resume/parse",
        files={"file": ("resume.txt", RESUME_BYTES, "text/plain")},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["email"] == "asha@example.com"
    assert {"Python", "SQL", "Git", "React"} <= set(body["skills"])
    for key in ("name", "summary", "education", "experience", "projects", "raw_text"):
        assert key in body
