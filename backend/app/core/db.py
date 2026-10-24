"""Database foundation (lead-owned core infrastructure).

SQLAlchemy 2 models + engine/session management. The connection is configured through
`DATABASE_URL` so local SQLite can be swapped for PostgreSQL at deployment time.

A tiny `schema_version` table records the applied schema; `create_all` is used instead of
Alembic for the MVP. Upgrades are documented in docs/: bump `SCHEMA_VERSION` and add the
corresponding transform to `SCHEMA_UPGRADES` as columns/tables change, then re-run
`init_db()`. Never run destructive operations against production data.
"""

from __future__ import annotations

import datetime as dt
import logging
from collections.abc import Iterator
from typing import Any

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    MetaData,
    String,
    Text,
    create_engine,
    event,
    insert,
    text,
)
from sqlalchemy.engine import Engine
from sqlalchemy.orm import (
    DeclarativeBase,
    Mapped,
    Session,
    mapped_column,
    relationship,
    sessionmaker,
)

from app.core.config import settings

logger = logging.getLogger(__name__)

SCHEMA_VERSION = 1
_NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=_NAMING_CONVENTION)


UTC = getattr(dt, "UTC", dt.timezone.utc)  # noqa: UP017


def _utcnow() -> dt.datetime:
    return dt.datetime.now(UTC)


class SchemaVersion(Base):
    """Single-row table recording the applied schema version."""

    __tablename__ = "schema_version"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=SCHEMA_VERSION)
    applied_at: Mapped[dt.datetime] = mapped_column(DateTime, default=_utcnow)


class Company(Base):
    """Employer record; scraped jobs reference their company."""

    __tablename__ = "companies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    careers_url: Mapped[str | None] = mapped_column(String(500))
    ats_type: Mapped[str | None] = mapped_column(String(50))  # greenhouse|lever|ashby|...
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=_utcnow)

    jobs: Mapped[list[Job]] = relationship(back_populates="company")


class Job(Base):
    """A database-backed job listing (scraped and verified, never invented)."""

    __tablename__ = "jobs"

    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    company_id: Mapped[int | None] = mapped_column(
        ForeignKey("companies.id", ondelete="SET NULL"), index=True
    )
    title: Mapped[str] = mapped_column(String(300))
    location: Mapped[str] = mapped_column(String(200), default="")
    job_type: Mapped[str] = mapped_column(String(20), default="full-time", index=True)
    experience_level: Mapped[str] = mapped_column(String(20), default="fresher", index=True)

    # From the source listing; `apply_url` is what candidates should open.
    source_url: Mapped[str] = mapped_column(String(1000), unique=True, index=True)
    apply_url: Mapped[str | None] = mapped_column(String(1000))
    description: Mapped[str] = mapped_column(Text, default="")

    must_skills: Mapped[list[Any]] = mapped_column(JSON, default=list)
    nice_skills: Mapped[list[Any]] = mapped_column(JSON, default=list)
    skills_required: Mapped[list[Any]] = mapped_column(JSON, default=list)
    salary: Mapped[str | None] = mapped_column(String(200))
    posted_at: Mapped[str | None] = mapped_column(String(50))
    deadline: Mapped[str | None] = mapped_column(String(50))

    # Verification + freshness bookkeeping.
    verified: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    last_verified: Mapped[dt.date | None] = mapped_column(Date)
    first_seen: Mapped[dt.datetime] = mapped_column(DateTime, default=_utcnow)
    last_scraped_at: Mapped[dt.datetime | None] = mapped_column(DateTime)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)

    company: Mapped[Company | None] = relationship(back_populates="jobs")


class ResumeProfile(Base):
    """Persisted parsed resume with structured, evidence-carrying fields."""

    __tablename__ = "resume_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str | None] = mapped_column(String(200))
    email: Mapped[str | None] = mapped_column(String(200), index=True)
    phone: Mapped[str | None] = mapped_column(String(50))
    summary: Mapped[str | None] = mapped_column(Text)

    # Structured payloads; shapes mirror the API schemas (additive).
    skills: Mapped[list[Any]] = mapped_column(JSON, default=list)
    education: Mapped[list[Any]] = mapped_column(JSON, default=list)
    experience: Mapped[list[Any]] = mapped_column(JSON, default=list)
    projects: Mapped[list[Any]] = mapped_column(JSON, default=list)
    insights: Mapped[dict[str, Any] | None] = mapped_column(JSON)

    raw_text: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=_utcnow)
    updated_at: Mapped[dt.datetime] = mapped_column(DateTime, default=_utcnow, onupdate=_utcnow)

    personas: Mapped[list[PersonaProfile]] = relationship(back_populates="resume_profile")


class PersonaProfile(Base):
    """Self-described working style from the Q&A; evidence-backed, not a diagnosis."""

    __tablename__ = "persona_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    resume_profile_id: Mapped[int | None] = mapped_column(
        ForeignKey("resume_profiles.id", ondelete="CASCADE"), index=True
    )
    answers: Mapped[list[Any]] = mapped_column(JSON, default=list)  # question/answer pairs
    strengths: Mapped[list[Any]] = mapped_column(JSON, default=list)  # strength/quote pairs
    confidence: Mapped[str | None] = mapped_column(String(20))
    summary: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=_utcnow)

    resume_profile: Mapped[ResumeProfile | None] = relationship(back_populates="personas")


class TailoredResumeRow(Base):
    """Persisted tailored resume; content rendered on demand (no stored files)."""

    __tablename__ = "tailored_resumes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(100), index=True)
    job_id: Mapped[str] = mapped_column(String(100), index=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    content: Mapped[dict[str, Any]] = mapped_column(JSON)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=_utcnow)


class CachedResource(Base):
    """Cached preparation resource, verified per Task 6 before it is ever shown."""

    __tablename__ = "resources"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    kind: Mapped[str] = mapped_column(String(20), index=True)  # course|docs|practice|...
    skill: Mapped[str] = mapped_column(String(100), index=True)
    title: Mapped[str] = mapped_column(String(500))
    url: Mapped[str] = mapped_column(String(1000), unique=True, index=True)
    provider: Mapped[str | None] = mapped_column(String(200))  # channel / site name
    duration_minutes: Mapped[int | None] = mapped_column(Integer)
    extra: Mapped[dict[str, Any] | None] = mapped_column(JSON)

    verified: Mapped[bool] = mapped_column(Boolean, default=False)
    last_verified: Mapped[dt.date | None] = mapped_column(Date)
    cached_at: Mapped[dt.datetime] = mapped_column(DateTime, default=_utcnow)
    refreshed_at: Mapped[dt.datetime | None] = mapped_column(DateTime)


def make_engine(url: str | None = None) -> Engine:
    """Build the engine; SQLite gets the thread-safety pragma for FastAPI workers."""
    target_url = url or settings.database_url
    kwargs: dict[str, Any] = {}
    if target_url.startswith("sqlite"):
        kwargs["connect_args"] = {"check_same_thread": False}
    return create_engine(target_url, future=True, **kwargs)


engine = make_engine()
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False, future=True)


@event.listens_for(Session, "before_commit")
def _touch_updated_at(session: Session, *_: Any) -> None:
    for instance in session.dirty:
        if isinstance(instance, ResumeProfile):
            instance.updated_at = _utcnow()


def get_session() -> Iterator[Session]:
    """FastAPI dependency yielding a scoped database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db(target: Engine | None = None) -> None:
    """Create tables if not present and record the schema version (idempotent)."""
    target = target or engine
    Base.metadata.create_all(target)
    with target.begin() as conn:
        existing = conn.execute(
            text(f"SELECT version FROM {SchemaVersion.__tablename__} LIMIT 1")
        ).scalar()
        if existing is None:
            conn.execute(insert(SchemaVersion).values(version=SCHEMA_VERSION, applied_at=_utcnow()))
        elif int(existing) > SCHEMA_VERSION:
            logger.warning(
                "Database schema version %s is newer than code version %s; "
                "run the documented upgrade steps before using this database.",
                existing,
                SCHEMA_VERSION,
            )
