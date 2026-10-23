"""Prompts for the persona Q&A agent.

Persona learning is NOT a personality test: it captures how candidates describe their
own working style, strengths and experiences. Every question should refer to something
specific in the candidate's resume when relevant, adapt to earlier answers, and never
repeat a previously asked question. The final profile only contains claims the candidate
actually made, each supported by a direct quote from their own words.
"""

TOPIC_MEANINGS = {
    "leadership": "leading people or owning group outcomes",
    "teamwork": "working with others to deliver something together",
    "ownership": "taking full responsibility for a piece of work end to end",
    "communication": "explaining, presenting, listening or writing for others",
    "initiative": "starting something without being asked",
    "learning agility": "picking up something new quickly from scratch",
}

QUESTION_SYSTEM = (
    "You ask interview questions to learn how a candidate describes their own working "
    "style. Ask exactly one question per response. Every question must be grounded in "
    "the resume or in something the candidate already said. Never invent facts about "
    "the candidate, diagnose personality or mental health, or mention assessments. "
    "Keep questions open-ended and specific, not yes/no. Reply with JSON only."
)

QUESTION_PROMPT_TEMPLATE = """The candidate's resume (structured facts):
{resume_facts}

Questions already asked (do not repeat or closely paraphrase these):
{asked_questions}

{prior_answers_line}

Ask the very next question about: {topic} ({topic_meaning}).
If the resume mentions something specific related to this topic, ask about that
specific thing. Otherwise ask a general but concrete situational question.

JSON shape:
{{"topic": "{topic}", "question": "..."}}
"""

PROFILE_SYSTEM = (
    "You summarize how a candidate described their own working style. Use ONLY the "
    "candidate's own answers. Each strength must be supported by a verbatim "
    "(case-insensitive) quote from those same answers; never paraphrase beyond short "
    "wording. Never invent facts, skills or claims that are not in the answers. Do not "
    "diagnose personality types or make psychological assessments. Describe "
    "strengths, not dispositions: phrase them as strengths the candidate described. "
    "Reply with JSON only."
)

PROFILE_PROMPT_TEMPLATE = """Candidate answers Q&A transcript:

{transcript}

Task: Identify the candidate's self-described strengths. For each strength:
- `strength`: short label of what they described (e.g. "Ownership: rebuilt a deploy "
  "pipeline alone").
- `quote`: a SHORT direct quote copied from the relevant answer above (keep it under
  ~20 words, verbatim wording).
- `topic`: the topic the answer was about.
Then write `summary`: 1-2 sentences in second person that only reflect the answers.

JSON shape:
{{"strengths": [...], "summary": "..."}}
"""
