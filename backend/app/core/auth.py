"""Minimal per-browser user identity (owner: lead).

No real authentication in the MVP.  A stable per-browser user ID is derived
from the ``X-User-ID`` header that the frontend sends on every request.
The header value is a UUID generated once by the browser and stored in
localStorage; it is not a security credential but it is stable enough to
isolate tailored resumes between sessions.

Team swap-in note
-----------------
When real auth is added (e.g. JWT / session cookie) replace *only* this
function. Every downstream caller receives a plain ``str`` user_id and does
not need to change.  The contract is: raise ``HTTPException(401)`` if the
caller is not authenticated, otherwise return a non-empty str user_id.
"""

from __future__ import annotations

import uuid

from fastapi import Header, HTTPException


def get_current_user(x_user_id: str | None = Header(default=None)) -> str:
    """FastAPI dependency: return a stable per-browser user_id string.

    If the client did not send an ``X-User-ID`` header (e.g. direct API
    calls during development) a random UUID is generated for the request.
    This keeps existing endpoints working without any header.

    The frontend *must* generate a UUID once per browser and include it on
    every request so that tailored resumes are correctly isolated.

    Raises ``HTTP 401`` only when the header is present but obviously
    malformed (non-UUID).  Empty / missing headers fall back to a random ID.
    """
    if not x_user_id or not x_user_id.strip():
        # No header — generate a throw-away ID; the user's tailored resumes
        # simply won't persist across sessions, which is acceptable for the MVP.
        return str(uuid.uuid4())

    candidate = x_user_id.strip()
    try:
        # Validate UUID format without enforcing a specific version.
        uuid.UUID(candidate)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail="Invalid X-User-ID header.") from exc

    return candidate
