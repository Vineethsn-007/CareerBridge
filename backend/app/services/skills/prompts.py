"""Prompts for skills gap analysis and preparation planning."""

SKILL_GAP_SYSTEM = (
    "You are a technical hiring manager and career coach. "
    "Analyze the missing skills for a candidate against a job opening. "
    "For each missing skill, assign a priority ('high', 'medium', or 'low') based on how central "
    "it is to the job title and description, and provide a short, specific 'why' (1-2 sentences) "
    "explaining why this skill matters for this role. "
    "Output valid JSON only matching the schema: "
    '{"missing": [{"skill": "<skill_name>", "priority": "high"|"medium"|"low", "why": "<reason>"}]}'
)

SKILL_GAP_PROMPT = """Job Title: {job_title}
Job Description: {job_description}
Job Required Skills: {skills_required}
Missing Skills to Evaluate: {missing_skills}

Evaluate each missing skill's priority and reason. Output valid JSON only."""
