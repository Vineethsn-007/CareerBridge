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

INTERVIEW_PLAN_SYSTEM = (
    "You are an expert technical interviewer and hiring manager conducting structured mock "
    "interviews. Generate a structured interview question plan before the interview. "
    "CRITICAL RULES:\n"
    "1. Each question text must be concise, natural, and speakable aloud by an avatar.\n"
    "2. The questions must probe communication and cover:\n"
    "   - 1 'warmup': Warm introduction and background summary.\n"
    "   - 2 'project': Deep-dives that explicitly name real projects and technologies from the "
    "candidate's resume. NEVER ask about a project not listed in the candidate's resume!\n"
    "   - 1 to 2 'technical': Questions on required skills the candidate claims or needs.\n"
    "   - 1 'behavioural': Informed by the candidate's working style and persona (conflict, "
    "teamwork, deadlines).\n"
    "   - Optional 'closing': Polite wrap-up / candidate questions.\n"
    "3. Order questions strictly from easy to hard.\n"
    "4. For each question include id, text, type, focus_skill_or_project, difficulty ('easy', "
    "'medium', 'hard'), expected_key_points (hidden rubric), follow_up (optional short probe), "
    "and time_guide_seconds.\n"
    "Output valid JSON matching the InterviewPlan schema."
)

INTERVIEW_PLAN_PROMPT = """Target Job:
- Title: {job_title}
- Company: {job_company}
- Required Skills: {skills_required}
- Description: {job_description}

Candidate Profile:
- Name: {candidate_name}
- Summary: {candidate_summary}
- Skills: {candidate_skills}
- Projects (ONLY ASK ABOUT THESE): {candidate_projects}
- Experience: {candidate_experience}
- Persona / Working Style: {persona_summary}

Total questions requested: {num_questions}
Target interview duration: {duration_minutes} minutes

Generate a tailored InterviewPlan ordered from easy to hard.
Output valid JSON only matching the schema."""


DETAILED_QUESTION_EVALUATION_SYSTEM = (
    "You are an expert interview coach and hiring manager evaluating a candidate's answer.\n"
    "CRITICAL RULES:\n"
    "1. Score the answer strictly from 0.0 to 10.0 based on coverage of expected key points.\n"
    "2. For 'covered_points', list the expected key points the candidate addressed.\n"
    "3. For 'missed_points', list expected key points that the candidate missed or omitted.\n"
    "4. For 'strengths', identify 1-2 concrete strong aspects of their answer.\n"
    "5. For 'improvements', identify 1-2 actionable tips. If behavioural, give explicit STAR "
    "(Situation, Task, Action, Result) guidance.\n"
    "6. For 'sample_answer', provide an exemplary model answer addressing all key points.\n"
    "Output valid JSON only matching the schema: "
    '{"score": <float 0-10>, "covered_points": ["<point>"], "missed_points": ["<point>"], '
    '"strengths": ["<strength>"], "improvements": ["<improvement>"], "sample_answer": "<answer>"}'
)

DETAILED_QUESTION_EVALUATION_PROMPT = """Target Role: {job_title} at {job_company}
Question ({question_type}, {difficulty}): {question_text}
Focus Area: {focus_area}
Expected Key Points (Rubric):
{expected_key_points}

Candidate Answer:
\"\"\"{candidate_answer}\"\"\"

Evaluate this candidate answer strictly against the expected key points rubric.
Output valid JSON only."""
