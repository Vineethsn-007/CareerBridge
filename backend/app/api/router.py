from fastapi import APIRouter

from app.api.routes import admin, health, interview, jobs, persona, resume, skills, tailor

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(resume.router, prefix="/resume", tags=["resume"])
api_router.include_router(tailor.router, prefix="/resume", tags=["tailor"])
api_router.include_router(jobs.router, tags=["jobs"])
api_router.include_router(skills.router, prefix="/skills", tags=["skills"])
api_router.include_router(interview.router, prefix="/interview", tags=["interview"])
api_router.include_router(persona.router, prefix="/persona", tags=["persona"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
