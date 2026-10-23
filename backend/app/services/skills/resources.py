"""Hand-curated map of verified free learning resources per skill.

URLs here are strictly verified official docs, NPTEL courses, or freeCodeCamp courses.
When a skill lacks a guaranteed permanent URL, url is left None.
"""

from app.core.taxonomy import canonical_skill
from app.schemas import Resource

CURATED_RESOURCES: dict[str, list[Resource]] = {
    "python": [
        Resource(
            title="Official Python Tutorial",
            url="https://docs.python.org/3/tutorial/",
            kind="docs",
        ),
        Resource(
            title="freeCodeCamp Scientific Computing with Python",
            url="https://www.freecodecamp.org/learn/scientific-computing-with-python/",
            kind="course",
        ),
    ],
    "javascript": [
        Resource(
            title="MDN Web Docs: JavaScript",
            url="https://developer.mozilla.org/en-US/docs/Web/JavaScript",
            kind="docs",
        ),
        Resource(
            title="freeCodeCamp JavaScript Algorithms and Data Structures",
            url="https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures-v8/",
            kind="course",
        ),
    ],
    "typescript": [
        Resource(
            title="TypeScript Official Handbook",
            url="https://www.typescriptlang.org/docs/handbook/intro.html",
            kind="docs",
        ),
    ],
    "react": [
        Resource(
            title="React Official Documentation",
            url="https://react.dev/",
            kind="docs",
        ),
        Resource(
            title="freeCodeCamp Front End Development Libraries",
            url="https://www.freecodecamp.org/learn/front-end-development-libraries/",
            kind="course",
        ),
    ],
    "next.js": [
        Resource(
            title="Next.js Official Documentation",
            url="https://nextjs.org/docs",
            kind="docs",
        ),
    ],
    "node.js": [
        Resource(
            title="Node.js Official Documentation",
            url="https://nodejs.org/en/docs",
            kind="docs",
        ),
    ],
    "fastapi": [
        Resource(
            title="FastAPI Official Tutorial",
            url="https://fastapi.tiangolo.com/tutorial/",
            kind="docs",
        ),
    ],
    "django": [
        Resource(
            title="Django Official Getting Started Tutorial",
            url="https://docs.djangoproject.com/en/stable/intro/tutorial01/",
            kind="docs",
        ),
    ],
    "sql": [
        Resource(
            title="PostgreSQL Official Documentation",
            url="https://www.postgresql.org/docs/",
            kind="docs",
        ),
        Resource(
            title="SQLZoo Interactive SQL Practice",
            url="https://sqlzoo.net/",
            kind="practice",
        ),
    ],
    "postgresql": [
        Resource(
            title="PostgreSQL Documentation",
            url="https://www.postgresql.org/docs/",
            kind="docs",
        ),
    ],
    "mongodb": [
        Resource(
            title="MongoDB University Free Courses",
            url="https://learn.mongodb.com/",
            kind="course",
        ),
    ],
    "redis": [
        Resource(
            title="Redis Official Documentation",
            url="https://redis.io/docs/",
            kind="docs",
        ),
    ],
    "git": [
        Resource(
            title="Pro Git Book (Free Online)",
            url="https://git-scm.com/book/en/v2",
            kind="docs",
        ),
    ],
    "docker": [
        Resource(
            title="Docker Official Getting Started Guide",
            url="https://docs.docker.com/get-started/",
            kind="docs",
        ),
    ],
    "kubernetes": [
        Resource(
            title="Kubernetes Basics Tutorials",
            url="https://kubernetes.io/docs/tutorials/kubernetes-basics/",
            kind="docs",
        ),
    ],
    "linux": [
        Resource(
            title="Linux Journey Tutorial",
            url="https://linuxjourney.com/",
            kind="course",
        ),
    ],
    "machine learning": [
        Resource(
            title="Google Machine Learning Crash Course",
            url="https://developers.google.com/machine-learning/crash-course",
            kind="course",
        ),
        Resource(
            title="Scikit-learn User Guide",
            url="https://scikit-learn.org/stable/user_guide.html",
            kind="docs",
        ),
    ],
    "deep learning": [
        Resource(
            title="PyTorch Official Tutorials",
            url="https://pytorch.org/tutorials/",
            kind="docs",
        ),
    ],
    "data structures": [
        Resource(
            title="NPTEL: Programming, Data Structures and Algorithms",
            url="https://nptel.ac.in/courses/106106145",
            kind="course",
        ),
        Resource(
            title="NeetCode Practice Roadmap",
            url="https://neetcode.io/practice",
            kind="practice",
        ),
    ],
    "algorithms": [
        Resource(
            title="NPTEL: Design and Analysis of Algorithms",
            url="https://nptel.ac.in/courses/106106131",
            kind="course",
        ),
    ],
    "html": [
        Resource(
            title="MDN Web Docs: HTML",
            url="https://developer.mozilla.org/en-US/docs/Web/HTML",
            kind="docs",
        ),
    ],
    "css": [
        Resource(
            title="MDN Web Docs: CSS",
            url="https://developer.mozilla.org/en-US/docs/Web/CSS",
            kind="docs",
        ),
    ],
    "tailwind css": [
        Resource(
            title="Tailwind CSS Official Documentation",
            url="https://tailwindcss.com/docs",
            kind="docs",
        ),
    ],
}


def get_resources_for_skill(skill: str) -> list[Resource]:
    """Return hand-curated resources for a skill, using canonical taxonomy lookup."""
    canon = canonical_skill(skill) or skill
    key = canon.strip().lower()
    if key in CURATED_RESOURCES:
        return [r.model_copy() for r in CURATED_RESOURCES[key]]
    return [Resource(title=f"Official {canon} Documentation", url=None, kind="docs")]


def get_resources_for_skills(skills: list[str]) -> list[Resource]:
    """Return combined unique curated resources for a list of skills."""
    seen_titles: set[str] = set()
    resources: list[Resource] = []
    for s in skills:
        for r in get_resources_for_skill(s):
            if r.title not in seen_titles:
                seen_titles.add(r.title)
                resources.append(r)
    return resources
