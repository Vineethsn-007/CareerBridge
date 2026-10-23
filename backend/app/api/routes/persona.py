from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_session
from app.schemas import (
    PersonaAnswerRequest,
    PersonaAnswerResponse,
    PersonaStartRequest,
    PersonaStartResponse,
)
from app.services.persona.service import answer_persona, start_persona

router = APIRouter()


@router.post("/start", response_model=PersonaStartResponse)
def persona_start(
    req: PersonaStartRequest, db: Annotated[Session, Depends(get_session)]
) -> PersonaStartResponse:
    try:
        return start_persona(db, req)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/answer", response_model=PersonaAnswerResponse)
def persona_answer(
    req: PersonaAnswerRequest, db: Annotated[Session, Depends(get_session)]
) -> PersonaAnswerResponse:
    try:
        return answer_persona(db, req)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
