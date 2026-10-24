from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings
from app.core.db import init_db


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    # Idempotent schema bootstrap (create_all + schema_version table);
    # the scraper and jobs route rely on it.
    init_db()
    yield


app = FastAPI(
    title="CareerBridge API",
    description="Resume parsing, job matching, skill-gap analysis and interview practice.",
    version="0.1.0",
    lifespan=lifespan,
)

import traceback
from fastapi import Request
from fastapi.responses import JSONResponse

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    tb = traceback.format_exc()
    print("GLOBAL ERROR in request:", request.url.path)
    print(tb)
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "traceback": tb},
        headers={"Access-Control-Allow-Origin": "http://localhost:3000"},
    )


app.include_router(api_router, prefix="/api")
