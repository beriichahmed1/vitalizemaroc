"""Authentication headers and secret redaction for the SpaceSeller API.

The dashboard issues one token of the form ``<id>|<plaintext>`` (Laravel
Sanctum style). That entire string — pipe included — is the bearer token and
goes in the ``Authorization`` header verbatim. The account name shown next to
it in the dashboard is a label, not a credential, and is never sent.

Nothing in this module logs a token: ``redact`` is the only way a credential
may reach a log line or an exception message.
"""

from __future__ import annotations

from app.settings import Settings

#: Text substituted for any credential in logs and error messages.
REDACTED = "<redacted>"

#: Shortest token fragment worth redacting; below this a substring match is noise.
_MIN_SECRET_LENGTH = 8


def build_headers(settings: Settings) -> dict[str, str]:
    """Return the headers every SpaceSeller request must carry.

    ``X-Api-Key`` is only added when a second credential was issued; the
    bearer token is always sent alone otherwise.
    """
    headers: dict[str, str] = {
        "Accept": "application/json",
        "User-Agent": settings.spaceseller_user_agent,
    }
    authorization = settings.spaceseller_auth_header_value()
    if authorization:
        headers["Authorization"] = authorization
    if settings.spaceseller_api_key:
        headers["X-Api-Key"] = settings.spaceseller_api_key.strip()
    return headers


def secret_values(settings: Settings) -> list[str]:
    """Every configured credential, in redaction order (longest first)."""
    candidates = {
        settings.spaceseller_api_token.strip(),
        settings.spaceseller_api_key.strip(),
        settings.spaceseller_auth_header_value(),
    }
    return sorted(
        (value for value in candidates if len(value) >= _MIN_SECRET_LENGTH),
        key=len,
        reverse=True,
    )


def redact(settings: Settings, text: str) -> str:
    """Replace every occurrence of a configured credential with ``REDACTED``."""
    cleaned = text
    for secret in secret_values(settings):
        cleaned = cleaned.replace(secret, REDACTED)
    return cleaned


def describe_token(settings: Settings) -> str:
    """Non-reversible fingerprint of the token, safe to print in a smoke test.

    Shows the id prefix and the last four characters so the operator can tell
    *which* token is loaded without the value leaking into a terminal history.
    """
    token = settings.spaceseller_api_token.strip()
    if not token:
        return "no token configured"
    token_id = token.split("|", 1)[0] if "|" in token else "?"
    tail = token[-4:] if len(token) >= 4 else ""
    return f"token id={token_id} ending={tail} length={len(token)}"
