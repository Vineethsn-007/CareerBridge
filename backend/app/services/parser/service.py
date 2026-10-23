"""Resume parser (owner: lead).

Baseline: text extraction + regex + taxonomy matching.
TODO: DOCX support (python-docx) and LLM-based structured extraction of
education / experience / projects via app.core.llm (keep this baseline as fallback).
"""

import io
import re

from pypdf import PdfReader

from app.core.taxonomy import extract_skills
from app.schemas import ParsedResume

EMAIL_RE = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
PHONE_RE = re.compile(r"(?:\+91[\s-]?)?[6-9]\d{9}")


def extract_text(filename: str, data: bytes) -> str:
    if filename.lower().endswith(".pdf"):
        reader = PdfReader(io.BytesIO(data))
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    return data.decode("utf-8", errors="ignore")


def parse_resume(filename: str, data: bytes) -> ParsedResume:
    text = extract_text(filename, data).strip()
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    email = EMAIL_RE.search(text)
    phone = PHONE_RE.search(text)
    return ParsedResume(
        name=lines[0] if lines else None,
        email=email.group(0) if email else None,
        phone=phone.group(0) if phone else None,
        skills=extract_skills(text),
        raw_text=text,
    )
