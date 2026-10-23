"""Tests for core/taxonomy.py: extraction, synonyms, canonicalization, and order preservation."""

from app.core.taxonomy import (
    SKILLS,
    canonical_skill,
    extract_skills,
    normalize_skill,
)


def test_extract_skills_canonical():
    text = "Proficient in Python, SQL, and Docker."
    skills = extract_skills(text)
    assert skills == ["Python", "SQL", "Docker"]


def test_extract_skills_synonyms():
    text = "Experience with JS, Node, and ML models using TF and sklearn."
    skills = extract_skills(text)
    expected = ["JavaScript", "Node.js", "Machine Learning", "TensorFlow", "Scikit-learn"]
    assert all(s in skills for s in expected)
    # Ensure taxonomy order
    expected_order = [s for s in SKILLS if s in expected]
    assert [s for s in skills if s in expected] == expected_order


def test_extract_skills_does_not_duplicate_when_synonym_and_canonical_both_present():
    text = "Full stack developer using JavaScript and JS, Node.js and Node."
    skills = extract_skills(text)
    assert skills.count("JavaScript") == 1
    assert skills.count("Node.js") == 1


def test_extract_skills_boundary_and_case_insensitivity():
    text = "Built a json parser, tested in html, implemented ML on AWS."
    skills = extract_skills(text)
    # 'json' should NOT match 'JS'
    assert "JavaScript" not in skills
    # 'html' should match 'HTML' case-insensitively
    assert "HTML" in skills
    # 'ML' should match 'Machine Learning'
    assert "Machine Learning" in skills
    assert "AWS" in skills


def test_extract_skills_dsa_and_oops():
    text = "Strong in DSA, OOPS, and System Design."
    skills = extract_skills(text)
    assert "Data Structures" in skills
    assert "OOP" in skills
    assert "System Design" in skills


def test_extract_skills_c_family_boundaries():
    text = "Fluent in C++ and C# development."
    skills = extract_skills(text)
    assert "C++" in skills
    assert "C#" in skills
    assert "C" not in skills


def test_canonical_skill():
    assert canonical_skill("js") == "JavaScript"
    assert canonical_skill("JS") == "JavaScript"
    assert canonical_skill("JavaScript") == "JavaScript"
    assert canonical_skill("ML") == "Machine Learning"
    assert canonical_skill("node") == "Node.js"
    assert canonical_skill("postgres") == "PostgreSQL"
    assert canonical_skill("k8s") == "Kubernetes"
    assert canonical_skill("unknown_skill_xyz") is None
    assert canonical_skill("") is None


def test_normalize_skill():
    assert normalize_skill("js") == "JavaScript"
    assert normalize_skill("Node") == "Node.js"
    assert normalize_skill("Python") == "Python"
    assert normalize_skill("Unknown Tech") == "Unknown Tech"
