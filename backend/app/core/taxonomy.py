"""Canonical skill list + simple extractor.

Owner: lead creates it, Teammate C expands it (synonyms, categories, weights).
"""

import re

SKILLS: list[str] = [
    # Languages & Runtimes
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
    "Dart",
    "Scala",
    "Bash",
    # Web & Frameworks
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
    "Bootstrap",
    "Redux",
    "REST API",
    "GraphQL",
    # Mobile
    "Flutter",
    "React Native",
    "Android",
    # Databases & Storage
    "SQL",
    "MySQL",
    "PostgreSQL",
    "MongoDB",
    "Redis",
    "SQLite",
    "Firebase",
    # Cloud & DevOps
    "Git",
    "GitHub",
    "Docker",
    "Kubernetes",
    "Linux",
    "AWS",
    "Azure",
    "GCP",
    "CI/CD",
    "Terraform",
    "Jenkins",
    "Nginx",
    # AI / ML & Data Science
    "Machine Learning",
    "Deep Learning",
    "NLP",
    "Computer Vision",
    "Generative AI",
    "LLMs",
    "PyTorch",
    "TensorFlow",
    "Scikit-learn",
    "Pandas",
    "NumPy",
    "Data Analysis",
    "Power BI",
    "Tableau",
    "Excel",
    "PySpark",
    "OpenCV",
    # Core Computer Science & QA
    "Data Structures",
    "Algorithms",
    "OOP",
    "System Design",
    "Agile",
    "Testing",
    "Pytest",
    "Selenium",
    "Jest",
    "Cybersecurity",
    "Networking",
    "IoT",
    "Embedded Systems",
    "Blockchain",
    "Solidity",
    # Professional & Soft Skills
    "Communication",
    "Teamwork",
    "Problem Solving",
    "Leadership",
]

SYNONYMS: dict[str, str] = {
    # Programming Languages & Runtimes
    "js": "JavaScript",
    "ts": "TypeScript",
    "golang": "Go",
    "node": "Node.js",
    "nodejs": "Node.js",
    "node js": "Node.js",
    "shell": "Bash",
    "shell scripting": "Bash",
    # Web
    "reactjs": "React",
    "react.js": "React",
    "nextjs": "Next.js",
    "next.js": "Next.js",
    "vuejs": "Vue",
    "vue.js": "Vue",
    "angularjs": "Angular",
    "angular.js": "Angular",
    "tailwind": "Tailwind CSS",
    "rest": "REST API",
    "restful": "REST API",
    "rest apis": "REST API",
    "restful api": "REST API",
    "restful apis": "REST API",
    # Databases
    "postgres": "PostgreSQL",
    "psql": "PostgreSQL",
    "mongo": "MongoDB",
    # Cloud & DevOps
    "k8s": "Kubernetes",
    "amazon web services": "AWS",
    "google cloud": "GCP",
    "google cloud platform": "GCP",
    "microsoft azure": "Azure",
    "cicd": "CI/CD",
    "ci-cd": "CI/CD",
    "continuous integration": "CI/CD",
    # AI / ML / Data
    "ml": "Machine Learning",
    "ai": "Machine Learning",
    "artificial intelligence": "Machine Learning",
    "dl": "Deep Learning",
    "genai": "Generative AI",
    "gen ai": "Generative AI",
    "llm": "LLMs",
    "large language models": "LLMs",
    "large language model": "LLMs",
    "sklearn": "Scikit-learn",
    "scikit learn": "Scikit-learn",
    "tf": "TensorFlow",
    "powerbi": "Power BI",
    # Core CS & QA
    "dsa": "Data Structures",
    "data structures and algorithms": "Data Structures",
    "data structures & algorithms": "Data Structures",
    "oops": "OOP",
    "object oriented programming": "OOP",
    "object-oriented programming": "OOP",
    "unit testing": "Testing",
    "software testing": "Testing",
}


def _build_skill_pattern(skill: str, aliases: list[str]) -> re.Pattern[str]:
    variants = [skill, *aliases]
    # Match longest variants first to avoid partial substring matching
    sorted_variants = sorted(variants, key=len, reverse=True)
    joined = "|".join(re.escape(v) for v in sorted_variants)
    return re.compile(rf"(?<![\w+#.]){joined}(?![\w+#])", re.IGNORECASE)


# Map aliases to their canonical skill targets
_ALIASES_BY_SKILL: dict[str, list[str]] = {skill: [] for skill in SKILLS}
for _alias, _target in SYNONYMS.items():
    if _target in _ALIASES_BY_SKILL:
        _ALIASES_BY_SKILL[_target].append(_alias)

_SKILL_PATTERNS = {
    skill: _build_skill_pattern(skill, _ALIASES_BY_SKILL.get(skill, [])) for skill in SKILLS
}
_PATTERNS = _SKILL_PATTERNS

# Fast canonical lookup mapping lowercase variant -> canonical skill
_CANONICAL_LOOKUP: dict[str, str] = {s.lower(): s for s in SKILLS}
for _alias, _target in SYNONYMS.items():
    _CANONICAL_LOOKUP[_alias.lower()] = _target


def canonical_skill(name: str) -> str | None:
    """Return the canonical skill name for a skill or synonym, or None if unknown."""
    if not name:
        return None
    return _CANONICAL_LOOKUP.get(name.strip().lower())


def normalize_skill(name: str) -> str:
    """Return canonical skill name if recognized; otherwise return original stripped name."""
    canon = canonical_skill(name)
    return canon if canon is not None else name.strip()


def extract_skills(text: str) -> list[str]:
    """Return canonical skills mentioned in `text`, in taxonomy order."""
    return [skill for skill, pat in _SKILL_PATTERNS.items() if pat.search(text)]
