from typing import Annotated

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.core.config import settings
from app.schemas import ParsedResume
from app.services.parser.service import parse_resume

router = APIRouter()


@router.post("/parse", response_model=ParsedResume)
async def parse(file: Annotated[UploadFile, File()]) -> ParsedResume:
    data = await file.read()
    if len(data) > settings.max_upload_bytes:
        raise HTTPException(status_code=413, detail="File too large (max 5 MB).")
    try:
        return parse_resume(file.filename or "resume.txt", data)
    except Exception as exc:
        raise HTTPException(status_code=422, detail="Could not read this resume.") from exc
