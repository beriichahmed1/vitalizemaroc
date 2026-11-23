"""HTTP transport for SpaceSeller: URLs, retries, timeouts, response decoding.

Mirrors ``app/tracking/capi.py``: a module-level ``httpx`` call with an explicit
timeout, status inspected instead of ``raise_for_status()`` so 4xx and 5xx stay
distinguishable, and every failure converted into a ``SpaceSellerError`` whose
``permanent`` flag the worker understands.

Retries here only cover *immediate* transient blips inside a single delivery
attempt. The durable retry policy lives in the outbox (`app/worker.py`), which
backs off in minutes and hours rather than seconds.
"""

from __future__ import annotations

import logging
import random
import time
from typing import Any

import httpx

from app.integrations.spaceseller.auth import build_headers, redact
from app.integrations.spaceseller.errors import (
    SpaceSellerConfigurationError,
    SpaceSellerConflictError,
    SpaceSellerError,
    SpaceSellerNetworkError,
    SpaceSellerResponseError,
    SpaceSellerTimeoutError,
    error_from_status,
)
from app.settings import Settings

logger = logging.getLogger("vitalize.spaceseller")

#: Backoff between inline retries: 1s, 2s, 4s... never longer than this.
MAX_INLINE_SLEEP_SECONDS = 8.0

#: A ``Retry-After`` from SpaceSeller is honoured up to this ceiling.
MAX_RETRY_AFTER_SECONDS = 30.0

#: Statuses that mean "the call worked".
SUCCESS_STATUSES = frozenset({200, 201, 202, 204})


def build_url(settings: Settings, path: str) -> str:
    """Join the configured base URL with an endpoint path."""
    base = settings.spaceseller_base_url.rstrip("/")
    suffix = path if path.startswith("/") else f"/{path}"
    return f"{base}{suffix}"


def parse_retry_after(response: httpx.Response) -> float | None:
    """Read ``Retry-After`` in seconds; the HTTP-date form is ignored."""
    raw = response.headers.get("retry-after")
    if not raw:
        return None
    try:
        value = float(raw.strip())
    except ValueError:
        return None
    return min(max(value, 0.0), MAX_RETRY_AFTER_SECONDS)


def inline_delay(attempt: int, retry_after: float | None) -> float:
    """Delay before retry ``attempt`` (0-based), jittered to avoid lockstep."""
    if retry_after is not None:
        return retry_after
    base = min(2.0 ** attempt, MAX_INLINE_SLEEP_SECONDS)
    return min(base + random.uniform(0, 0.25), MAX_INLINE_SLEEP_SECONDS)


def decode_body(response: httpx.Response) -> Any:
    """Decode a JSON body, tolerating empty and non-JSON responses."""
    if response.status_code == 204 or not response.content:
        return None
    try:
        return response.json()
    except ValueError as error:
        raise SpaceSellerResponseError(
            "spaceseller_invalid_response",
            message="response body was not JSON",
            status_code=response.status_code,
        ) from error


def is_duplicate(failure: SpaceSellerError) -> bool:
    """True when SpaceSeller already holds this lead, which counts as success."""
    return isinstance(failure, SpaceSellerConflictError)


class SpaceSellerTransport:
    """Authenticated, retrying transport shared by every SpaceSeller call.

    Pass an ``httpx.Client`` built on ``httpx.MockTransport`` to exercise the
    client in tests without touching the network.
    """

    def __init__(self, settings: Settings, http_client: httpx.Client | None = None) -> None:
        self.settings = settings
        self._client = http_client
        self._owns_client = http_client is None

    def close(self) -> None:
        if self._owns_client and self._client is not None:
            self._client.close()
            self._client = None

    def __enter__(self) -> "SpaceSellerTransport":
        return self

    def __exit__(self, *_exc_info: object) -> None:
        self.close()

    def _get_client(self) -> httpx.Client:
        if self._client is None:
            self._client = httpx.Client(
                timeout=httpx.Timeout(self.settings.spaceseller_timeout_seconds),
            )
            self._owns_client = True
        return self._client

    def request(
        self,
        method: str,
        path: str,
        *,
        json_body: Any = None,
        params: dict[str, Any] | None = None,
        retry_safe: bool = True,
        success_statuses: frozenset[int] = SUCCESS_STATUSES,
    ) -> Any:
        """Perform one API call and return the decoded JSON body.

        ``retry_safe`` must be True only when replaying the request cannot
        create a duplicate on SpaceSeller's side — GETs, and POSTs that carry a
        stable external id the platform deduplicates on.
        """
        if not self.settings.spaceseller_configured:
            raise SpaceSellerConfigurationError(
                "spaceseller_not_configured",
                message="SPACESELLER_BASE_URL and SPACESELLER_API_TOKEN must be set",
            )

        url = build_url(self.settings, path)
        headers = build_headers(self.settings)
        attempts = self.settings.spaceseller_max_retries + 1 if retry_safe else 1

        for attempt in range(attempts):
            last_attempt = attempt == attempts - 1
            try:
                response = self._get_client().request(
                    method,
                    url,
                    json=json_body,
                    params=params,
                    headers=headers,
                )
            except httpx.TimeoutException as error:
                failure: SpaceSellerError = SpaceSellerTimeoutError(
                    "spaceseller_timeout",
                    message=redact(self.settings, str(error)),
                )
            except httpx.HTTPError as error:
                failure = SpaceSellerNetworkError(
                    "spaceseller_network_error",
                    message=redact(self.settings, str(error)),
                )
            else:
                if response.status_code in success_statuses:
                    return decode_body(response)
                failure = self._failure_for(response)

            if failure.permanent or last_attempt:
                self._log_failure(method, path, failure, attempt)
                raise failure

            delay = inline_delay(attempt, failure.retry_after)
            logger.warning(
                "spaceseller_retry method=%s path=%s code=%s attempt=%s delay=%.2fs",
                method,
                path,
                failure.code,
                attempt + 1,
                delay,
            )
            time.sleep(delay)

        # Unreachable: every loop iteration returns or raises.
        raise SpaceSellerNetworkError("spaceseller_retries_exhausted")

    def _failure_for(self, response: httpx.Response) -> SpaceSellerError:
        try:
            body: Any = response.json()
        except ValueError:
            body = response.text[:300] if response.text else None
        return error_from_status(
            response.status_code,
            body=body,
            retry_after=parse_retry_after(response),
        )

    def _log_failure(self, method: str, path: str, failure: SpaceSellerError, attempt: int) -> None:
        # Only the code and status reach the log: provider messages can echo PII.
        logger.warning(
            "spaceseller_call_failed method=%s path=%s code=%s status=%s attempts=%s",
            method,
            path,
            failure.code,
            failure.status_code,
            attempt + 1,
        )
