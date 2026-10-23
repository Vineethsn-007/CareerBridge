"""Candidate persona Q&A service (owner: lead - new service).

Adaptive, resume-anchored Q&A (5-7 questions, one at a time) that captures how
candidates describe their own working style. This is explicitly NOT a personality
test: the persisted profile holds only self-described strengths, each with a direct
verbatim quote from the candidate's answers, plus a confidence level reflecting how
much evidence the answers provide. Skipping never fabricates an answer or evidence.

Questions come from the LLM (adaptive, using the resume + prior transcript); when the
LLM is unavailable the deterministic, resume-anchored fallback keeps the flow working
without fabricating anything. The final summary is written by the LLM when available,
otherwise a neutral canned sentence derived only from what was asked/answered.
"""

from __future__ import annotations

import logging

from sqlalchemy.orm import Session

from app.core.db import PersonaProfile, ResumeProfile
from app.core.llm import complete_json
from app.schemas import (
    ParsedResume,
    PersonaAnswerRequest,
    PersonaAnswerResponse,
    PersonaProfileResult,
    PersonaQuestion,
    PersonaStartRequest,
    PersonaStartResponse,
    PersonaStrength,
)
from app.services.persona import prompts
from app.services.persona.models import ProfileSpec, QuestionSpec

logger = logging.getLogger(__name__)

TOPICS: tuple[str, ...] = tuple(
    sorted(
        {
            "leadership",
            "teamwork",
            "ownership",
            "communication",
            "initiative",
            "learning agility",
        }
    )
)
# Within the required 5-7 range: all six topics, each asked at most once.
MIN_QUESTIONS = 5
MAX_QUESTIONS = 7
TOTAL_QUESTIONS = len(TOPICS)

_QUOTE_MISS_SNIPPET_MAX = 160

QUESTION_TOPICS_ORDER: tuple[str, ...] = (
    "ownership",
    "teamwork",
    "initiative",
    "communication",
    "learning agility",
    "leadership",
)

# Deterministic confidence: pure function of how many topics the candidate actually
# answered (skipped topics contribute no evidence and lower confidence).
_CONFIDENCE_FOR_ANSWERED = {"high": 4, "medium": 2}


# ---------------- persistence helpers ----------------


def resume_profile_from_parsed(db: Session, resume: ParsedResume | None) -> ResumeProfile:
    profile = ResumeProfile(
        name=resume.name if resume else None,
        email=resume.email if resume else None,
        phone=resume.phone if resume else None,
        summary=resume.summary if resume else None,
        skills=[{"name": s} for s in (resume.skills if resume else [])],
        education=(resume.education if resume else [])
        and [edu.model_dump(mode="json") for edu in resume.education],
        experience=(resume.experience if resume else [])
        and [exp.model_dump(mode="json") for exp in resume.experience],
        projects=list(resume.projects) if resume else [],
        raw_text=(resume.raw_text if resume else "") or "",
    )
    db.add(profile)
    db.flush()
    return profile


def _persona_record(db: Session, persona_id: int) -> PersonaProfile | None:
    return db.get(PersonaProfile, persona_id)


def _resume_facts(resume: ResumeProfile) -> str:
    facts: list[str] = []
    if resume.name:
        facts.append(f"Candidate: {resume.name}")
    if resume.summary:
        facts.append(f"Summary: {resume.summary}")
    skills = [s.get("name") if isinstance(s, dict) else str(s) for s in resume.skills or []]
    if skills:
        facts.append("Skills listed: " + ", ".join(skills))
    for exp in resume.experience or []:
        if isinstance(exp, dict):
            title = exp.get("title", "")
            company = exp.get("company") or ""
            facts.append(f"Experience: {title} at {company}".strip())
    for project in resume.projects or []:
        facts.append(f"Project: {project}")
    if resume.raw_text:
        facts.append(f"Resume excerpt: {resume.raw_text[:600]}")
    return "\n".join(facts)


def _transcript(answers: list[dict]) -> str:
    lines: list[str] = []
    for i, entry in enumerate(answers, start=1):
        question = entry.get("question", "")
        answer = entry.get("answer")
        if answer:
            lines.append(f"Q{i} ({entry.get('topic')}): {question}")
            lines.append(f"A{i}: {answer}")
        else:
            lines.append(f"Q{i} ({entry.get('topic')}): {question}")
            lines.append("A{i}: (skipped - no evidence).".replace("A{i}", f"A{i}"))
    return "\n".join(lines)


def _answered_summary(entries: list[dict]) -> str:
    snippet_parts = []
    for entry in entries[-1:]:
        if entry.get("answer"):
            snippet_parts.append(f"The candidate just said: {entry['answer']}")
    snippet = " ".join(snippet_parts)
    if not snippet:
        answered = sum(1 for e in entries if e.get("answer"))
        return (
            f"{answered} question(s) answered so far; none answered yet." if answered == 0 else ""
        )
    return snippet


# ---------------- LLM-backed generation ----------------


def _generate_question(
    resume: ResumeProfile,
    topic: str,
    asked: list[dict],
    *,
    fast: bool = True,
) -> PersonaQuestion:
    asked_questions = "\n".join(f"- {e.get('question', '')}" for e in asked) or "- (none yet)"
    prior = _answered_summary(asked)
    prompt = prompts.QUESTION_PROMPT_TEMPLATE.format(
        resume_facts=_resume_facts(resume) or "(resume not provided)",
        asked_questions=asked_questions,
        prior_answers_line=prior,
        topic=topic,
        topic_meaning=prompts.TOPIC_MEANINGS.get(topic, topic),
    )
    try:
        spec = _QUESTION_GENERATOR(prompt, prompts.QUESTION_SYSTEM)
    except Exception:
        logger.debug("Persona question generation failed; using resume-anchored fallback.")
        spec = _fallback_question(resume, topic, asked)
    return PersonaQuestion(index=len(asked) + 1, topic=spec.topic, question=spec.question)


def _fallback_question(resume: ResumeProfile, topic: str, asked: list[dict]) -> QuestionSpec:
    """Deterministic, resume-anchored question; nothing is fabricated."""
    anchor = ""
    projects = [p for p in (resume.projects or []) if str(p).strip()]
    if projects:
        anchor = f" For example, tie it to your project '{projects[0]}'."
    else:
        skills = [s.get("name") if isinstance(s, dict) else str(s) for s in resume.skills or []]
        if skills:
            anchor = f" For example, tie it to your work with {skills[-1]}."
    meaning = prompts.TOPIC_MEANINGS.get(topic, topic)
    templates = {
        "leadership": "Tell me about a time you led a group effort or influenced an outcome",
        "teamwork": "Walk me through a recent project you built with others",
        "ownership": "Describe something you owned end to end, start to finish",
        "communication": "Tell me how you explain technical work to non-technical people",
        "initiative": "Tell me about something you started on your own without being asked",
        "learning agility": "Walk me through how you picked up a new skill or tool recently",
    }
    question = templates.get(topic, f"Tell me how you approach {meaning}") + ("." + anchor)
    return QuestionSpec(topic=topic, question=question)  # type: ignore[arg-type]


def _next_topic(answers: list[dict]) -> str | None:
    covered = {entry.get("topic") for entry in answers}
    for topic in QUESTION_TOPICS_ORDER:
        if topic not in covered:
            return topic
    return None


def _confidence(answered: int) -> str:
    if answered >= _CONFIDENCE_FOR_ANSWERED["high"]:
        return "high"
    if answered >= _CONFIDENCE_FOR_ANSWERED["medium"]:
        return "medium"
    return "low"


def _quote_from_answer(spec_strength: str, quote: str, entries: list[dict], topic: str) -> str:
    """Ensure quotes stay verbatim from actual answers; rebuild if the LLM paraphrased."""
    answers = [e.get("answer", "") for e in entries if e.get("answer") and e.get("topic") == topic]
    for answer in answers:
        if quote:
            lowered = answer.lower().find(quote.strip().lower())
            if lowered >= 0:
                # The candidate's own wording is the evidence, not our paraphrase.
                return answer[lowered : lowered + len(quote.strip())]
    if answers:
        # Derive the evidence deterministically: no paraphrasing beyond truncation.
        return answers[0][:_QUOTE_MISS_SNIPPET_MAX]
    return ""


def _build_profile_result(
    db: Session, record: PersonaProfile, resume_profile_id: int
) -> PersonaProfileResult:
    entries = list(record.answers)
    answered = [e for e in entries if e.get("answer")]
    topic_counts: dict[str, int] = {}

    strengths: list[PersonaStrength] = []
    spec: ProfileSpec | None = None
    try:
        spec = _PROFILE_GENERATOR(  # type: ignore[assignment]
            prompts.PROFILE_PROMPT_TEMPLATE.format(transcript=_transcript(entries)),
            prompts.PROFILE_SYSTEM,
        )
        for s in spec.strengths:
            quote = _quote_from_answer(s.strength, s.quote, entries, s.topic)
            if not quote:
                continue  # no verifiable evidence -> no strength claim
            strengths.append(PersonaStrength(strength=s.strength, quote=quote, topic=s.topic))
            topic_counts[s.topic] = topic_counts.get(s.topic, 0) + 1
    except Exception:
        logger.debug("Persona profile generation failed; using answers-only profile.")
        strengths = []
    finally:
        if not strengths:
            # Deterministic profile: quote = the candidate's own words, label = topic.
            for entry in answered:
                quote = str(entry.get("answer"))[:_QUOTE_MISS_SNIPPET_MAX]
                topic = str(entry.get("topic"))
                label = topic.title()
                strengths.append(
                    PersonaStrength(strength=label, quote=quote, topic=topic)  # type: ignore[arg-type]
                )

    summary: str | None = record.summary or (
        spec.summary if spec is not None and spec.summary else None
    )
    if summary is None and answered:
        # Neutral, solely derived from topic coverage (never new claims).
        summary = (
            "You described "
            f"{len(answered)} experiences across "
            f"{', '.join(sorted({str(e.get('topic')) for e in answered}))}."
        )

    record.strengths = [s.model_dump() for s in strengths]
    record.summary = summary
    record.confidence = _confidence(len(answered))  # type: ignore[assignment]
    db.flush()
    return PersonaProfileResult(
        persona_id=record.id,
        resume_profile_id=resume_profile_id,
        strengths=strengths,
        summary=summary,
        confidence=record.confidence,  # type: ignore[arg-type]
        completed=True,
    )


# ---------------- public API ----------------


def start_persona(db: Session, req: PersonaStartRequest) -> PersonaStartResponse:
    resume_profile: ResumeProfile | None = None
    if req.resume_profile_id is not None:
        resume_profile = db.get(ResumeProfile, req.resume_profile_id)
        if resume_profile is None and req.resume is None:
            raise ValueError("Unknown resume_profile_id; provide a resume instead.")
    record = PersonaProfile(resume_profile_id=resume_profile.id if resume_profile else None)
    if resume_profile is None:
        stored = resume_profile_from_parsed(db, req.resume)
        record.resume_profile_id = stored.id
        resume_profile = stored
    else:
        record.resume_profile_id = resume_profile.id
    # Question one; transcript starts empty.
    record.answers = []
    db.add(record)
    db.flush()

    question = _generate_question(resume_profile, QUESTION_TOPICS_ORDER[0], asked=[])
    record.answers = record.answers or []
    db.flush()
    db.commit()
    return PersonaStartResponse(
        persona_id=record.id,
        resume_profile_id=resume_profile.id,
        total_questions=TOTAL_QUESTIONS,
        completed=False,
        question=question,
    )


def answer_persona(db: Session, req: PersonaAnswerRequest) -> PersonaAnswerResponse:
    record = _persona_record(db, req.persona_id)
    if record is None:
        raise ValueError("Unknown persona_id.")
    if req.skip and req.answer:
        raise ValueError("Provide either an answer or skip, not both.")
    if not req.skip and not (req.answer or "").strip():
        raise ValueError("Answer text is required unless the question is skipped.")

    entry: dict = {"topic": req.question.topic, "question": req.question.question}
    answers = list(record.answers or [])
    topics_so_far = {e.get("topic") for e in answers}
    if req.question.topic in topics_so_far:
        raise ValueError("This question was already answered.")

    if req.skip:
        entry["answer"] = None  # skipped: no fabricated evidence
    else:
        entry["answer"] = req.answer
    answers.append(entry)
    record.answers = answers
    resume_profile = (
        db.get(ResumeProfile, record.resume_profile_id) if record.resume_profile_id else None
    )
    db.commit()

    topic = _next_topic(answers)
    if topic is None or len(answers) >= MAX_QUESTIONS:
        profile = _build_profile_result(db, record, resume_profile.id if resume_profile else 0)
        db.commit()
        return PersonaAnswerResponse(completed=True, question=None, profile=profile)

    next_question = _generate_question(resume_profile, topic, asked=answers)
    return PersonaAnswerResponse(completed=False, question=next_question, profile=None)


def min_questions() -> int:
    return MIN_QUESTIONS


# Test seams (see tests/test_persona.py): swapped in tests so the real LLM stays unused.


def _QUESTION_GENERATOR(prompt: str, system: str) -> QuestionSpec:
    return _call_llm(prompt, system, QuestionSpec)


def _PROFILE_GENERATOR(prompt: str, system: str) -> ProfileSpec:
    return _call_llm(prompt, system, ProfileSpec)


def _call_llm(prompt: str, system: str, schema_model: type):
    result = complete_json(prompt, system, schema_model=schema_model)  # type: ignore[arg-type]
    if isinstance(result, schema_model):
        return result
    return schema_model.model_validate(result)  # type: ignore[union-attr]
