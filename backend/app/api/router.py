from fastapi import APIRouter

from app.api.routes import health, interview, jobs, resume, skills

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(resume.router, prefix="/resume", tags=["resume"])
api_router.include_router(jobs.router, tags=["jobs"])
api_router.include_router(skills.router, prefix="/skills", tags=["skills"])
api_router.include_router(interview.router, prefix="/interview", tags=["interview"])
