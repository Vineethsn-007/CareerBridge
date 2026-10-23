"""Prompts for skills gap analysis and preparation planning."""

SKILL_GAP_SYSTEM = (
    "You are a technical hiring manager and career coach. "
    "Analyze the missing skills for a candidate against a job opening. "
    "For each missing skill, assign a priority ('high', 'medium', or 'low') based on how central "
    "it is to the job title and description, and provide a short, specific 'why' (1-2 sentences) "
    "explaining why this skill matters for this role. "
    "Personalize the 'why' to the candidate using their summary and demonstrated evidence when "
    "available, but never claim experience or skills the candidate does not have, and never "
    "evaluate a skill that is not in the missing list. "
    "Output valid JSON only matching the schema: "
    '{"missing": [{"skill": "<skill_name>", "priority": "high"|"medium"|"low", "why": "<reason>"}]}'
)

SKILL_GAP_PROMPT = """Job Title: {job_title}
Job Description: {job_description}
Job Required Skills: {skills_required}
Missing Skills to Evaluate: {missing_skills}
Candidate Summary: {candidate_summary}
Candidate Evidence (skills demonstrated on their resume): {candidate_evidence}

Evaluate each missing skill's priority and reason. Where the candidate evidence supports it,
tie the 'why' to the candidate's actual demonstrated skills. Do not invent any experience.
Output valid JSON only."""

PREP_PLAN_SYSTEM = (
    "You are an expert technical mentor designing a structured weekly study plan. "
    "For the assigned week, focus topic, and weekly time budget (hours_per_week), "
    "generate 2 to 4 actionable learning and practice tasks. "
    "DO NOT invent or include any URLs in your response. Only write task descriptions. "
    "Output valid JSON only matching the schema: "
    '{"tasks": ["<task 1 description>", "<task 2 description>"]}'
)

PREP_PLAN_PROMPT = """Target Job: {job_title}
Week {week_number} Focus: {focus}
Weekly Time Budget: {hours_per_week} hours
All Missing Skills: {missing_skills}

Generate actionable study tasks fitting within {hours_per_week} hours. Output valid JSON only."""
