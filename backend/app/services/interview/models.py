"""Database model for mock interview sessions."""

import datetime as dt
from typing import Any

from sqlalchemy import JSON, Boolean, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import UTC, Base


def _utcnow() -> dt.datetime:
    return dt.datetime.now(UTC)


class InterviewSessionModel(Base):
    __tablename__ = "interview_sessions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    job_id: Mapped[str] = mapped_column(String(100), index=True)
    role_title: Mapped[str] = mapped_column(String(300), default="")
    company_name: Mapped[str] = mapped_column(String(200), default="")

    candidate_name: Mapped[str | None] = mapped_column(String(200))
    candidate_email: Mapped[str | None] = mapped_column(String(200))

    # State machine: created -> live -> ended -> processing -> report_ready | failed
    status: Mapped[str] = mapped_column(String(30), default="created", index=True)

    num_questions: Mapped[int] = mapped_column(Integer, default=5)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=15)

    consent_recording: Mapped[bool] = mapped_column(Boolean, default=False)
    consent_transcript: Mapped[bool] = mapped_column(Boolean, default=True)
    consent_integrity: Mapped[bool] = mapped_column(Boolean, default=False)

    # Full question plan with hidden rubrics & follow-ups
    plan: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)

    # Tavus integration fields
    tavus_conversation_id: Mapped[str | None] = mapped_column(String(100), index=True)
    tavus_conversation_url: Mapped[str | None] = mapped_column(String(1000))
    webhook_token: Mapped[str | None] = mapped_column(String(64), index=True)

    # Transcript & Recording
    transcript: Mapped[list[Any] | None] = mapped_column(JSON)
    recording_url: Mapped[str | None] = mapped_column(String(1000))
    perception_analysis: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    integrity_log: Mapped[list[Any] | None] = mapped_column(JSON)
    report: Mapped[dict[str, Any] | None] = mapped_column(JSON)

    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=_utcnow)
    started_at: Mapped[dt.datetime | None] = mapped_column(DateTime)
    ended_at: Mapped[dt.datetime | None] = mapped_column(DateTime)
    updated_at: Mapped[dt.datetime] = mapped_column(DateTime, default=_utcnow, onupdate=_utcnow)
