"""Interview practice (owner: Teammate C).

Baseline: templated questions + length/keyword heuristic scoring.
TODO: LLM question generation tailored to resume + job, rubric-based evaluation
returning JSON validated by AnswerFeedback, follow-up questions.
"""

from app.schemas import AnswerFeedback, InterviewQuestion, Job, ParsedResume

BEHAVIOURAL = [
    "Tell me about a project you are proud of and what your role was.",
    "Describe a time you had to learn something quickly.",
    "Tell me about a disagreement in a team and how you handled it.",
]


def generate_questions(resume: ParsedResume, job: Job, n: int) -> list[InterviewQuestion]:
    questions: list[InterviewQuestion] = []
    for skill in job.skills_required:
        questions.append(
            InterviewQuestion(
                id=f"q{len(questions) + 1}",
                question=f"Explain {skill} and describe where you have used it.",
                kind="technical",
                focus_skill=skill,
            )
        )
    for text in BEHAVIOURAL:
        questions.append(
            InterviewQuestion(id=f"q{len(questions) + 1}", question=text, kind="behavioural")
        )
    return questions[:n]


def evaluate_answer(job: Job, question: InterviewQuestion, answer: str) -> AnswerFeedback:
    words = answer.split()
    score = min(10, len(words) // 8)
    strengths: list[str] = []
    improvements: list[str] = []
    if len(words) >= 40:
        strengths.append("Your answer has enough detail to follow.")
    else:
        improvements.append("Add more detail: what you did, how, and the result.")
    skill = question.focus_skill
    if skill and skill.lower() in answer.lower():
        strengths.append(f"You addressed {skill} directly.")
    elif skill:
        improvements.append(f"Mention {skill} explicitly and give a concrete example.")
    return AnswerFeedback(score=score, strengths=strengths, improvements=improvements)
