"""Canonical skill list + simple extractor.

Owner: lead creates it, Teammate C expands it (synonyms, categories, weights).
"""

import re

SKILLS: list[str] = [
    "Python",
    "Java",
    "JavaScript",
    "TypeScript",
    "C",
    "C++",
    "C#",
    "Go",
    "Rust",
    "Kotlin",
    "Swift",
    "PHP",
    "Ruby",
    "R",
    "SQL",
    "MySQL",
    "PostgreSQL",
    "MongoDB",
    "Redis",
    "HTML",
    "CSS",
    "React",
    "Next.js",
    "Angular",
    "Vue",
    "Node.js",
    "Express",
    "Django",
    "Flask",
    "FastAPI",
    "Spring Boot",
    "Tailwind CSS",
    "REST API",
    "GraphQL",
    "Git",
    "GitHub",
    "Docker",
    "Kubernetes",
    "Linux",
    "AWS",
    "Azure",
    "GCP",
    "CI/CD",
    "Machine Learning",
    "Deep Learning",
    "NLP",
    "Computer Vision",
    "PyTorch",
    "TensorFlow",
    "Scikit-learn",
    "Pandas",
    "NumPy",
    "Data Analysis",
    "Power BI",
    "Tableau",
    "Excel",
    "Data Structures",
    "Algorithms",
    "OOP",
    "System Design",
    "Agile",
    "Testing",
    "Cybersecurity",
    "Networking",
    "IoT",
    "Embedded Systems",
    "Blockchain",
    "Solidity",
    "Communication",
    "Teamwork",
    "Problem Solving",
    "Leadership",
]


def _pattern(skill: str) -> re.Pattern[str]:
    return re.compile(rf"(?<![\w+#.]){re.escape(skill)}(?![\w+#])", re.IGNORECASE)


_PATTERNS = {skill: _pattern(skill) for skill in SKILLS}


def extract_skills(text: str) -> list[str]:
    """Return canonical skills mentioned in `text`, in taxonomy order."""
    return [skill for skill, pat in _PATTERNS.items() if pat.search(text)]
