"""Tavus Conversational Video Interface (CVI) integration.

Handles PAL creation/reuse, live conversation creation, call shutdown,
and fallback transcript fetching according to Tavus v2 CVI specifications.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any

import httpx

from app.core.config import settings
from app.schemas import InterviewPlan

logger = logging.getLogger(__name__)

TAVUS_API_BASE = "https://tavusapi.com/v2"

INTERVIEWER_PAL_NAME = "CareerBridge Interviewer"

INTERVIEWER_SYSTEM_PROMPT = (
    "You are Robin, a warm, professional, and encouraging AI technical interviewer "
    "at CareerBridge. You are conducting a structured mock interview with an Indian student "
    "or early-career engineer.\n\n"
    "STRICT BEHAVIORAL RULES:\n"
    "1. Ask ONLY the interview questions listed in your conversational context, strictly in order, "
    "one at a time.\n"
    "2. NEVER ask multiple questions at once, and never invent topics outside the provided plan.\n"
    "3. Listen patiently. Wait until the candidate has fully finished speaking before answering.\n"
    "4. After the candidate finishes their answer, you may ask at most ONE brief follow-up "
    "question. Use the suggested follow-up from the context or probe the candidate's own words.\n"
    "5. Keep your acknowledgments to a few encouraging words (e.g., 'Thank you, great context.', "
    "'Understood, that makes sense.').\n"
    "6. Give NO hints, scoring, or feedback during the interview. The candidate will receive "
    "a detailed report afterwards.\n"
    "7. Stay strictly on the interview topic. If the candidate digresses, warmly steer them back.\n"
    "8. After the final question is answered, thank the candidate warmly, close the interview "
    "politely, and state that their personalized evaluation report is being generated."
)


class TavusError(Exception):
    """Base exception for Tavus API interactions."""


class TavusAuthError(TavusError):
    """Raised when Tavus returns 401/403 authentication error."""


class TavusRateLimitError(TavusError):
    """Raised when Tavus returns 429 rate limit error."""


def format_conversational_context(plan: InterviewPlan, candidate_name: str) -> str:
    """Format the question plan for Tavus conversational context WITHOUT rubrics.

    The hidden rubric ('expected_key_points') is strictly excluded so the candidate
    cannot see it and the avatar does not recite the grading criteria.
    """
    lines: list[str] = [
        f"Candidate Name: {candidate_name}",
        f"Target Role: {plan.role_title} at {plan.company_name}",
        "",
        "INTERVIEW QUESTIONS (Ask these in order, one question per turn):",
    ]

    for idx, q in enumerate(plan.questions, start=1):
        focus = f" [Focus: {q.focus_skill_or_project}]" if q.focus_skill_or_project else ""
        lines.append(f"{idx}. ({q.type.upper()}{focus}) {q.text}")
        if q.follow_up:
            lines.append(f"   Optional Follow-Up: {q.follow_up}")

    lines.append("")
    lines.append(
        "After the candidate answers all questions, thank them warmly and end the interview."
    )
    return "\n".join(lines)


async def _send_request_with_retries(
    method: str,
    endpoint: str,
    client: httpx.AsyncClient | None = None,
    **kwargs: Any,
) -> dict[str, Any]:
    """Execute Tavus HTTP request with exponential backoff on transient errors."""
    url = f"{settings.tavus_api_base.rstrip('/')}/{endpoint.lstrip('/')}"
    headers = kwargs.pop("headers", {})
    headers.update(
        {
            "x-api-key": settings.tavus_api_key,
            "Content-Type": "application/json",
        }
    )

    should_close = False
    if client is None:
        client = httpx.AsyncClient(timeout=30.0)
        should_close = True

    try:
        max_attempts = 3
        delay = 1.0
        for attempt in range(1, max_attempts + 1):
            try:
                response = await client.request(method, url, headers=headers, **kwargs)
                if response.status_code in (401, 403):
                    msg = f"Tavus auth failed (HTTP {response.status_code}): {response.text}"
                    raise TavusAuthError(msg)
                if response.status_code == 429:
                    if attempt == max_attempts:
                        raise TavusRateLimitError("Tavus rate limit exceeded after retries.")
                    await asyncio.sleep(delay)
                    delay *= 2
                    continue
                if response.status_code >= 500:
                    if attempt == max_attempts:
                        response.raise_for_status()
                    await asyncio.sleep(delay)
                    delay *= 2
                    continue

                response.raise_for_status()
                if response.status_code == 204 or not response.content:
                    return {}
                return response.json()
            except (httpx.ConnectError, httpx.TimeoutException) as exc:
                if attempt == max_attempts:
                    raise TavusError(f"Tavus network connection error: {exc}") from exc
                await asyncio.sleep(delay)
                delay *= 2
    finally:
        if should_close:
            await client.aclose()

    raise TavusError("Tavus request failed after maximum retry attempts.")


async def get_or_create_interviewer_pal(client: httpx.AsyncClient | None = None) -> str:
    """Ensure a reusable 'CareerBridge Interviewer' PAL exists and return its ID.

    Per Tavus guidelines, PALs should be created once and reused across conversations,
    supplying interview-specific questions via conversational_context.
    """
    if settings.tavus_pal_id:
        return settings.tavus_pal_id

    if not settings.tavus_api_key:
        logger.warning("TAVUS_API_KEY is not set. Returning stub PAL ID.")
        return "pal_mock_careerbridge"

    # 1. Check existing PALs
    try:
        pals_data = await _send_request_with_retries("GET", "pals", client=client)
        pal_list = pals_data if isinstance(pals_data, list) else pals_data.get("data", [])
        for pal in pal_list:
            if isinstance(pal, dict) and pal.get("pal_name") == INTERVIEWER_PAL_NAME:
                pal_id = pal.get("pal_id")
                if pal_id:
                    return str(pal_id)
    except Exception as exc:
        logger.warning("Could not query existing PALs: %s", exc)

    # 2. Create new PAL with perception layer
    payload: dict[str, Any] = {
        "pal_name": INTERVIEWER_PAL_NAME,
        "default_face_id": settings.tavus_face_id,
        "system_prompt": INTERVIEWER_SYSTEM_PROMPT,
        "layers": {
            "perception": {
                "perception_model": "raven-2",
                "perception_analysis_queries": [
                    "What presentation and communication cues did the candidate exhibit "
                    "(eye contact, professional posture, engagement)?",
                    "Did the candidate maintain professional camera presence throughout?",
                ],
            }
        },
    }

    try:
        result = await _send_request_with_retries("POST", "pals", client=client, json=payload)
        pal_id = result.get("pal_id")
        if pal_id:
            return str(pal_id)
        raise TavusError(f"Unexpected Create PAL response: {result}")
    except Exception as exc:
        logger.error("Failed to create Tavus interviewer PAL: %s", exc)
        raise


async def create_tavus_conversation(
    session_id: str,
    plan: InterviewPlan,
    candidate_name: str,
    webhook_token: str,
    duration_minutes: int = 15,
    consent_recording: bool = False,
    client: httpx.AsyncClient | None = None,
) -> dict[str, str]:
    """Create a live video conversation on Tavus and return conversation_id and URL."""
    if not settings.tavus_api_key:
        logger.info("TAVUS_API_KEY unset; returning mock Tavus conversation room.")
        return {
            "conversation_id": f"c_mock_{session_id}",
            "conversation_url": f"https://tavus.daily.co/mock-{session_id}",
        }

    pal_id = await get_or_create_interviewer_pal(client=client)
    conversational_context = format_conversational_context(plan, candidate_name)

    max_duration_seconds = max(300, min(duration_minutes * 60, settings.max_interview_minutes * 60))
    callback_url = (
        f"{settings.webhook_base_url.rstrip('/')}/api/interview/webhook/tavus"
        f"?token={webhook_token}&session_id={session_id}"
    )

    custom_greeting = (
        f"Hi {candidate_name}, welcome to your CareerBridge mock interview for the "
        f"{plan.role_title} role at {plan.company_name}! I'm Robin, your AI interviewer. "
        "Whenever you're ready, let's begin with our first question."
    )

    payload: dict[str, Any] = {
        "pal_id": pal_id,
        "face_id": settings.tavus_face_id,
        "conversation_name": f"CareerBridge - {plan.role_title} - {session_id[:8]}",
        "conversational_context": conversational_context,
        "custom_greeting": custom_greeting,
        "callback_url": callback_url,
        "properties": {
            "max_call_duration": max_duration_seconds,
            "participant_left_timeout": 60,
            "participant_absent_timeout": 300,
            "enable_closed_captions": True,
            "enable_recording": bool(consent_recording),
        },
    }

    res = await _send_request_with_retries("POST", "conversations", client=client, json=payload)
    conversation_id = res.get("conversation_id", "")
    conversation_url = res.get("conversation_url", "")

    if not conversation_url and conversation_id:
        conversation_url = f"https://tavus.daily.co/{conversation_id}"

    return {
        "conversation_id": str(conversation_id),
        "conversation_url": str(conversation_url),
    }


async def end_tavus_conversation(
    conversation_id: str,
    client: httpx.AsyncClient | None = None,
) -> bool:
    """Signal Tavus to cleanly end the conversation room."""
    if not conversation_id or conversation_id.startswith("c_mock_"):
        return True

    if not settings.tavus_api_key:
        return True

    try:
        await _send_request_with_retries(
            "POST",
            f"conversations/{conversation_id}/end",
            client=client,
        )
        return True
    except Exception as exc:
        logger.warning("End Tavus conversation '%s' returned: %s", conversation_id, exc)
        return False


async def fetch_tavus_conversation_verbose(
    conversation_id: str,
    client: httpx.AsyncClient | None = None,
) -> dict[str, Any]:
    """Retrieve verbose conversation metadata including transcript & perception events.

    Used as an automatic fallback if webhook transcription_ready is delayed or missed.
    """
    if not conversation_id or conversation_id.startswith("c_mock_"):
        return {}

    if not settings.tavus_api_key:
        return {}

    try:
        data = await _send_request_with_retries(
            "GET",
            f"conversations/{conversation_id}?verbose=true",
            client=client,
        )
        return data
    except Exception as exc:
        logger.warning(
            "Failed fetching verbose conversation for '%s': %s",
            conversation_id,
            exc,
        )
        return {}
