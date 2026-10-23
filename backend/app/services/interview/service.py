"""Interview practice (owner: Teammate C).

Generates technical, behavioural, and HR questions tailored to the resume and job,
and evaluates candidate answers using a rubric-based scoring model with STAR guidance.
"""

import datetime as dt
import logging
import secrets
import uuid
from typing import Any

import httpx

from app.core.db import UTC, SessionLocal, init_db
from app.core.llm import complete_json
from app.schemas import (
    AnswerFeedback,
    ClientQuestion,
    InterviewPlan,
    InterviewPlanQuestion,
    InterviewQuestion,
    InterviewSessionResponse,
    Job,
    ParsedResume,
    PersonaInput,
)
from app.services.interview.models import InterviewSessionModel
from app.services.interview.prompts import (
    INTERVIEW_EVALUATION_PROMPT,
    INTERVIEW_EVALUATION_SYSTEM,
    INTERVIEW_PLAN_PROMPT,
    INTERVIEW_PLAN_SYSTEM,
    INTERVIEW_QUESTIONS_PROMPT,
    INTERVIEW_QUESTIONS_SYSTEM,
)
from app.services.interview.tavus import (
    create_tavus_conversation,
    end_tavus_conversation,
    fetch_tavus_conversation_verbose,
)

logger = logging.getLogger(__name__)


def _utcnow() -> dt.datetime:
    return dt.datetime.now(UTC)


_BEHAVIOURAL_TEMPLATES = [
    "Tell me about a challenging technical roadblock in a project and how you solved it.",
    "Describe a time you had to learn a completely new framework or tool under tight deadlines.",
    "Tell me about a disagreement within your team on architecture and how you resolved it.",
]

_HR_TEMPLATES = [
    "Why are you interested in this {title} role at {company}?",
    "Where do you see yourself in the next 2-3 years, and what skills do you aim to master?",
    "How do you prioritize your time and maintain code quality when balancing deadlines?",
]


def _heuristic_questions(resume: ParsedResume, job: Job, n: int) -> list[InterviewQuestion]:
    questions: list[InterviewQuestion] = []

    # 1. Technical questions based on required job skills
    for skill in job.skills_required:
        questions.append(
            InterviewQuestion(
                id=f"q{len(questions) + 1}",
                question=f"Explain {skill}, its core principles, and where you have used it.",
                kind="technical",
                focus_skill=skill,
            )
        )

    # 2. Behavioural questions
    for text in _BEHAVIOURAL_TEMPLATES:
        questions.append(
            InterviewQuestion(
                id=f"q{len(questions) + 1}",
                question=text,
                kind="behavioural",
            )
        )

    # 3. HR questions
    for template in _HR_TEMPLATES:
        questions.append(
            InterviewQuestion(
                id=f"q{len(questions) + 1}",
                question=template.format(title=job.title, company=job.company),
                kind="hr",
            )
        )

    # If n is small, ensure a balanced mix across categories
    if n == 3 and len(questions) >= 3:
        tech_q = next((q for q in questions if q.kind == "technical"), questions[0])
        beh_q = next((q for q in questions if q.kind == "behavioural"), questions[1])
        hr_q = next((q for q in questions if q.kind == "hr"), questions[2])
        selected = [tech_q, beh_q, hr_q]
        for i, q in enumerate(selected):
            q.id = f"q{i + 1}"
        return selected

    return questions[:n]


def _llm_generate_questions(resume: ParsedResume, job: Job, n: int) -> list[InterviewQuestion]:
    prompt = INTERVIEW_QUESTIONS_PROMPT.format(
        job_title=job.title,
        job_company=job.company,
        job_description=job.description,
        skills_required=", ".join(job.skills_required),
        candidate_summary=resume.summary or "Not provided",
        candidate_skills=", ".join(resume.skills) if resume.skills else "Not provided",
        candidate_projects=", ".join(resume.projects) if resume.projects else "Not provided",
        num_questions=n,
    )
    payload = complete_json(prompt, system=INTERVIEW_QUESTIONS_SYSTEM)
    items = payload.get("questions", [])
    if not isinstance(items, list) or not items:
        raise ValueError("Payload 'questions' must be a non-empty list.")

    questions: list[InterviewQuestion] = []
    for item in items[:n]:
        kind = item.get("kind", "technical")
        if kind not in ("technical", "behavioural", "hr"):
            kind = "technical"
        q_text = str(item.get("question", "")).strip()
        if not q_text:
            continue
        focus = item.get("focus_skill")
        questions.append(
            InterviewQuestion(
                id=f"q{len(questions) + 1}",
                question=q_text,
                kind=kind,
                focus_skill=str(focus) if focus else None,
            )
        )

    if len(questions) < n:
        fallback = _heuristic_questions(resume, job, n)
        for q in fallback[len(questions) : n]:
            questions.append(
                InterviewQuestion(
                    id=f"q{len(questions) + 1}",
                    question=q.question,
                    kind=q.kind,
                    focus_skill=q.focus_skill,
                )
            )

    return questions[:n]


def generate_questions(resume: ParsedResume, job: Job, n: int) -> list[InterviewQuestion]:
    try:
        return _llm_generate_questions(resume, job, n)
    except Exception:
        return _heuristic_questions(resume, job, n)


def _heuristic_evaluate_answer(
    job: Job, question: InterviewQuestion, answer: str
) -> AnswerFeedback:
    words = answer.strip().split()
    word_count = len(words)
    strengths: list[str] = []
    improvements: list[str] = []

    if word_count < 10:
        score = 2
        improvements.append("Response is too brief. Provide a thorough, structured explanation.")
    elif word_count < 30:
        score = 5
        strengths.append("Direct answer that acknowledges the core question.")
        improvements.append(
            "Add more depth: explain your specific actions, reasoning, and results."
        )
    elif word_count < 60:
        score = 7
        strengths.append("Good level of detail with relevant context provided.")
        improvements.append("Quantify outcomes or discuss technical trade-offs to stand out.")
    else:
        score = 8
        strengths.append("Detailed, comprehensive response with substantial technical context.")

    if question.kind == "behavioural":
        has_star = any(
            k in answer.lower()
            for k in ["situation", "task", "action", "result", "outcome", "led to", "impact"]
        )
        if has_star:
            strengths.append("Structured narrative effectively outlining your actions and outcome.")
            score = min(10, score + 1)
        else:
            improvements.append(
                "Structure your response using the STAR method: describe the Situation, Task, "
                "Action you took, and measurable Result."
            )

        sample_answer = (
            "Situation: In a capstone project, our backend service crashed under load tests.\n"
            "Task: As backend developer, I had to diagnose the issue and restore stability.\n"
            "Action: I analyzed memory logs, fixed connection leaks, and added Redis caching.\n"
            "Result: System latency dropped by 55%, passing load tests before demo day."
        )
    elif question.kind == "technical":
        skill = question.focus_skill
        if skill and skill.lower() in answer.lower():
            strengths.append(f"Directly addressed {skill} and provided relevant technical context.")
            score = min(10, score + 1)
        elif skill:
            improvements.append(
                f"Explicitly mention {skill} and explain its architecture or patterns."
            )

        sample_answer = (
            f"When building production systems with {question.focus_skill or 'this technology'}, "
            "I prioritize clean architecture, robust input validation, and async processing. "
            "For instance, I decouple services using repository patterns, write unit tests "
            "with pytest, and monitor latency to ensure reliable performance at scale."
        )
    else:
        # HR question
        has_motivation = any(
            w in answer.lower()
            for w in [
                "learn",
                "grow",
                "team",
                "culture",
                "contribute",
                "excited",
                job.title.lower(),
            ]
        )
        if has_motivation:
            strengths.append(f"Shows positive enthusiasm and alignment with the {job.title} role.")
            score = min(10, score + 1)
        else:
            improvements.append(
                f"Connect your career goals directly to {job.company}'s mission and team culture."
            )

        sample_answer = (
            f"I am genuinely excited about the {job.title} role at {job.company} because it offers "
            "the opportunity to solve impactful problems in a collaborative environment. Over the "
            "next 2-3 years, I plan to master backend systems and deliver reliable features."
        )

    score = max(0, min(10, score))
    return AnswerFeedback(
        score=score,
        strengths=strengths,
        improvements=improvements,
        sample_answer=sample_answer,
    )


def _llm_evaluate_answer(job: Job, question: InterviewQuestion, answer: str) -> AnswerFeedback:
    prompt = INTERVIEW_EVALUATION_PROMPT.format(
        job_title=job.title,
        job_company=job.company,
        question_text=question.question,
        question_kind=question.kind,
        focus_skill=question.focus_skill or "General",
        candidate_answer=answer,
    )
    payload = complete_json(prompt, system=INTERVIEW_EVALUATION_SYSTEM)
    score = int(payload.get("score", 5))
    score = max(0, min(10, score))
    strengths = [str(s).strip() for s in payload.get("strengths", []) if str(s).strip()]
    improvements = [str(i).strip() for i in payload.get("improvements", []) if str(i).strip()]
    sample_answer = payload.get("sample_answer")

    return AnswerFeedback(
        score=score,
        strengths=strengths or ["Addressed the core aspects of the question."],
        improvements=improvements or ["Consider adding more concrete metrics and outcomes."],
        sample_answer=str(sample_answer).strip() if sample_answer else None,
    )


def evaluate_answer(job: Job, question: InterviewQuestion, answer: str) -> AnswerFeedback:
    try:
        return _llm_evaluate_answer(job, question, answer)
    except Exception:
        return _heuristic_evaluate_answer(job, question, answer)


# ---------- Pre-generated Interview Plan & Sessions ----------

_DIFFICULTY_RANK = {"easy": 1, "medium": 2, "hard": 3}


def _sort_questions_easy_to_hard(
    questions: list[InterviewPlanQuestion],
) -> list[InterviewPlanQuestion]:
    """Sorts questions strictly from easy to hard, ensuring warmup is first and closing is last."""
    warmup = [q for q in questions if q.type == "warmup"]
    closing = [q for q in questions if q.type == "closing"]
    middles = [q for q in questions if q.type not in ("warmup", "closing")]

    sorted_middles = sorted(middles, key=lambda q: _DIFFICULTY_RANK.get(q.difficulty, 2))
    merged = warmup + sorted_middles + closing

    reindexed: list[InterviewPlanQuestion] = []
    for idx, q in enumerate(merged, start=1):
        reindexed.append(
            InterviewPlanQuestion(
                id=f"q{idx}",
                text=q.text,
                type=q.type,
                focus_skill_or_project=q.focus_skill_or_project,
                difficulty=q.difficulty,
                expected_key_points=q.expected_key_points,
                follow_up=q.follow_up,
                time_guide_seconds=q.time_guide_seconds,
            )
        )
    return reindexed


def _heuristic_interview_plan(
    resume: ParsedResume,
    job: Job,
    persona: PersonaInput | None = None,
    num_questions: int = 5,
    duration_minutes: int = 15,
) -> InterviewPlan:
    candidate_name = resume.name or "there"
    questions: list[InterviewPlanQuestion] = []

    # 1. Warm-up / Introduction (easy)
    questions.append(
        InterviewPlanQuestion(
            id="q1",
            text=(
                f"Hi {candidate_name}, welcome to the interview! To get started, could you "
                "briefly introduce yourself, outline your technical background, and share "
                "what you've been working on recently?"
            ),
            type="warmup",
            focus_skill_or_project=None,
            difficulty="easy",
            expected_key_points=[
                "Clear, concise elevator pitch summarizing background and education",
                "Highlights relevant technical passions, key skills, and goals",
                "Structured delivery within 1-2 minutes",
            ],
            follow_up="What specifically attracted you to this role at our company?",
            time_guide_seconds=90,
        )
    )

    # 2. Project Deep-Dives (up to 2 naming specific projects and technologies from resume)
    # Never ask about a project that is not in the resume!
    if resume.projects:
        p1 = resume.projects[0]
        questions.append(
            InterviewPlanQuestion(
                id=f"q{len(questions) + 1}",
                text=(
                    f"In your resume, you highlighted '{p1}'. Walk me through the architecture, "
                    "the core technologies you chose, and your specific personal contribution."
                ),
                type="project",
                focus_skill_or_project=p1,
                difficulty="easy",
                expected_key_points=[
                    f"Architectural breakdown and design choices in '{p1}'",
                    "Clear explanation of personal contribution vs team/templates",
                    "Technical trade-offs and rationale behind the stack",
                ],
                follow_up=(
                    "What was the most challenging technical roadblock in that project and "
                    "how did you resolve it?"
                ),
                time_guide_seconds=180,
            )
        )

        if len(resume.projects) >= 2:
            p2 = resume.projects[1]
            questions.append(
                InterviewPlanQuestion(
                    id=f"q{len(questions) + 1}",
                    text=(
                        f"Looking at another project of yours, '{p2}', how did you handle "
                        "edge cases, data integrity, and performance optimization during "
                        "implementation?"
                    ),
                    type="project",
                    focus_skill_or_project=p2,
                    difficulty="medium",
                    expected_key_points=[
                        f"Deep dive into critical modules or components of '{p2}'",
                        "Handling edge cases, error scenarios, and testing methodology",
                        "Performance bottlenecks encountered and how they were solved",
                    ],
                    follow_up=(
                        "If you had to re-architect that system from scratch today, "
                        "what would you improve?"
                    ),
                    time_guide_seconds=180,
                )
            )
    elif resume.experience:
        exp = resume.experience[0]
        questions.append(
            InterviewPlanQuestion(
                id=f"q{len(questions) + 1}",
                text=(
                    f"In your role as {exp.title}{f' at {exp.company}' if exp.company else ''}, "
                    "what was the most impactful technical feature you implemented, and what "
                    "challenges did you face?"
                ),
                type="project",
                focus_skill_or_project=exp.title,
                difficulty="easy",
                expected_key_points=[
                    "Context of the problem and engineering requirements",
                    "Technical solution design and delivery",
                    "Measurable impact or learnings",
                ],
                follow_up="How did you test and validate the feature before deploying it?",
                time_guide_seconds=180,
            )
        )
    else:
        top_skill = resume.skills[0] if resume.skills else "software engineering"
        questions.append(
            InterviewPlanQuestion(
                id=f"q{len(questions) + 1}",
                text=(
                    f"Could you walk me through a technical application you built using "
                    f"{top_skill}, including how you structured the code and managed state "
                    "or data?"
                ),
                type="project",
                focus_skill_or_project=top_skill,
                difficulty="easy",
                expected_key_points=[
                    f"Concrete design and structure using {top_skill}",
                    "Modularity, code organization, and testing",
                    "Overcoming implementation challenges",
                ],
                follow_up="What tools or profiling methods did you use to debug issues?",
                time_guide_seconds=180,
            )
        )

    # 3. Technical Questions on required skills the candidate claims or needs (1 to 2 questions)
    tech_skills = [s for s in job.skills_required if s] or ["backend engineering"]
    t1 = tech_skills[0]
    questions.append(
        InterviewPlanQuestion(
            id=f"q{len(questions) + 1}",
            text=(
                f"Let's dive into {t1}. When designing a production service with {t1}, "
                "how do you ensure scalability, robust error handling, and clean code separation?"
            ),
            type="technical",
            focus_skill_or_project=t1,
            difficulty="medium",
            expected_key_points=[
                f"Core concepts, idioms, and patterns of {t1}",
                "Concurrency, resource management, and clean architecture",
                "Automated testing and observability in production",
            ],
            follow_up=(
                f"Can you explain a subtle bug or performance bottleneck common in {t1} "
                "and how to prevent it?"
            ),
            time_guide_seconds=150,
        )
    )

    if len(tech_skills) > 1:
        t2 = tech_skills[1]
        questions.append(
            InterviewPlanQuestion(
                id=f"q{len(questions) + 1}",
                text=(
                    f"In systems utilizing {t2}, how do you approach database performance, "
                    "caching trade-offs, and maintaining data consistency under high "
                    "concurrent load?"
                ),
                type="technical",
                focus_skill_or_project=t2,
                difficulty="hard",
                expected_key_points=[
                    f"System design principles around {t2}",
                    "Trade-offs between consistency, availability, and latency",
                    "Caching strategies and database query optimization",
                ],
                follow_up=f"How do you monitor and alert on {t2} degradation in real time?",
                time_guide_seconds=180,
            )
        )

    # 4. Behavioural Question informed by candidate persona
    persona_text = ""
    if persona and persona.summary:
        persona_text = persona.summary.lower()

    if "lead" in persona_text or "initiative" in persona_text:
        beh_q = (
            "Tell me about a time when you stepped up to lead a project or resolve an ambiguous "
            "technical problem under tight deadlines. Please walk through the Situation, Task, "
            "your Actions, and the measurable Result."
        )
    elif "conflict" in persona_text or "collaborat" in persona_text:
        beh_q = (
            "Describe a situation where you had a strong technical disagreement with a team "
            "member or peer. How did you navigate the discussion, find common ground, "
            "and what was the outcome?"
        )
    else:
        beh_q = (
            "Tell me about a challenging roadblock you encountered in a team project where "
            "things didn't go as planned. Using the STAR method (Situation, Task, Action, "
            "Result), how did you handle it and what did you learn?"
        )

    questions.append(
        InterviewPlanQuestion(
            id=f"q{len(questions) + 1}",
            text=beh_q,
            type="behavioural",
            focus_skill_or_project="Teamwork & Problem Solving",
            difficulty="hard",
            expected_key_points=[
                "Explicit STAR structure: Situation, Task, Action, and measurable Result",
                "Self-awareness, accountability, and emotional maturity",
                "Constructive collaboration and learning mindset",
            ],
            follow_up=(
                "Looking back, what is one thing you would do differently in that situation?"
            ),
            time_guide_seconds=180,
        )
    )

    # 5. Optional Closing Question
    questions.append(
        InterviewPlanQuestion(
            id=f"q{len(questions) + 1}",
            text=(
                "We are wrapping up our technical discussion today. What questions do you have "
                "for us about our engineering culture, tech stack, or the problems the team "
                "is tackling?"
            ),
            type="closing",
            focus_skill_or_project=None,
            difficulty="easy",
            expected_key_points=[
                "Demonstrates thoughtful curiosity about the company/team",
                "Asks relevant questions regarding technical challenges or culture",
                "Professional closing demeanor",
            ],
            follow_up=None,
            time_guide_seconds=90,
        )
    )

    warmup_q = [q for q in questions if q.type == "warmup"]
    project_q = [q for q in questions if q.type == "project"]
    behavioural_q = [q for q in questions if q.type == "behavioural"]
    technical_q = [q for q in questions if q.type == "technical"]
    closing_q = [q for q in questions if q.type == "closing"]

    selected: list[InterviewPlanQuestion] = []
    # 1. Warmup (mandatory)
    if warmup_q:
        selected.append(warmup_q[0])

    # 2. Project deep dives (up to 2)
    selected.extend(project_q[:2])

    # 3. Technical (at least 1)
    if technical_q:
        selected.append(technical_q[0])

    # 4. Behavioural (mandatory)
    if behavioural_q:
        selected.append(behavioural_q[0])

    # 5. Add second technical if requested and available
    if len(selected) < num_questions and len(technical_q) > 1:
        selected.append(technical_q[1])

    # 6. Add closing if requested and available
    if len(selected) < num_questions and closing_q:
        selected.append(closing_q[0])

    # If still need more, add remaining questions
    for q in technical_q[2:] + project_q[2:]:
        if len(selected) >= num_questions:
            break
        selected.append(q)

    if len(selected) > num_questions:
        selected = selected[:num_questions]

    sorted_q = _sort_questions_easy_to_hard(selected)
    return InterviewPlan(
        job_id=job.id,
        role_title=job.title,
        company_name=job.company,
        questions=sorted_q,
    )


def _llm_generate_interview_plan(
    resume: ParsedResume,
    job: Job,
    persona: PersonaInput | None = None,
    num_questions: int = 5,
    duration_minutes: int = 15,
) -> InterviewPlan:
    persona_summary = "Not provided"
    if persona:
        parts = []
        if persona.summary:
            parts.append(persona.summary)
        if persona.strengths:
            parts.append("Strengths: " + ", ".join(persona.strengths))
        if persona.confidence:
            parts.append("Confidence: " + persona.confidence)
        if parts:
            persona_summary = "; ".join(parts)

    candidate_exp_str = (
        "; ".join(f"{e.title} at {e.company or 'N/A'}" for e in resume.experience)
        if resume.experience
        else "None"
    )

    prompt = INTERVIEW_PLAN_PROMPT.format(
        job_title=job.title,
        job_company=job.company,
        skills_required=", ".join(job.skills_required) if job.skills_required else "General",
        job_description=job.description or "General software engineering role",
        candidate_name=resume.name or "Candidate",
        candidate_summary=resume.summary or "Not provided",
        candidate_skills=", ".join(resume.skills) if resume.skills else "Not provided",
        candidate_projects=", ".join(resume.projects) if resume.projects else "None",
        candidate_experience=candidate_exp_str,
        persona_summary=persona_summary,
        num_questions=num_questions,
        duration_minutes=duration_minutes,
    )

    plan = complete_json(prompt, system=INTERVIEW_PLAN_SYSTEM, schema_model=InterviewPlan)
    if not isinstance(plan, InterviewPlan) or not plan.questions:
        raise ValueError("LLM returned empty or invalid InterviewPlan")

    # Safety check: Never ask about a project that is not in resume.projects!
    valid_projects = set(p.lower().strip() for p in resume.projects)
    for q in plan.questions:
        if q.type == "project" and resume.projects:
            matched = any(
                p in (q.focus_skill_or_project or "").lower() or p in q.text.lower()
                for p in valid_projects
            )
            if not matched:
                real_p = resume.projects[0]
                q.focus_skill_or_project = real_p
                q.text = (
                    f"In your resume, you listed '{real_p}'. Walk me through the architecture, "
                    "the key technical decisions, and your personal contribution."
                )

    ordered_q = _sort_questions_easy_to_hard(plan.questions)
    return InterviewPlan(
        job_id=job.id,
        role_title=job.title,
        company_name=job.company,
        questions=ordered_q[:num_questions],
    )


def generate_interview_plan(
    resume: ParsedResume,
    job: Job,
    persona: PersonaInput | None = None,
    num_questions: int = 5,
    duration_minutes: int = 15,
) -> InterviewPlan:
    try:
        return _llm_generate_interview_plan(
            resume, job, persona, num_questions=num_questions, duration_minutes=duration_minutes
        )
    except Exception as exc:
        logger.warning("LLM interview plan generation failed (%s); falling back to heuristic", exc)
        return _heuristic_interview_plan(
            resume, job, persona, num_questions=num_questions, duration_minutes=duration_minutes
        )


async def create_interview_session(
    resume: ParsedResume,
    job: Job,
    persona: PersonaInput | None = None,
    num_questions: int = 5,
    duration_minutes: int = 15,
    consent_recording: bool = False,
    consent_transcript: bool = True,
    consent_integrity: bool = False,
    tavus_client: httpx.AsyncClient | None = None,
) -> InterviewSessionResponse:
    init_db()

    # 1. Enforce single active session per candidate
    if resume.email:
        with SessionLocal() as db_session:
            active_sessions = (
                db_session.query(InterviewSessionModel)
                .filter(
                    InterviewSessionModel.candidate_email == resume.email,
                    InterviewSessionModel.status.in_(["created", "live"]),
                )
                .all()
            )
            for old in active_sessions:
                old.status = "ended"
                old.ended_at = _utcnow()
                if old.tavus_conversation_id:
                    try:
                        await end_tavus_conversation(old.tavus_conversation_id, client=tavus_client)
                    except Exception as exc:
                        logger.warning("Error ending prior Tavus conversation: %s", exc)
            db_session.commit()

    # 2. Pre-generate question plan
    plan = generate_interview_plan(
        resume=resume,
        job=job,
        persona=persona,
        num_questions=num_questions,
        duration_minutes=duration_minutes,
    )
    session_id = f"sess_{uuid.uuid4().hex[:12]}"
    webhook_token = secrets.token_urlsafe(32)

    # 3. Create live video conversation with Tavus (or mock when unset)
    candidate_display = resume.name or "there"
    tavus_res = await create_tavus_conversation(
        session_id=session_id,
        plan=plan,
        candidate_name=candidate_display,
        webhook_token=webhook_token,
        duration_minutes=duration_minutes,
        consent_recording=consent_recording,
        client=tavus_client,
    )
    tavus_conv_id = tavus_res.get("conversation_id")
    tavus_conv_url = tavus_res.get("conversation_url")

    # 4. Save session to DB
    with SessionLocal() as db_session:
        model = InterviewSessionModel(
            id=session_id,
            job_id=job.id,
            role_title=job.title,
            company_name=job.company,
            candidate_name=resume.name,
            candidate_email=resume.email,
            status="created",
            num_questions=num_questions,
            duration_minutes=duration_minutes,
            consent_recording=consent_recording,
            consent_transcript=consent_transcript,
            consent_integrity=consent_integrity,
            plan=plan.model_dump(),
            tavus_conversation_id=tavus_conv_id,
            tavus_conversation_url=tavus_conv_url,
            webhook_token=webhook_token,
        )
        db_session.add(model)
        db_session.commit()
        created_at_str = model.created_at.isoformat()

    # The hidden rubric and follow-ups are never sent to the browser!
    client_questions = [
        ClientQuestion(
            id=q.id,
            text=q.text,
            type=q.type,
            focus_skill_or_project=q.focus_skill_or_project,
            difficulty=q.difficulty,
            time_guide_seconds=q.time_guide_seconds,
        )
        for q in plan.questions
    ]

    return InterviewSessionResponse(
        session_id=session_id,
        job_id=job.id,
        role_title=job.title,
        company_name=job.company,
        status="created",
        num_questions=num_questions,
        duration_minutes=duration_minutes,
        questions=client_questions,
        conversation_url=tavus_conv_url,
        created_at=created_at_str,
        consent_recording=consent_recording,
        consent_transcript=consent_transcript,
        consent_integrity=consent_integrity,
        has_report=False,
    )


def get_interview_session(session_id: str) -> InterviewSessionResponse | None:
    init_db()
    with SessionLocal() as db_session:
        model = db_session.get(InterviewSessionModel, session_id)
        if model is None:
            return None
        raw_plan = model.plan or {}
        raw_questions = raw_plan.get("questions", [])
        client_questions = [
            ClientQuestion(
                id=q.get("id", f"q{idx}"),
                text=q.get("text", ""),
                type=q.get("type", "technical"),
                focus_skill_or_project=q.get("focus_skill_or_project"),
                difficulty=q.get("difficulty", "medium"),
                time_guide_seconds=q.get("time_guide_seconds", 120),
            )
            for idx, q in enumerate(raw_questions, start=1)
        ]
        return InterviewSessionResponse(
            session_id=model.id,
            job_id=model.job_id,
            role_title=model.role_title,
            company_name=model.company_name,
            status=model.status,
            num_questions=model.num_questions,
            duration_minutes=model.duration_minutes,
            questions=client_questions,
            conversation_url=model.tavus_conversation_url,
            created_at=model.created_at.isoformat() if model.created_at else "",
            consent_recording=model.consent_recording,
            consent_transcript=model.consent_transcript,
            consent_integrity=model.consent_integrity,
            has_report=bool(model.report),
        )


async def end_interview_session(
    session_id: str,
    reason: str | None = None,
    tavus_client: httpx.AsyncClient | None = None,
) -> InterviewSessionResponse:
    """End an ongoing interview session and signal Tavus to terminate the call."""
    init_db()
    tavus_conv_id = None
    with SessionLocal() as db_session:
        model = db_session.get(InterviewSessionModel, session_id)
        if model is None:
            raise ValueError(f"Session '{session_id}' not found.")

        if model.status not in ("ended", "processing", "report_ready", "failed"):
            model.status = "ended"
            model.ended_at = _utcnow()

        tavus_conv_id = model.tavus_conversation_id
        db_session.commit()

    if tavus_conv_id:
        try:
            await end_tavus_conversation(tavus_conv_id, client=tavus_client)
        except Exception as exc:
            logger.warning("Error ending Tavus conversation '%s': %s", tavus_conv_id, exc)

    res = get_interview_session(session_id)
    if res is None:
        raise ValueError(f"Session '{session_id}' not found.")
    return res


async def handle_tavus_webhook(
    payload: dict[str, Any],
    token: str | None = None,
    session_id: str | None = None,
) -> dict[str, Any]:
    """Process incoming Tavus webhook callbacks with per-session token authentication."""
    event_type = payload.get("event_type", "")
    conversation_id = payload.get("conversation_id", "")
    properties = payload.get("properties", {}) or {}

    init_db()
    with SessionLocal() as db_session:
        model = None
        if session_id:
            model = db_session.get(InterviewSessionModel, session_id)
        if model is None and conversation_id:
            model = (
                db_session.query(InterviewSessionModel)
                .filter(InterviewSessionModel.tavus_conversation_id == conversation_id)
                .first()
            )

        if model is None:
            logger.warning(
                "Webhook received for unknown session: conv=%s, session=%s",
                conversation_id,
                session_id,
            )
            return {"status": "ignored", "reason": "session_not_found"}

        # Token authentication
        if token and model.webhook_token:
            if not secrets.compare_digest(token, model.webhook_token):
                logger.warning("Invalid webhook token supplied for session '%s'", model.id)
                raise PermissionError("Invalid webhook authentication token.")

        # Idempotent event processing
        if event_type in ("system.pal_joined", "system.replica_joined"):
            if model.status == "created":
                model.status = "live"
                model.started_at = _utcnow()
                db_session.commit()
            return {"status": "processed", "event": event_type, "session_status": model.status}

        elif event_type == "system.shutdown":
            if model.status in ("created", "live"):
                model.status = "ended"
                model.ended_at = _utcnow()
                db_session.commit()
            return {"status": "processed", "event": event_type, "session_status": model.status}

        elif event_type == "application.transcription_ready":
            transcript = properties.get("transcript", [])
            model.transcript = transcript
            try:
                from app.services.interview.evaluate import generate_interview_report

                report = generate_interview_report(model)
                model.report = report.model_dump()
                model.status = "report_ready"
            except Exception as exc:
                logger.warning("Error generating report from transcription webhook: %s", exc)
                if model.status != "report_ready":
                    model.status = "processing"
            db_session.commit()
            return {
                "status": "processed",
                "event": event_type,
                "turns": len(transcript),
                "has_report": bool(model.report),
            }

        elif event_type == "application.recording_ready":
            rec_uri = properties.get("storage_uri") or properties.get("s3_key")
            if rec_uri:
                model.recording_url = str(rec_uri)
                db_session.commit()
            return {"status": "processed", "event": event_type}

        elif event_type == "application.perception_analysis":
            analysis = properties.get("analysis")
            if analysis:
                model.perception_analysis = {"analysis": analysis}
                db_session.commit()
            return {"status": "processed", "event": event_type}

        return {"status": "ignored", "event": event_type}


async def poll_and_sync_transcript(
    session_id: str,
    client: httpx.AsyncClient | None = None,
) -> bool:
    """Fallback: Poll Tavus verbose endpoint if transcript webhook is delayed."""
    init_db()
    with SessionLocal() as db_session:
        model = db_session.get(InterviewSessionModel, session_id)
        if model is None or not model.tavus_conversation_id:
            return False

        if model.transcript and len(model.transcript) > 0:
            return True

        verbose_data = await fetch_tavus_conversation_verbose(
            model.tavus_conversation_id, client=client
        )
        if not verbose_data:
            return False

        events = verbose_data.get("events", [])
        updated = False
        for ev in events:
            if ev.get("event_type") == "application.transcription_ready":
                props = ev.get("properties", {})
                transcript = props.get("transcript", [])
                if transcript:
                    model.transcript = transcript
                    try:
                        from app.services.interview.evaluate import generate_interview_report

                        report = generate_interview_report(model)
                        model.report = report.model_dump()
                        model.status = "report_ready"
                    except Exception as exc:
                        logger.warning("Error generating report during sync: %s", exc)
                        if model.status != "report_ready":
                            model.status = "processing"
                    updated = True

            if ev.get("event_type") == "application.perception_analysis":
                props = ev.get("properties", {})
                if props.get("analysis"):
                    model.perception_analysis = {"analysis": props.get("analysis")}
                    updated = True

        if updated:
            db_session.commit()
            return True

    return False


def record_integrity_events(session_id: str, events: list[dict[str, Any]]) -> dict[str, Any]:
    """Store client-side integrity monitoring flags (if consented)."""
    init_db()
    with SessionLocal() as db_session:
        model = db_session.get(InterviewSessionModel, session_id)
        if model is None:
            raise ValueError(f"Session '{session_id}' not found.")

        if not model.consent_integrity:
            return {"recorded": 0, "message": "Integrity monitoring not consented."}

        current_log = list(model.integrity_log or [])
        current_log.extend(events)
        model.integrity_log = current_log
        db_session.commit()
        return {"recorded": len(events), "total": len(current_log)}


def get_or_generate_report(session_id: str) -> Any:
    """Retrieves an existing InterviewReport, or generates it on-demand if not yet produced."""
    from app.schemas import InterviewReport
    from app.services.interview.evaluate import generate_interview_report

    init_db()
    with SessionLocal() as db_session:
        model = db_session.get(InterviewSessionModel, session_id)
        if model is None:
            raise ValueError(f"Session '{session_id}' not found.")

        if model.report:
            return InterviewReport.model_validate(model.report)

        report = generate_interview_report(model)
        model.report = report.model_dump()
        model.status = "report_ready"
        db_session.commit()
        return report


def delete_session_data(session_id: str) -> dict[str, Any]:
    """Permanently deletes candidate interview data for GDPR/privacy compliance."""
    from app.services.interview.evaluate import delete_interview_session_data

    return delete_interview_session_data(session_id)
