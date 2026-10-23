"""Interview practice (owner: Teammate C).

Generates technical, behavioural, and HR questions tailored to the resume and job,
and evaluates candidate answers using a rubric-based scoring model with STAR guidance.
"""

from app.core.llm import complete_json
from app.schemas import AnswerFeedback, InterviewQuestion, Job, ParsedResume
from app.services.interview.prompts import (
    INTERVIEW_EVALUATION_PROMPT,
    INTERVIEW_EVALUATION_SYSTEM,
    INTERVIEW_QUESTIONS_PROMPT,
    INTERVIEW_QUESTIONS_SYSTEM,
)

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
