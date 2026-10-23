"""Human-labelled ranking sanity tests for job matching (Teammate B).

Validates relative ranking relationships across diverse technical domains to catch
matching regressions. Uses explicit domain assertions rather than brittle exact score values.
"""

from __future__ import annotations

from app.schemas import Experience, Job, MatchRequest, ParsedResume
from app.services.matching.service import match_jobs, score_job


def _make_candidate(
    name: str,
    skills: list[str],
    summary: str = "",
    projects: list[str] | None = None,
    experience: list[Experience] | None = None,
) -> ParsedResume:
    return ParsedResume(
        name=name,
        skills=skills,
        summary=summary,
        projects=projects or [],
        experience=experience or [],
        raw_text=f"{summary} {' '.join(skills)}",
    )


def _make_listing(
    job_id: str,
    title: str,
    skills: list[str],
    description: str,
    experience_level: str = "fresher",
    job_type: str = "full-time",
) -> Job:
    return Job(
        id=job_id,
        title=title,
        company="Sanity Test Corp",
        location="Bengaluru",
        job_type=job_type,
        experience_level=experience_level,
        skills_required=skills,
        description=description,
        source_url=f"https://example-test.org/jobs/{job_id}",
        verified=False,
        last_verified=None,
    )


# ---------------- Domain 1: Web Development vs. Tech Support ----------------


def test_ranking_frontend_resume_prefers_web_role_over_support():
    """A React frontend resume should rank a web UI developer role above technical support."""
    resume_frontend = _make_candidate(
        name="Aarav Sharma",
        skills=["JavaScript", "TypeScript", "React", "HTML", "CSS", "Next.js"],
        summary="Frontend developer crafting responsive user interfaces with modern React.",
        projects=["E-commerce web store in Next.js", "Component library with Tailwind CSS"],
    )

    job_web = _make_listing(
        job_id="sanity-web-01",
        title="Junior React Frontend Developer",
        skills=["JavaScript", "React", "HTML", "CSS", "Git"],
        description="Design and build interactive single-page web applications with React.",
    )
    job_support = _make_listing(
        job_id="sanity-sup-01",
        title="Technical Support Associate",
        skills=["Networking", "Linux", "Communication", "Problem Solving", "Teamwork"],
        description="Provide hardware diagnostics and customer helpdesk assistance.",
    )

    match_web = score_job(resume_frontend, job_web)
    match_sup = score_job(resume_frontend, job_support)

    assert match_web.score > match_sup.score
    assert len(match_web.matched_skills) >= 4
    assert len(match_sup.matched_skills) == 0


# ---------------- Domain 2: Data Analytics vs. Embedded Firmware ----------------


def test_ranking_data_analytics_prefers_data_engineer_over_embedded():
    """A Python/SQL data resume ranks a data analytics role over embedded C/firmware."""
    resume_data = _make_candidate(
        name="Pooja Patel",
        skills=["SQL", "Python", "Pandas", "Power BI", "Data Analysis", "Excel"],
        summary="Data analyst specializing in relational databases and executive dashboards.",
        projects=[
            "Sales telemetry pipeline in Python and PostgreSQL",
            "Power BI business intelligence dashboard",
        ],
    )

    job_data = _make_listing(
        job_id="sanity-data-01",
        title="Data Analyst Trainee",
        skills=["SQL", "Python", "Data Analysis", "Excel", "Power BI"],
        description="Query transactional databases and create analytical dashboards.",
    )
    job_embedded = _make_listing(
        job_id="sanity-iot-01",
        title="Embedded Firmware Trainee",
        skills=["C", "Embedded Systems", "Linux", "IoT", "Git"],
        description="Develop low-level C firmware for sensor microcontrollers and edge devices.",
    )

    match_data = score_job(resume_data, job_data)
    match_iot = score_job(resume_data, job_embedded)

    assert match_data.score > match_iot.score
    assert len(match_data.matched_skills) >= 4
    assert len(match_iot.matched_skills) == 0


# ---------------- Domain 3: Embedded Systems vs. Analytics ----------------


def test_ranking_embedded_developer_prefers_iot_firmware_over_analytics():
    """An embedded C/C++ resume ranks an IoT device driver role above data analytics."""
    resume_embedded = _make_candidate(
        name="Rohan Varma",
        skills=["C", "C++", "Embedded Systems", "Linux", "IoT", "Git"],
        summary="Firmware engineer with hands-on microcontroller board bring-up in C.",
        projects=["RTOS sensor hub firmware on STM32", "CAN bus diagnostics interface"],
    )

    job_iot = _make_listing(
        job_id="sanity-iot-02",
        title="IoT Firmware Intern",
        skills=["C", "C++", "Embedded Systems", "IoT", "Testing"],
        description="Design and test low-power firmware drivers for wireless connected devices.",
    )
    job_analytics = _make_listing(
        job_id="sanity-data-02",
        title="Business Intelligence Analyst",
        skills=["SQL", "Excel", "Tableau", "Data Analysis", "Communication"],
        description="Build executive dashboards and analyze operational datasets using BI tools.",
    )

    match_iot = score_job(resume_embedded, job_iot)
    match_analytics = score_job(resume_embedded, job_analytics)

    assert match_iot.score > match_analytics.score
    assert len(match_iot.matched_skills) >= 4
    assert len(match_analytics.matched_skills) == 0


# ---------------- Domain 4: Machine Learning & AI vs. Frontend ----------------


def test_ranking_ml_engineer_prefers_ai_role_over_frontend():
    """An ML/Deep Learning resume ranks an ML role above pure frontend web dev."""
    resume_ml = _make_candidate(
        name="Sneha Kulkarni",
        skills=[
            "Python",
            "PyTorch",
            "Deep Learning",
            "Machine Learning",
            "Computer Vision",
            "Scikit-learn",
        ],
        summary="AI researcher building neural networks and computer vision pipelines.",
        projects=["YOLO object detection for driving", "Transformer text summarization"],
    )

    job_ml = _make_listing(
        job_id="sanity-ml-01",
        title="Junior Computer Vision Engineer",
        skills=["Python", "Computer Vision", "PyTorch", "Deep Learning", "Linux"],
        description="Develop computer vision models and neural networks on image datasets.",
    )
    job_frontend = _make_listing(
        job_id="sanity-web-02",
        title="Angular Frontend Developer",
        skills=["TypeScript", "Angular", "HTML", "CSS", "REST API"],
        description="Maintain corporate client web portals using Angular UI architectures.",
    )

    match_ml = score_job(resume_ml, job_ml)
    match_fe = score_job(resume_ml, job_frontend)

    assert match_ml.score > match_fe.score
    assert len(match_ml.matched_skills) >= 4
    assert len(match_fe.matched_skills) == 0


# ---------------- Domain 5: QA Testing vs. Backend Python ----------------


def test_ranking_qa_engineer_prefers_testing_role_over_backend_dev():
    """A QA automation resume ranks a testing role above backend development."""
    resume_qa = _make_candidate(
        name="Karan Malhotra",
        skills=["Testing", "Java", "Git", "Agile", "SQL", "Problem Solving"],
        summary="Quality assurance engineer writing integration suites and defect tracking.",
        projects=["Selenium Java test automation framework", "API test validation suite"],
    )

    job_qa = _make_listing(
        job_id="sanity-qa-01",
        title="QA Automation Trainee",
        skills=["Java", "Testing", "Git", "Agile", "OOP"],
        description="Design automated test scripts, regression suites, and validate releases.",
    )
    job_dev = _make_listing(
        job_id="sanity-web-03",
        title="Django Web Developer Intern",
        skills=["Python", "Django", "PostgreSQL", "Git", "HTML"],
        description="Develop server-rendered database web applications using Django.",
    )

    match_qa = score_job(resume_qa, job_qa)
    match_dev = score_job(resume_qa, job_dev)

    assert match_qa.score > match_dev.score
    assert "Testing" in match_qa.matched_skills
    assert "Testing" not in match_dev.matched_skills


# ---------------- Domain 6: Technical Support vs. Data Science ----------------


def test_ranking_tech_support_prefers_helpdesk_over_data_science():
    """An IT support specialist resume ranks a support role above data science."""
    resume_support = _make_candidate(
        name="Vikram Nair",
        skills=["Linux", "Networking", "Problem Solving", "Communication", "Teamwork"],
        summary="IT operations specialist managing workstation setups and networking.",
        projects=[
            "Automated network diagnostics script",
            "Helpdesk ticketing workflow",
        ],
    )

    job_support = _make_listing(
        job_id="sanity-sup-02",
        title="Technical Support Engineer Trainee",
        skills=["Linux", "Networking", "Communication", "Problem Solving", "Teamwork"],
        description="Diagnose client hardware inquiries and resolve network issues.",
    )
    job_ds = _make_listing(
        job_id="sanity-ml-02",
        title="Data Science & ML Intern",
        skills=["Python", "Scikit-learn", "Pandas", "NumPy", "Data Analysis"],
        description="Perform predictive regression and cross-validation on tabular data.",
    )

    match_sup = score_job(resume_support, job_support)
    match_ds = score_job(resume_support, job_ds)

    assert match_sup.score > match_ds.score
    assert len(match_sup.matched_skills) >= 4
    assert len(match_ds.matched_skills) == 0


# ---------------- Domain 7: Overlapping Generic Skills Disambiguation ----------------


def test_ranking_shared_generic_skills_disambiguated_by_core_domain():
    """Candidates sharing generic skills (Git, SQL) are ranked by core domain skills."""
    candidate_data = _make_candidate(
        name="Ananya Sen",
        skills=["SQL", "Git", "Python", "Data Analysis", "Tableau", "Problem Solving"],
        summary="Data analyst analyzing metrics and Tableau telemetry reports.",
    )

    job_data = _make_listing(
        job_id="sanity-data-03",
        title="Junior Data Analyst",
        skills=["SQL", "Python", "Data Analysis", "Tableau", "Git"],
        description="Transform client transaction logs into actionable Tableau visual dashboards.",
    )
    job_qa = _make_listing(
        job_id="sanity-qa-02",
        title="Junior QA Engineer",
        skills=["SQL", "Testing", "Agile", "Git", "Communication"],
        description="Perform database regression testing and validation of web applications.",
    )

    match_data = score_job(candidate_data, job_data)
    match_qa = score_job(candidate_data, job_qa)

    assert match_data.score > match_qa.score
    assert len(match_data.matched_skills) > len(match_qa.matched_skills)


# ---------------- Domain 8: Academic Projects vs. Professional Experience ----------------


def test_ranking_academic_projects_vs_professional_experience():
    """Fresh graduate with only academic projects fits a fresher role better than a senior role."""
    resume_graduate = _make_candidate(
        name="Devika Rao",
        skills=["Python", "FastAPI", "SQL", "Git", "Docker"],
        summary="Computer Science graduate with academic coursework and capstone projects.",
        projects=[
            "College portal backend in FastAPI",
            "Student database management in SQL",
        ],
        experience=[],
    )

    job_fresher = _make_listing(
        job_id="sanity-web-04",
        title="Junior Python Backend Developer",
        skills=["Python", "FastAPI", "SQL", "Git"],
        description="Build backend microservices and REST APIs using Python and databases.",
        experience_level="fresher",
    )
    job_senior = _make_listing(
        job_id="sanity-web-05",
        title="Senior Python Backend Lead",
        skills=["Python", "FastAPI", "SQL", "Git"],
        description="Lead enterprise architecture and direct junior development teams.",
        experience_level="senior",
    )

    match_fresher = score_job(resume_graduate, job_fresher)
    match_senior = score_job(resume_graduate, job_senior)

    assert match_fresher.score > match_senior.score
    assert match_fresher.score - match_senior.score >= 10.0


# ---------------- Domain 9: Strong Relevant Match vs. Partial Match ----------------


def test_ranking_strong_relevant_match_outranks_partial_match():
    """A candidate possessing 5/5 skills and matching text outranks one with 1/5 skills."""
    resume = _make_candidate(
        name="Harsh Vardhan",
        skills=["Java", "Spring Boot", "MySQL", "Git", "OOP"],
        summary="Enterprise Java developer specialized in Spring Boot and MySQL persistence.",
    )

    job_spring = _make_listing(
        job_id="sanity-web-06",
        title="Java Spring Boot Trainee",
        skills=["Java", "Spring Boot", "MySQL", "Git", "OOP"],
        description="Contribute to enterprise commerce backend using Java and Spring Boot.",
    )
    job_php = _make_listing(
        job_id="sanity-web-07",
        title="Web Developer Trainee",
        skills=["PHP", "HTML", "CSS", "MySQL", "JavaScript"],
        description="Maintain client websites and dynamic web portals using PHP and MySQL.",
    )

    match_spring = score_job(resume, job_spring)
    match_php = score_job(resume, job_php)

    assert match_spring.score > match_php.score
    assert match_spring.score > 70.0
    assert len(match_spring.matched_skills) == 5
    assert len(match_php.matched_skills) == 1


# ---------------- Domain 10: Negative Case (Generic Buzzwords) ----------------


def test_ranking_negative_generic_words_do_not_outrank_true_domain_skills():
    """A resume with generic buzzwords should not outrank authentic domain matches."""
    resume_specific_ml = _make_candidate(
        name="Tanya Mehra",
        skills=["Python", "TensorFlow", "Scikit-learn", "Machine Learning", "Pandas"],
        summary="Machine learning practitioner implementing statistical regression.",
    )
    resume_generic_fluff = _make_candidate(
        name="Buzzword Candidate",
        skills=["Communication", "Teamwork"],
        summary="Passionate agile technology engineer developer interested in smart solutions.",
    )

    job_ml = _make_listing(
        job_id="sanity-ml-03",
        title="ML Engineer Intern",
        skills=["Python", "Machine Learning", "TensorFlow", "Algorithms", "Data Structures"],
        description="Research and implement machine learning algorithms on large-scale datasets.",
    )

    match_genuine = score_job(resume_specific_ml, job_ml)
    match_fluff = score_job(resume_generic_fluff, job_ml)

    assert match_genuine.score > match_fluff.score
    assert match_genuine.score >= 50.0
    assert match_fluff.score <= 30.0


# ---------------- End-to-End Ranking via `match_jobs` ----------------


def test_match_jobs_end_to_end_ranking_sanity():
    """Calling public `match_jobs` with a Data Analyst resume ranks data jobs at top."""
    resume_analyst = _make_candidate(
        name="Aditi Rao",
        skills=["SQL", "Python", "Data Analysis", "Excel", "Power BI"],
        summary="Data analyst querying relational databases and building telemetry dashboards.",
    )

    req = MatchRequest(
        resume=resume_analyst,
        top_k=5,
        verified_only=False,
    )
    ranked_matches = match_jobs(req)

    assert len(ranked_matches) == 5
    top_job = ranked_matches[0].job
    top_title = top_job.title.lower()
    data_terms = ["data", "analyst", "sql", "intelligence", "analytics"]
    assert any(term in top_title for term in data_terms)
    for i in range(len(ranked_matches) - 1):
        assert ranked_matches[i].score >= ranked_matches[i + 1].score
