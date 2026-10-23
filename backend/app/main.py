from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Schema creation is safe to repeat; the scraper and jobs route rely on it.
    from app.core.db import init_db

    init_db()
    yield


app = FastAPI(
    title="CareerBridge API",
    description="Resume parsing, job matching, skill-gap analysis and interview practice.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")
