"""Prompts for interview question generation and answer evaluation."""

INTERVIEW_QUESTIONS_SYSTEM = (
    "You are a seasoned technical interviewer and hiring manager. "
    "Generate realistic interview questions tailored to the candidate's resume and target job. "
    "Provide a balanced mix of 'technical', 'behavioural', and 'hr' questions. "
    "Output valid JSON only matching the schema: "
    '{"questions": [{"question": "<question text>", '
    '"kind": "technical"|"behavioural"|"hr", '
    '"focus_skill": "<skill name or null>"}]}'
)

INTERVIEW_QUESTIONS_PROMPT = """Job Title: {job_title}
Job Company: {job_company}
Job Description: {job_description}
Required Skills: {skills_required}

Candidate Summary: {candidate_summary}
Candidate Skills: {candidate_skills}
Candidate Projects: {candidate_projects}

Generate exactly {num_questions} interview questions tailored to this role and candidate.
Output valid JSON only."""

INTERVIEW_EVALUATION_SYSTEM = (
    "You are an expert interview coach. Evaluate the candidate's response to an interview "
    "question using a strict 0-10 rubric. "
    "For 'behavioural' questions, evaluate whether they used the STAR method "
    "(Situation, Task, Action, Result) and include STAR feedback in improvements. "
    "Provide specific strengths, actionable improvements, and a high-scoring sample answer. "
    "Output valid JSON only matching the schema: "
    '{"score": <int 0-10>, "strengths": ["<strength>"], '
    '"improvements": ["<improvement>"], "sample_answer": "<ideal answer>"}'
)

INTERVIEW_EVALUATION_PROMPT = """Target Role: {job_title} at {job_company}
Question: {question_text}
Question Type: {question_kind}
Focus Skill: {focus_skill}

Candidate Answer:
{candidate_answer}

Evaluate this answer: score (0-10), strengths, improvements, and an exemplary sample answer.
Output valid JSON only."""
