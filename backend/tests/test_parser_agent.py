"""Agent-based resume parsing tests (Task 2). All LLM calls are mocked; resume content
is synthetic and fictional; no network access happens."""

import io

import pytest
from fastapi.testclient import TestClient
from pypdf import PdfWriter

from app.core.llm import LLMUnavailable
from app.main import app
from app.services.parser import service as parser_service

client = TestClient(app)

FRESHER_TEXT = """Priya Iyer
priya@example.test  9880011223
Skills: Python, Figma
Projects: Built an expense dashboard with Python and React for my college fest.
Education: B.E. Computer Science, RVCE, 2026
"""

TWO_YEAR_TEXT = """Karan Mehta
karan@example.test  9711223344
Experience:
Software Engineer, NexGen Systems (2024-09 to present) - built payment APIs in Python.
Project: Data pipeline in SQL and Airflow.
Skills: Python, SQL, Machine Learning
"""

VARIED_TEXT = """Meera Sharma
meera@example.test  9600556677
Skills: Java, AWS, Git
Experience: QA Intern, Zenith (2025-05 to 2025-08), automation with Java.
Projects: E-commerce cart in React.
Certifications: AWS Cloud Practitioner (Amazon Web Services, 2025)
Education: B.Tech IT, PES University, 2024
"""


def _mock_llm(monkeypatch, result):
    calls: list = []

    def fake_complete_json(prompt, system=None, schema_model=None):
        calls.append((prompt, system, schema_model))
        if isinstance(result, Exception):
            raise result
        return result

    monkeypatch.setattr(parser_service, "complete_json", fake_complete_json)
    return calls


def mock_returning(monkeypatch, payload):
    """Validate the payload through parser_service's own model, like the real client."""

    def fake(prompt, system=None, schema_model=None):
        from app.services.parser.models import ResumeExtraction

        return ResumeExtraction.model_validate(payload)

    calls = _mock_llm(monkeypatch, LLMUnavailable("placeholder"))
    monkeypatch.setattr(parser_service, "complete_json", fake)
    return calls


# ---------------- fresher resume ----------------


def test_fresher_projects_rank_above_listed_only(monkeypatch):
    mock_returning(
        monkeypatch,
        {
            "skills": [
                {"skill": "Python", "category": "project"},
                {"skill": "Figma", "category": "listed only"},
                {"skill": "React", "category": "project"},
            ],
            "projects": ["Expense dashboard"],
            "insights": {
                "strengths": [
                    {
                        "text": "Ship-ready project builder",
                        "evidence": "Built an expense dashboard with Python and React",
                    }
                ],
                "gaps": [],
                "target_roles": ["Frontend Intern"],
                "tips": [],
            },
        },
    )
    resume = parser_service.parse_resume("resume.txt", FRESHER_TEXT.encode())
    assert resume.skills[0] == "Python"
    figma = next(e for e in resume.skill_evidence if e.skill == "Figma")
    python_ev = next(e for e in resume.skill_evidence if e.skill == "Python")
    assert figma.category == "listed only"
    assert figma.weighted_strength < python_ev.weighted_strength < 1.0
    assert python_ev.category == "project"
    assert resume.total_experience_months is None  # no formal employment
    assert resume.insights is not None
    assert resume.insights.strengths[0].evidence.startswith("Built an expense")


# ---------------- two years of experience ----------------


def test_two_year_candidate_work_evidence_and_totals(monkeypatch):
    mock_returning(
        monkeypatch,
        {
            "skills": [
                {
                    "skill": "Python",
                    "category": "work experience",
                    "proficiency": "intermediate",
                    "years": 2.0,
                },
                {"skill": "SQL", "category": "project"},
                {"skill": "Machine Learning", "category": "listed only"},
            ],
            "experiences": [
                {
                    "title": "Software Engineer",
                    "company": "NexGen Systems",
                    "start_date": "2024-09",
                    "end_date": None,
                    "duration_months": 24,
                    "technologies": ["Python"],
                    "impact": ["Built payment APIs"],
                    "seniority": "junior",
                },
            ],
            "total_experience_months": 24,
        },
    )
    resume = parser_service.parse_resume("resume.txt", TWO_YEAR_TEXT.encode())
    top = resume.skills[0]
    evidence = resume.skill_evidence[0]
    assert top == "Python"
    assert evidence.category == "work experience"
    assert evidence.weighted_strength == 1.0
    assert evidence.years == 2.0
    assert evidence.proficiency == "intermediate"
    assert resume.total_experience_months == 24
    assert resume.experience[0].duration_months == 24


def test_corroborated_evidence_adds_small_bounded_bonus(monkeypatch):
    mock_returning(
        monkeypatch,
        {
            "skills": [
                {"skill": "SQL", "category": "work experience"},
                {"skill": "SQL", "category": "project"},
            ]
        },
    )
    resume = parser_service.parse_resume("resume.txt", b"Kiran\nSQL\nSkills: SQL\n")
    ev = resume.skill_evidence[0]
    assert ev.weighted_strength == 1.0  # 1.0 + 0.1 bonus, capped


def test_taxonomy_synonyms_collapse(monkeypatch):
    mock_returning(
        monkeypatch,
        {
            "skills": [
                {"skill": "JS", "category": "project"},
                {"skill": "JavaScript", "category": "listed only"},
            ]
        },
    )
    resume = parser_service.parse_resume("resume.txt", b"Skills: JavaScript, React\n")
    names = [e.skill for e in resume.skill_evidence]
    assert names.count("JavaScript") == 1


def test_baseline_skills_merge_as_listed_only(monkeypatch):
    # Only Python is mentioned by the LLM; the resume also clearly lists "Git".
    mock_returning(monkeypatch, {"skills": [{"skill": "Python", "category": "project"}]})
    resume = parser_service.parse_resume(
        "resume.txt", b"Skills: Python, Git\nBuilt things with Python.\n"
    )
    ev = {e.skill: e for e in resume.skill_evidence}
    assert ev["Git"].category == "listed only"
    assert ev["Git"].weighted_strength < ev["Python"].weighted_strength
    assert resume.skills == sorted(resume.skills, key=lambda s: -ev[s].weighted_strength)


# ---------------- varied sections ----------------


def test_varied_sections_extract_certifications_and_insights(monkeypatch):
    payload = {
        "skills": [
            {"skill": "Java", "category": "work experience", "proficiency": "advanced"},
            {"skill": "AWS", "category": "listed only"},
            {"skill": "Git", "category": "project"},
        ],
        "experiences": [
            {
                "title": "QA Intern",
                "company": "Zenith",
                "duration_months": 3,
                "technologies": ["Java"],
                "impact": ["Automated regression suites"],
            },
        ],
        "certifications": [
            {"name": "AWS Cloud Practitioner", "issuer": "Amazon Web Services", "year": "2025"},
        ],
        "education": [{"institution": "PES University", "degree": "B.Tech IT", "year": "2024"}],
        "total_experience_months": 3,
        "insights": {
            "strengths": [{"text": "Automation skills", "evidence": "QA Intern automating suites"}],
            "gaps": [
                {"text": "No cloud hands-on beyond certification", "evidence": "AWS listed only"}
            ],
            "summary": "QA-leaning candidate moving to cloud.",
            "target_roles": ["QA Engineer", "Cloud Support Associate"],
            "tips": ["Add an AWS project"],
        },
    }
    mock_returning(monkeypatch, payload)
    resume = parser_service.parse_resume("resume.txt", VARIED_TEXT.encode())
    # Contact extraction stays regex-based:
    assert resume.email == "meera@example.test"
    assert resume.phone == "9600556677"
    assert resume.certifications[0].name == "AWS Cloud Practitioner"
    assert [edu.institution for edu in resume.education] == ["PES University"]
    assert resume.insights.target_roles == ["QA Engineer", "Cloud Support Associate"]
    assert resume.insights.gaps[0].evidence == "AWS listed only"


# ---------------- document extraction ----------------


def _start_xref_and_xref_table(out: bytearray, offsets: list[int]) -> int:
    xref_pos = len(out)
    n = len(offsets) + 1
    out += f"xref\n0 {n}\n".encode()
    out += b"0000000000 65535 f \n"
    for off in offsets:
        out += f"{off:010d} 00000 n \n".encode()
    return xref_pos


def pdf_with_text_layer(content: str) -> bytes:
    """Build a minimal one-page PDF containing a single text run."""
    escaped = content.replace("\\", r"\\").replace("(", r"\(").replace(")", r"\)")
    stream = f"BT /F1 12 Tf 72 720 Td ({escaped}) Tj ET".encode()
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R /Font 5 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R"
        b" /Resources << /Font << /F1 5 0 R >> >> >>",
        b"<< /Length " + str(len(stream)).encode() + b" >>\nstream\n" + stream + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    out = bytearray(b"%PDF-1.4\n")
    offsets: list[int] = []
    for i, body in enumerate(objects, start=1):
        offsets.append(len(out))
        out += f"{i} 0 obj\n".encode() + body + b"\nendobj\n"
    xref_pos = _start_xref_and_xref_table(out, offsets)
    out += (
        b"trailer << /Size " + str(len(objects) + 1).encode() + b" /Root 1 0 R >>\n"
        b"startxref\n" + str(xref_pos).encode() + b"\n%%EOF"
    )
    return bytes(out)


def pdf_without_text_layer() -> bytes:
    writer = PdfWriter()
    writer.add_blank_page(width=612, height=792)
    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()


def test_pdf_without_text_layer_is_a_clear_actionable_error(monkeypatch):
    _mock_llm(monkeypatch, LLMUnavailable("unused"))
    with pytest.raises(ValueError) as info:
        parser_service.parse_resume("scanned.pdf", pdf_without_text_layer())
    assert "no extractable text layer" in str(info.value).lower()


def test_api_surfaces_scan_pdf_error_detail(monkeypatch):
    response = client.post(
        "/api/resume/parse",
        files={"file": ("scanned.pdf", pdf_without_text_layer(), "application/pdf")},
    )
    assert response.status_code == 422
    assert "text layer" in response.json()["detail"].lower()


def test_pdf_with_text_layer_parses(monkeypatch):
    _mock_llm(monkeypatch, LLMUnavailable("unavailable"))
    resume = parser_service.parse_resume(
        "resume.pdf",
        pdf_with_text_layer("Skills: Python, SQL. Projects: TODO app in Django."),
    )
    assert resume.name == "Skills: Python, SQL. Projects: TODO app in Django."
    assert {"Python", "SQL"} <= set(resume.skills)


# ---------------- fallback behaviour ----------------


def test_llm_unavailable_falls_back_to_baseline_evidence(monkeypatch):
    _mock_llm(monkeypatch, LLMUnavailable("unavailable"))
    resume = parser_service.parse_resume(
        "resume.txt", b"Asha\nasha@example.test\nSkills: Python, SQL\n"
    )
    assert resume.skill_evidence
    assert all(e.category == "listed only" for e in resume.skill_evidence)
    assert resume.insights is None  # never unsupported claims


def test_schema_invalid_llm_output_falls_back(monkeypatch):
    _mock_llm(monkeypatch, {"skills": [{"skill": "Python", "category": "astral"}]})
    resume = parser_service.parse_resume(
        "resume.txt", b"Asha\nasha@example.test\nSkills: Python, SQL\n"
    )
    assert resume.email == "asha@example.test"
    assert {"Python", "SQL"} <= set(resume.skills)


def test_api_response_shape_only_adds_fields(monkeypatch):
    _mock_llm(monkeypatch, LLMUnavailable("unavailable"))
    res = client.post(
        "/api/resume/parse",
        files={"file": ("resume.txt", b"Skills: Python\n", "text/plain")},
    )
    assert res.status_code == 200
    body = res.json()
    # Original contract keys are intact:
    for key in (
        "name",
        "email",
        "phone",
        "summary",
        "skills",
        "education",
        "experience",
        "projects",
        "raw_text",
    ):
        assert key in body
    # Additive keys are present:
    for key in ("skill_evidence", "certifications", "total_experience_months", "insights"):
        assert key in body
