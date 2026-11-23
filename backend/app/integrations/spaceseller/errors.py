"""Error taxonomy for the SpaceSeller API.

One exception type per *failure class*, not per status code, following the same
contract as ``app.tracking.capi.TrackingSendError``: every error carries a short
stable ``code`` (safe to persist in ``last_error_code``) and a ``permanent``
flag that tells the worker whether retrying can ever succeed.

``permanent=True``  -> the request will never succeed as-is; stop retrying.
``permanent=False`` -> transient (network, timeout, 429, 5xx); retry with backoff.

The raw provider body is never put in ``code`` or ``message``: SpaceSeller
responses can echo customer PII, and ``last_error_code`` is persisted. Callers
that need the body inspect ``details``, which is only ever held in memory.
"""

from __future__ import annotations

from typing import Any

#: Longest error code the ``last_error_code`` columns can hold (see models.py).
MAX_CODE_LENGTH = 80


class SpaceSellerError(Exception):
    """Base class for every SpaceSeller failure."""

    default_code = "spaceseller_error"

    def __init__(
        self,
        code: str | None = None,
        *,
        message: str = "",
        status_code: int | None = None,
        details: dict[str, Any] | None = None,
        permanent: bool = False,
        retry_after: float | None = None,
    ) -> None:
        self.code = (code or self.default_code)[:MAX_CODE_LENGTH]
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        self.permanent = permanent
        self.retry_after = retry_after
        super().__init__(self.code)

    def __str__(self) -> str:
        if self.status_code:
            return f"{self.code} (http {self.status_code})"
        return self.code


class SpaceSellerConfigurationError(SpaceSellerError):
    """Credentials or the base URL are missing. Never worth retrying."""

    default_code = "spaceseller_not_configured"

    def __init__(self, code: str | None = None, **kwargs: Any) -> None:
        kwargs.setdefault("permanent", True)
        super().__init__(code, **kwargs)


class SpaceSellerNetworkError(SpaceSellerError):
    """DNS failure, refused connection or timeout. Always retryable."""

    default_code = "spaceseller_network_error"

    def __init__(self, code: str | None = None, **kwargs: Any) -> None:
        kwargs.setdefault("permanent", False)
        super().__init__(code, **kwargs)


class SpaceSellerTimeoutError(SpaceSellerNetworkError):
    """The server accepted the connection but did not answer in time."""

    default_code = "spaceseller_timeout"


class SpaceSellerAuthError(SpaceSellerError):
    """401/403: the token is missing, revoked or lacks scope."""

    default_code = "spaceseller_unauthorized"

    def __init__(self, code: str | None = None, **kwargs: Any) -> None:
        kwargs.setdefault("permanent", True)
        super().__init__(code, **kwargs)


class SpaceSellerValidationError(SpaceSellerError):
    """400/422: SpaceSeller rejected the payload. Fix the request, do not retry."""

    default_code = "spaceseller_validation_error"

    def __init__(self, code: str | None = None, **kwargs: Any) -> None:
        kwargs.setdefault("permanent", True)
        super().__init__(code, **kwargs)


class SpaceSellerNotFoundError(SpaceSellerError):
    """404: unknown order/lead id, or the documented path changed."""

    default_code = "spaceseller_not_found"

    def __init__(self, code: str | None = None, **kwargs: Any) -> None:
        kwargs.setdefault("permanent", True)
        super().__init__(code, **kwargs)


class SpaceSellerConflictError(SpaceSellerError):
    """409: SpaceSeller already has this lead (same external id). Treated as success."""

    default_code = "spaceseller_conflict"

    def __init__(self, code: str | None = None, **kwargs: Any) -> None:
        kwargs.setdefault("permanent", True)
        super().__init__(code, **kwargs)


class SpaceSellerRateLimitError(SpaceSellerError):
    """429: slow down. ``retry_after`` carries the server hint when present."""

    default_code = "spaceseller_rate_limited"

    def __init__(self, code: str | None = None, **kwargs: Any) -> None:
        kwargs.setdefault("permanent", False)
        super().__init__(code, **kwargs)


class SpaceSellerServerError(SpaceSellerError):
    """5xx: SpaceSeller is unhealthy. Retry with backoff."""

    default_code = "spaceseller_server_error"

    def __init__(self, code: str | None = None, **kwargs: Any) -> None:
        kwargs.setdefault("permanent", False)
        super().__init__(code, **kwargs)


class SpaceSellerResponseError(SpaceSellerError):
    """The response was not the JSON document we can act on."""

    default_code = "spaceseller_invalid_response"

    def __init__(self, code: str | None = None, **kwargs: Any) -> None:
        kwargs.setdefault("permanent", False)
        super().__init__(code, **kwargs)


#: Status code -> error class. Anything unmapped falls through to the 4xx/5xx split.
_STATUS_ERRORS: dict[int, type[SpaceSellerError]] = {
    400: SpaceSellerValidationError,
    401: SpaceSellerAuthError,
    403: SpaceSellerAuthError,
    404: SpaceSellerNotFoundError,
    409: SpaceSellerConflictError,
    422: SpaceSellerValidationError,
    429: SpaceSellerRateLimitError,
}


def error_from_status(
    status_code: int,
    *,
    body: Any = None,
    retry_after: float | None = None,
) -> SpaceSellerError:
    """Map an HTTP response to the narrowest matching error type.

    The code keeps the status (``spaceseller_http_422``) so support can group
    failures without the raw body ever reaching the database.
    """
    error_class = _STATUS_ERRORS.get(status_code)
    if error_class is None:
        error_class = SpaceSellerServerError if status_code >= 500 else SpaceSellerValidationError

    details: dict[str, Any] = {}
    message = ""
    if isinstance(body, dict):
        # Laravel-style envelopes: {"message": ..., "errors": {...}}
        raw_message = body.get("message")
        if isinstance(raw_message, str):
            message = raw_message[:300]
        raw_errors = body.get("errors")
        if isinstance(raw_errors, dict):
            details["errors"] = raw_errors
        raw_code = body.get("code") or body.get("error")
        if isinstance(raw_code, str):
            details["provider_code"] = raw_code[:120]

    return error_class(
        f"spaceseller_http_{status_code}",
        message=message,
        status_code=status_code,
        details=details,
        retry_after=retry_after,
    )
