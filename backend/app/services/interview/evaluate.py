"""Interview evaluation and personalized feedback report generator (Task 4).

Evaluates candidate responses using rubric-based scoring against hidden expected_key_points,
computes deterministic communication metrics, integrates presentation cues & integrity logs
(strictly with candidate consent), and generates verified next steps linked to curated resources.
"""

from __future__ import annotations

import datetime as dt
import logging
import re
from typing import Any

from app.core.db import UTC, SessionLocal, init_db
from app.core.llm import LLMUnavailable, complete_json
from app.core.taxonomy import canonical_skill, normalize_skill
from app.schemas import (
    CommunicationMetrics,
    IntegritySummary,
    InterviewReport,
    Job,
    QuestionEvaluation,
    ReportNextStep,
)
from app.services.interview.models import InterviewSessionModel
from app.services.interview.prompts import (
    DETAILED_QUESTION_EVALUATION_PROMPT,
    DETAILED_QUESTION_EVALUATION_SYSTEM,
)
from app.services.skills.resources import CURATED_RESOURCES

logger = logging.getLogger(__name__)


def _utcnow_iso() -> str:
    return dt.datetime.now(UTC).isoformat()


# Filler word regex patterns for deterministic metrics
FILLER_PATTERNS: dict[str, re.Pattern[str]] = {
    "um": re.compile(r"\bum\b", re.IGNORECASE),
    "uh": re.compile(r"\buh\b", re.IGNORECASE),
    "like": re.compile(r"\blike\b", re.IGNORECASE),
    "you know": re.compile(r"\byou know\b", re.IGNORECASE),
    "basically": re.compile(r"\bbasically\b", re.IGNORECASE),
}

# Additional common filler markers for detailed breakdown
OPTIONAL_FILLER_PATTERNS: dict[str, re.Pattern[str]] = {
    "actually": re.compile(r"\bactually\b", re.IGNORECASE),
    "sort of": re.compile(r"\bsort of\b", re.IGNORECASE),
    "kind of": re.compile(r"\bkind of\b", re.IGNORECASE),
}

# STAR markers for structural assessment
STAR_INDICATORS = {
    "situation": [
        "when i was",
        "at my previous",
        "in project",
        "we had",
        "the situation",
        "working at",
        "context",
    ],
    "task": [
        "goal was",
        "task was",
        "needed to",
        "required to",
        "responsible for",
        "the problem",
        "objective",
    ],
    "action": [
        "i implemented",
        "i built",
        "i designed",
        "i created",
        "i decided",
        "my approach",
        "i wrote",
        "i led",
        "i investigated",
    ],
    "result": [
        "result",
        "achieved",
        "reduced",
        "improved",
        "increased",
        "successfully",
        "impact",
        "learned that",
        "metrics",
    ],
}

_SKIP_PHRASES = [
    "pass",
    "skip",
    "i don't know",
    "i do not know",
    "no idea",
    "next question",
    "can we skip",
    "not sure",
]


def is_system_content(text: str) -> bool:
    """Detect whether a transcript turn contains system prompts or perception instructions."""
    if not text:
        return False
    t = text.lower()
    if "you are robin" in t and "interviewer" in t:
        return True
    if "strict behavioral rules" in t:
        return True
    if "for reference, the current date and time" in t:
        return True
    if "<user_visual_analysis>" in t or "<emotion_call>" in t:
        return True
    if "perception metadata" in t or "webcam and screen labels" in t:
        return True
    return False


def compute_communication_metrics(
    transcript: list[dict[str, Any]] | None,
) -> CommunicationMetrics:
    """Computes deterministic communication metrics from transcript turns.

    Metrics:
    - Words per minute (WPM)
    - Filler word count & breakdown (um, uh, like, you know, basically)
    - Filler percentage
    - Average answer duration & words
    - Long pauses (>3s)
    - Skipped questions
    - Clarity, conciseness, confidence, and STAR structure scores (0-10)
    """
    if not transcript:
        return CommunicationMetrics()

    user_turns: list[dict[str, Any]] = []
    assistant_turns: list[dict[str, Any]] = []

    for turn in transcript:
        role = str(turn.get("role") or turn.get("speaker") or "").lower()
        content = str(turn.get("content") or turn.get("text") or turn.get("message") or "").strip()
        if not content or is_system_content(content):
            continue
        if role in ("system", "environment", "metadata", "perception"):
            continue

        if role in ("user", "candidate", "you", "human"):
            user_turns.append(turn)
        elif role in ("assistant", "interviewer", "robin", "bot", "ai"):
            assistant_turns.append(turn)
        else:
            # Fallback if roles aren't explicitly labeled
            user_turns.append(turn)

    if not user_turns:
        return CommunicationMetrics()

    # Extract all candidate text
    user_texts: list[str] = []
    for turn in user_turns:
        text = str(turn.get("content") or turn.get("text") or turn.get("message") or "").strip()
        if text:
            user_texts.append(text)

    combined_text = " ".join(user_texts)
    all_words = re.findall(r"\b[\w'-]+\b", combined_text)
    total_words = len(all_words)

    # 1. Filler words calculation
    filler_breakdown: dict[str, int] = {}
    for name, pattern in FILLER_PATTERNS.items():
        count = len(pattern.findall(combined_text))
        filler_breakdown[name] = count

    for name, pattern in OPTIONAL_FILLER_PATTERNS.items():
        count = len(pattern.findall(combined_text))
        if count > 0:
            filler_breakdown[name] = count

    filler_word_count = sum(filler_breakdown.values())
    filler_percentage = (
        round((filler_word_count / total_words) * 100, 1) if total_words > 0 else 0.0
    )

    # 2. Durations and WPM
    total_duration_seconds = 0.0
    has_explicit_duration = False
    for turn in user_turns:
        dur = turn.get("duration")
        if dur is not None:
            try:
                total_duration_seconds += float(dur)
                has_explicit_duration = True
            except (ValueError, TypeError):
                pass

    if not has_explicit_duration or total_duration_seconds <= 0:
        # Check turn delta timestamps if available
        first_time = None
        last_time = None
        for turn in user_turns:
            ts = turn.get("timestamp") or turn.get("seconds_from_start")
            if ts is not None:
                try:
                    val = float(ts)
                    if first_time is None or val < first_time:
                        first_time = val
                    if last_time is None or val > last_time:
                        last_time = val
                except (ValueError, TypeError):
                    pass

        if first_time is not None and last_time is not None and last_time > first_time:
            total_duration_seconds = last_time - first_time
        elif total_words > 0:
            # Baseline estimation assuming standard 135 WPM pace
            total_duration_seconds = (total_words / 135.0) * 60.0

    if total_duration_seconds > 0 and total_words > 0:
        wpm = round(total_words / (total_duration_seconds / 60.0), 1)
        wpm = max(40.0, min(240.0, wpm))
    else:
        wpm = 135.0 if total_words > 0 else 0.0

    num_answers = max(len(user_texts), 1)
    avg_duration = round(total_duration_seconds / num_answers, 1)
    avg_words = round(total_words / num_answers, 1)

    # 3. Long pauses (>3s)
    long_pauses = 0
    for turn in transcript:
        pause_val = turn.get("pause_duration") or turn.get("silence_duration")
        if pause_val is not None:
            try:
                if float(pause_val) >= 3.0:
                    long_pauses += 1
            except (ValueError, TypeError):
                pass

    # Check inter-turn gaps if timestamps exist
    for i in range(len(transcript) - 1):
        t1 = transcript[i]
        t2 = transcript[i + 1]
        r1 = str(t1.get("role") or "").lower()
        r2 = str(t2.get("role") or "").lower()
        if r1 in ("assistant", "interviewer") and r2 in ("user", "candidate"):
            end1 = t1.get("end_time") or t1.get("timestamp")
            start2 = t2.get("start_time") or t2.get("timestamp")
            if end1 is not None and start2 is not None:
                try:
                    gap = float(start2) - float(end1)
                    if gap >= 3.0:
                        long_pauses += 1
                except (ValueError, TypeError):
                    pass

    # 4. Skipped questions
    skipped_count = 0
    for text in user_texts:
        lower_txt = text.lower().strip()
        words_in_turn = re.findall(r"\b\w+\b", lower_txt)
        if len(words_in_turn) < 4 or any(phrase in lower_txt for phrase in _SKIP_PHRASES):
            skipped_count += 1

    if total_words == 0:
        return CommunicationMetrics(
            words_per_minute=0.0,
            filler_word_count=0,
            filler_percentage=0.0,
            filler_breakdown={},
            average_answer_duration_seconds=0.0,
            average_answer_words=0.0,
            long_pauses_count=long_pauses,
            skipped_questions_count=skipped_count,
            clarity_score=0.0,
            conciseness_score=0.0,
            confidence_score=0.0,
            star_structure_score=0.0,
        )

    # 5. Dimension scores (0 - 10)
    if total_words < 15:
        clarity_score = round(max(1.0, min(5.0, 2.5 + (total_words * 0.15))), 1)
        conciseness_score = 3.5
        confidence_score = round(max(1.0, 4.0 - (1.5 * skipped_count)), 1)
        star_structure_score = 2.0
    else:
        # Clarity: penalized by fillers and unnatural pace
        pace_penalty = 1.5 if (wpm > 185 or (wpm < 95 and total_words > 0)) else 0.0
        filler_penalty = min(4.0, filler_percentage * 0.4)
        clarity_score = round(max(2.0, min(10.0, 10.0 - filler_penalty - pace_penalty)), 1)

        # Conciseness: ideal average answer is 40-180 words
        conciseness_deduction = 0.0
        if avg_words > 250:
            conciseness_deduction = min(3.5, (avg_words - 250) * 0.02)
        elif avg_words < 20 and total_words > 0:
            conciseness_deduction = 2.5
        conciseness_score = round(max(2.0, min(10.0, 9.5 - conciseness_deduction)), 1)

        # Confidence: penalized by fillers, excessive pauses, and skips
        confidence_penalty = (
            min(3.0, filler_percentage * 0.3) + (0.5 * min(long_pauses, 4)) + (1.5 * skipped_count)
        )
        confidence_score = round(max(1.0, min(10.0, 9.5 - confidence_penalty)), 1)

        # STAR structure score: measure coverage of situation, task, action, result
        star_hits = 0
        lowered_comb = combined_text.lower()
        for _, markers in STAR_INDICATORS.items():
            if any(marker in lowered_comb for marker in markers):
                star_hits += 1

        star_score_map = {4: 9.2, 3: 8.2, 2: 7.0, 1: 5.8, 0: 4.5}
        star_structure_score = star_score_map.get(star_hits, 4.5)

    return CommunicationMetrics(
        words_per_minute=wpm,
        filler_word_count=filler_word_count,
        filler_percentage=filler_percentage,
        filler_breakdown=filler_breakdown,
        average_answer_duration_seconds=avg_duration,
        average_answer_words=avg_words,
        long_pauses_count=long_pauses,
        skipped_questions_count=skipped_count,
        clarity_score=clarity_score,
        conciseness_score=conciseness_score,
        confidence_score=confidence_score,
        star_structure_score=star_structure_score,
    )


def extract_candidate_answers(
    questions: list[dict[str, Any]],
    transcript: list[dict[str, Any]] | None,
) -> list[str]:
    """Aligns transcript turns to each question in the interview plan.

    Returns a list of candidate answer strings corresponding 1-to-1 with `questions`.
    """
    if not transcript or not questions:
        return ["" for _ in questions]

    # Partition into assistant and user turns
    candidate_turns_by_question: list[list[str]] = [[] for _ in questions]
    current_q_idx = 0

    for turn in transcript:
        role = str(turn.get("role") or turn.get("speaker") or "").lower()
        content = str(turn.get("content") or turn.get("text") or turn.get("message") or "").strip()
        if not content:
            continue

        if role in ("system", "environment", "metadata", "perception") or is_system_content(
            content
        ):
            continue

        # Exclude UI status logs
        if content in ("[Marked answer as complete]", "[Skipped question]"):
            continue

        if role in ("assistant", "interviewer", "robin", "ai", "bot"):
            # Check if this assistant turn corresponds to any question
            best_idx = None
            for idx, q in enumerate(questions):
                q_text = str(q.get("text") or q.get("question") or "")
                # Simple containment or prefix check
                if q_text and (
                    q_text[:30].lower() in content.lower() or content[:30].lower() in q_text.lower()
                ):
                    best_idx = idx
                    break
            if best_idx is not None:
                current_q_idx = best_idx
            else:
                # If we're past the first question and assistant is speaking again, increment
                if candidate_turns_by_question[current_q_idx] and current_q_idx + 1 < len(
                    questions
                ):
                    current_q_idx += 1
        elif role in ("user", "candidate", "you", "human") or role == "":
            # Candidate turn
            if current_q_idx < len(candidate_turns_by_question):
                candidate_turns_by_question[current_q_idx].append(content)

    # Combine utterances per question and verify no system content leaked
    answers: list[str] = []
    for turn_list in candidate_turns_by_question:
        combined = " ".join(turn_list).strip()
        if is_system_content(combined):
            combined = ""
        answers.append(combined)

    # Fallback: If no assistant roles were tagged and answers are all in index 0,
    # distribute sequential user turns across questions
    if len(answers) > 1 and not any(answers[1:]) and candidate_turns_by_question[0]:
        all_turns = candidate_turns_by_question[0]
        if len(all_turns) >= len(questions):
            return [
                all_turns[i] if not is_system_content(all_turns[i]) else ""
                for i in range(len(questions))
            ]

    return answers


def _heuristic_evaluate_question(
    question: dict[str, Any],
    candidate_answer: str,
    job_title: str,
    company_name: str,
) -> QuestionEvaluation:
    """Deterministic fallback evaluation when LLM is unavailable."""
    q_id = str(question.get("id") or "q")
    q_text = str(question.get("text") or question.get("question") or "")
    q_type = str(question.get("type") or question.get("kind") or "technical")
    focus = question.get("focus_skill_or_project") or question.get("focus_skill")
    difficulty = str(question.get("difficulty") or "medium")
    rubric_points = question.get("expected_key_points") or []

    if not rubric_points:
        rubric_points = [
            f"Demonstrates clear technical understanding of {focus or 'the topic'}",
            "Explains practical trade-offs, architecture, or workflow",
            "Communicates clearly with structured problem-solving",
        ]

    words = re.findall(r"\b[\w'-]+\b", candidate_answer.lower())
    is_skipped = (
        len(words) < 5
        or any(p in candidate_answer.lower() for p in _SKIP_PHRASES)
        or not candidate_answer.strip()
    )

    if is_skipped:
        return QuestionEvaluation(
            question_id=q_id,
            question_text=q_text,
            question_type=q_type,
            focus_skill_or_project=str(focus) if focus else None,
            difficulty=difficulty,
            score=0.0,
            candidate_answer=candidate_answer,
            covered_points=[],
            missed_points=list(rubric_points),
            strengths=[],
            improvements=[
                "Attempt an answer using foundational concepts instead of skipping.",
                "Structure your thinking by breaking the question down into smaller components.",
            ],
            sample_answer=(
                f"When approaching {q_text[:40]}..., start by clarifying requirements, "
                "explain your technical choices with trade-offs, and state results."
            ),
        )

    covered: list[str] = []
    missed: list[str] = []

    answer_lower = candidate_answer.lower()
    for pt in rubric_points:
        # Extract meaningful keywords from rubric point
        pt_words = [
            w
            for w in re.findall(r"\b\w{4,}\b", pt.lower())
            if w not in ("with", "that", "from", "your", "what")
        ]
        matches = [w for w in pt_words if w in answer_lower]
        if pt_words and (
            len(matches) / len(pt_words) >= 0.35 or any(w in answer_lower for w in pt_words[:2])
        ):
            covered.append(pt)
        else:
            missed.append(pt)

    # Score calculation
    coverage_ratio = len(covered) / max(len(rubric_points), 1)
    base_score = 4.0 + (coverage_ratio * 5.0)
    if len(words) > 40:
        base_score += 0.8
    score = round(max(2.0, min(9.8, base_score)), 1)

    # Strengths
    strengths: list[str] = []
    if covered:
        strengths.append(f"Effectively addressed: {covered[0]}")
    if len(covered) > 1:
        strengths.append(f"Demonstrated solid context on: {covered[1]}")
    if not strengths:
        strengths.append(
            "Communicated relevant technical terminology and showed willingness to engage."
        )

    # Improvements with STAR guidance
    improvements: list[str] = []
    if missed:
        improvements.append(f"Deepen coverage on: {missed[0]}")
    if q_type in ("behavioural", "project") or "star" in q_text.lower():
        improvements.append(
            "Structure your answer with the STAR framework: Situation (context), Task (objective), "
            "Action (your specific technical work), and Result (quantifiable metrics)."
        )
    elif missed and len(missed) > 1:
        improvements.append(f"Include trade-offs or alternatives related to: {missed[1]}")
    else:
        improvements.append(
            "Quantify the impact or performance improvements achieved in your solution."
        )

    # Sample Answer
    sample_answer = (
        "A compelling answer to this question should cover: "
        + "; ".join(rubric_points)
        + ". In particular, outline your direct engineering contribution, rationale, "
        + "and metrics proving success."
    )

    return QuestionEvaluation(
        question_id=q_id,
        question_text=q_text,
        question_type=q_type,
        focus_skill_or_project=str(focus) if focus else None,
        difficulty=difficulty,
        score=score,
        candidate_answer=candidate_answer,
        covered_points=covered,
        missed_points=missed,
        strengths=strengths,
        improvements=improvements,
        sample_answer=sample_answer,
    )


def evaluate_question_answer(
    question: dict[str, Any],
    candidate_answer: str,
    job_title: str = "Software Engineer",
    company_name: str = "Company",
) -> QuestionEvaluation:
    """Evaluates a single question answer using Groq/OpenAI with strict json_schema,

    falling back to deterministic rubric matching when LLM is unavailable.
    """
    q_id = str(question.get("id") or "q")
    q_text = str(question.get("text") or question.get("question") or "")
    q_type = str(question.get("type") or question.get("kind") or "technical")
    focus = question.get("focus_skill_or_project") or question.get("focus_skill") or "General"
    difficulty = str(question.get("difficulty") or "medium")
    rubric_points = question.get("expected_key_points") or []

    if is_system_content(candidate_answer):
        candidate_answer = ""

    # If answer is empty or trivially short, bypass LLM
    if len(re.findall(r"\b\w+\b", candidate_answer.lower())) < 4:
        return _heuristic_evaluate_question(question, candidate_answer, job_title, company_name)

    rubric_text = (
        "\n".join(f"- {p}" for p in rubric_points)
        if rubric_points
        else "- Accurate technical explanation"
    )

    prompt = DETAILED_QUESTION_EVALUATION_PROMPT.format(
        job_title=job_title,
        job_company=company_name,
        question_type=q_type,
        difficulty=difficulty,
        question_text=q_text,
        focus_area=focus,
        expected_key_points=rubric_text,
        candidate_answer=candidate_answer,
    )

    try:
        data = complete_json(prompt, system=DETAILED_QUESTION_EVALUATION_SYSTEM)
        score_val = float(data.get("score", 7.0))
        score = round(max(0.0, min(10.0, score_val)), 1)
        covered = [str(x) for x in data.get("covered_points", [])]
        missed = [str(x) for x in data.get("missed_points", [])]
        strengths = [str(x) for x in data.get("strengths", [])]
        improvements = [str(x) for x in data.get("improvements", [])]
        sample = str(data.get("sample_answer", "")).strip()

        # Enforce STAR guidance for behavioural questions if LLM omitted it
        if q_type in ("behavioural", "project") and not any("STAR" in imp for imp in improvements):
            improvements.append(
                "Structure answers using the STAR method: clarify the Situation, "
                "Task, specific Action taken, and measurable Result."
            )

        return QuestionEvaluation(
            question_id=q_id,
            question_text=q_text,
            question_type=q_type,
            focus_skill_or_project=str(focus) if focus else None,
            difficulty=difficulty,
            score=score,
            candidate_answer=candidate_answer,
            covered_points=covered,
            missed_points=missed,
            strengths=strengths or ["Articulated core engineering context."],
            improvements=improvements or ["Elaborate further on architectural trade-offs."],
            sample_answer=sample
            or _heuristic_evaluate_question(
                question, candidate_answer, job_title, company_name
            ).sample_answer,
        )
    except (LLMUnavailable, Exception) as exc:
        logger.info("Evaluation LLM call bypassed/fallback due to: %s", exc)
        return _heuristic_evaluate_question(question, candidate_answer, job_title, company_name)


def generate_presentation_cues(
    perception_analysis: dict[str, Any] | None,
    consent_given: bool,
) -> list[str] | None:
    """Extracts informational presentation suggestions from Tavus perception analysis

    strictly when candidate consented. Never returns grade scores.
    """
    if not consent_given or not perception_analysis:
        return None

    cues: list[str] = []
    analysis = perception_analysis.get("analysis") or perception_analysis

    if isinstance(analysis, dict):
        eye_contact = analysis.get("eye_contact") or analysis.get("visual_engagement")
        if eye_contact:
            cues.append(f"Visual Engagement: {eye_contact}")
        head_pose = analysis.get("head_pose") or analysis.get("posture")
        if head_pose:
            cues.append(f"Posture & Positioning: {head_pose}")
        pacing = analysis.get("pacing") or analysis.get("speech_flow")
        if pacing:
            cues.append(f"Delivery & Pacing: {pacing}")
        suggestions = analysis.get("suggestions") or analysis.get("observations")
        if isinstance(suggestions, list):
            for s in suggestions:
                if str(s).strip():
                    cues.append(str(s).strip())

    if not cues:
        cues = [
            "Maintain direct eye contact with the web camera rather than the screen center.",
            "Position your key light in front of you to keep your face evenly illuminated.",
            "Maintain an upright, comfortable posture to project confident executive presence.",
        ]

    return cues[:4]


def generate_integrity_summary(
    integrity_log: list[dict[str, Any]] | None,
    consent_integrity: bool,
) -> IntegritySummary | None:
    """Summarizes browser/tab integrity monitoring events strictly if consented."""
    if not consent_integrity:
        return None

    events = integrity_log or []
    tab_switches = 0
    fullscreen_exits = 0
    face_missing = 0
    multiple_faces = 0
    flags: list[str] = []

    for ev in events:
        etype = str(ev.get("type") or ev.get("event") or "").lower()
        if "tab" in etype or "blur" in etype or "visibility" in etype:
            tab_switches += 1
        elif "fullscreen" in etype:
            fullscreen_exits += 1
        elif "face_missing" in etype or "noface" in etype:
            face_missing += 1
        elif "multiple_face" in etype:
            multiple_faces += 1

    total = len(events)
    # Deductions: 5 pts per tab/fullscreen, 10 per face loss, 15 per multiple face
    penalty = (
        (tab_switches * 5) + (fullscreen_exits * 5) + (face_missing * 10) + (multiple_faces * 15)
    )
    score = max(0, min(100, 100 - penalty))

    if tab_switches > 0:
        flags.append(f"{tab_switches} tab switch / window blur event(s) detected during interview.")
    if fullscreen_exits > 0:
        flags.append(f"{fullscreen_exits} fullscreen exit event(s) recorded.")
    if face_missing > 0:
        flags.append(f"Camera face tracking lost {face_missing} time(s).")
    if multiple_faces > 0:
        flags.append(f"Multiple individuals detected in camera view {multiple_faces} time(s).")

    if not flags:
        flags.append("Optimal interview integrity maintained throughout the session.")

    return IntegritySummary(
        integrity_score=score,
        total_events=total,
        tab_switch_count=tab_switches,
        fullscreen_exit_count=fullscreen_exits,
        face_missing_count=face_missing,
        multiple_faces_count=multiple_faces,
        flags=flags,
    )


def generate_next_steps(
    question_evaluations: list[QuestionEvaluation],
    job: Job | None,
) -> list[ReportNextStep]:
    """Generates 3 concrete, personalized next steps linked to CURATED_RESOURCES."""
    next_steps: list[ReportNextStep] = []
    seen_skills: set[str] = set()

    # 1. Identify skills with lower scores or missed rubric points
    for q in sorted(question_evaluations, key=lambda x: x.score):
        skill_candidate = q.focus_skill_or_project
        if skill_candidate:
            canon = canonical_skill(skill_candidate)
            lookup_key = canon.lower() if canon else skill_candidate.lower()
            if lookup_key in CURATED_RESOURCES and lookup_key not in seen_skills:
                res_list = CURATED_RESOURCES[lookup_key]
                res = res_list[0] if res_list else None
                seen_skills.add(lookup_key)
                next_steps.append(
                    ReportNextStep(
                        title=f"Strengthen {normalize_skill(lookup_key)} Core Patterns",
                        skill=normalize_skill(lookup_key),
                        action=(
                            f"Deepen knowledge on {normalize_skill(lookup_key)} architectural "
                            "principles and interview scenarios."
                        ),
                        url=res.url if res else None,
                        kind=res.kind if res else "docs",
                    )
                )
                if len(next_steps) >= 3:
                    break

    # 2. Check required skills from job
    if job and len(next_steps) < 3:
        for skill in job.skills_required:
            canon = canonical_skill(skill)
            lookup_key = canon.lower() if canon else skill.lower()
            if lookup_key in CURATED_RESOURCES and lookup_key not in seen_skills:
                res_list = CURATED_RESOURCES[lookup_key]
                res = res_list[0] if res_list else None
                seen_skills.add(lookup_key)
                next_steps.append(
                    ReportNextStep(
                        title=f"Review {normalize_skill(lookup_key)} Interview Prep",
                        skill=normalize_skill(lookup_key),
                        action=f"Targeted preparation for {job.title} at {job.company}.",
                        url=res.url if res else None,
                        kind=res.kind if res else "course",
                    )
                )
                if len(next_steps) >= 3:
                    break

    # 3. Fallbacks if fewer than 3 found
    fallbacks = [
        (
            "Python",
            "python",
            "Practice algorithmic problem solving and clean backend architecture.",
        ),
        ("SQL", "sql", "Review indexing, query optimization, and transaction isolation levels."),
        ("Docker", "docker", "Review containerization, Dockerfiles, and multi-stage builds."),
    ]
    for skill_name, key, act in fallbacks:
        if len(next_steps) >= 3:
            break
        if key not in seen_skills:
            seen_skills.add(key)
            res_list = CURATED_RESOURCES.get(key, [])
            res = res_list[0] if res_list else None
            next_steps.append(
                ReportNextStep(
                    title=f"Master {skill_name} Fundamentals",
                    skill=skill_name,
                    action=act,
                    url=res.url if res else None,
                    kind=res.kind if res else "practice",
                )
            )

    return next_steps[:3]


def generate_interview_report(
    session: InterviewSessionModel,
    job: Job | None = None,
) -> InterviewReport:
    """Generates the full InterviewReport for an interview session."""
    raw_plan = session.plan or {}
    questions = raw_plan.get("questions", [])
    transcript = session.transcript or []

    # Align candidate answers to questions
    candidate_answers = extract_candidate_answers(questions, transcript)

    # Evaluate each question
    evaluations: list[QuestionEvaluation] = []
    for idx, q in enumerate(questions):
        ans = candidate_answers[idx] if idx < len(candidate_answers) else ""
        eval_result = evaluate_question_answer(
            question=q,
            candidate_answer=ans,
            job_title=session.role_title or (job.title if job else "Role"),
            company_name=session.company_name or (job.company if job else "Company"),
        )
        evaluations.append(eval_result)

    # Compute deterministic communication metrics
    comm_metrics = compute_communication_metrics(transcript)

    # Calculate overall weighted score (0-100)
    # 70% technical rubric accuracy, 30% communication & delivery
    avg_question_score = (
        sum(e.score for e in evaluations) / max(len(evaluations), 1) if evaluations else 7.0
    )
    comm_score_avg = (
        comm_metrics.clarity_score
        + comm_metrics.conciseness_score
        + comm_metrics.confidence_score
        + comm_metrics.star_structure_score
    ) / 4.0

    raw_overall = (avg_question_score * 10.0 * 0.70) + (comm_score_avg * 10.0 * 0.30)
    overall_score = int(round(max(0, min(100, raw_overall))))

    # Readiness level
    if overall_score >= 80:
        readiness = "Ready"
    elif overall_score >= 60:
        readiness = "Nearly Ready"
    else:
        readiness = "Needs Practice"

    # Top strengths across questions
    top_strengths: list[str] = []
    for e in sorted(evaluations, key=lambda x: x.score, reverse=True):
        if e.strengths:
            for st in e.strengths:
                if st not in top_strengths:
                    top_strengths.append(st)
                if len(top_strengths) >= 3:
                    break
        if len(top_strengths) >= 3:
            break

    if len(top_strengths) < 3:
        if comm_metrics.filler_percentage <= 3.0:
            top_strengths.append("Crisp vocal delivery with low filler-word frequency.")
        if comm_metrics.words_per_minute >= 120 and comm_metrics.words_per_minute <= 165:
            top_strengths.append("Maintained optimal speaking pace (120-165 WPM).")
        top_strengths.append("Structured technical responses with professional demeanor.")

    # Top improvements quoting candidate words
    top_improvements: list[str] = []
    for e in sorted(evaluations, key=lambda x: x.score):
        ans_preview = ""
        words = re.findall(r"\b\w+\b", e.candidate_answer)
        if len(words) >= 4:
            topic = e.focus_skill_or_project or "the technical problem"
            quote = " ".join(words[:6])
            ans_preview = f' When discussing "{topic}", you said "{quote}..."'

        if e.improvements:
            for imp in e.improvements:
                formatted_imp = (
                    f"{imp}{ans_preview}" if ans_preview and ans_preview not in imp else imp
                )
                if formatted_imp not in top_improvements:
                    top_improvements.append(formatted_imp)
                if len(top_improvements) >= 3:
                    break
        if len(top_improvements) >= 3:
            break

    if len(top_improvements) < 3:
        if comm_metrics.filler_percentage > 4.0:
            top_improvements.append(
                f"Reduce filler words ({comm_metrics.filler_percentage}% rate). "
                "Pause deliberately instead of saying 'um' or 'like'."
            )
        top_improvements.append(
            "Apply the STAR method to behavioural questions by highlighting measurable outcomes."
        )

    # Presentation cues (optional, strictly if consented)
    presentation_cues = generate_presentation_cues(
        session.perception_analysis,
        consent_given=session.consent_integrity or session.consent_recording,
    )

    # Integrity summary (optional, strictly if consented)
    integrity_summary = generate_integrity_summary(
        session.integrity_log,
        consent_integrity=session.consent_integrity,
    )

    # Personalized next steps linked to verified resources
    next_steps = generate_next_steps(evaluations, job)

    # Summary paragraph
    candidate_name = session.candidate_name or "Candidate"
    summary_text = (
        f"{candidate_name} completed the AI mock interview for {session.role_title} at "
        f"{session.company_name} with an overall score of {overall_score}/100 ({readiness}). "
        "You demonstrated solid familiarity with key technical concepts and sustained an average "
        f"speaking cadence of {comm_metrics.words_per_minute} WPM. Focusing on the targeted next "
        "steps will help you communicate high-impact results with complete confidence."
    )

    report = InterviewReport(
        session_id=session.id,
        job_id=session.job_id,
        role_title=session.role_title,
        company_name=session.company_name,
        candidate_name=session.candidate_name,
        overall_score=overall_score,
        readiness_level=readiness,
        summary=summary_text,
        top_strengths=top_strengths[:3],
        top_improvements=top_improvements[:3],
        next_steps=next_steps[:3],
        question_evaluations=evaluations,
        communication_metrics=comm_metrics,
        presentation_cues=presentation_cues,
        integrity_summary=integrity_summary,
        created_at=_utcnow_iso(),
    )

    return report


def delete_interview_session_data(session_id: str) -> dict[str, Any]:
    """Privacy/GDPR 'Delete my data': Permanently purges transcript, recording,

    perception analysis, integrity logs, and generated report for the session.
    """
    init_db()
    with SessionLocal() as db_session:
        model = db_session.get(InterviewSessionModel, session_id)
        if model is None:
            raise ValueError(f"Session '{session_id}' not found.")

        model.transcript = None
        model.recording_url = None
        model.perception_analysis = None
        model.integrity_log = None
        model.report = None
        model.status = "deleted"
        db_session.commit()

        return {
            "status": "deleted",
            "session_id": session_id,
            "message": "Candidate interview data permanently purged.",
        }
