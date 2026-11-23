"""SpaceSeller API client: authenticated read/write calls, one method per action.

Sits on ``SpaceSellerTransport`` (auth, retries, error mapping) and
``payloads`` (order -> lead body). Callers get an unwrapped dict or a
``SpaceSellerError``; no httpx type ever escapes this module.

Envelope handling: SpaceSeller front-ends are Laravel-style, so successful
bodies arrive either bare or wrapped in ``{"data": ...}``. ``unwrap_data``
accepts both so a change on their side does not break every caller.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

import httpx

from app.integrations.spaceseller.errors import (
    SpaceSellerError,
    SpaceSellerResponseError,
)
from app.integrations.spaceseller.payloads import build_lead_payload, summarize_for_log
from app.integrations.spaceseller.transport import SpaceSellerTransport, is_duplicate
from app.settings import Settings

logger = logging.getLogger("vitalize.spaceseller")

DEFAULT_PAGE_SIZE = 50
MAX_PAGE_SIZE = 200


def unwrap_data(body: Any) -> Any:
    """Return the useful part of a SpaceSeller body.

    Handles ``{"data": [...]}``, ``{"data": {...}}`` and bare documents.
    """
    if isinstance(body, dict) and "data" in body:
        return body["data"]
    return body


def clamp_page(page: int, per_page: int) -> tuple[int, int]:
    """Keep pagination inside sane bounds before it reaches the wire."""
    return max(int(page), 1), min(max(int(per_page), 1), MAX_PAGE_SIZE)


@dataclass(frozen=True)
class LeadSubmission:
    """Outcome of pushing one order to SpaceSeller.

    ``duplicate`` means SpaceSeller already had this ``external_id`` (409) —
    the lead exists, so the delivery counts as done and must not be retried.
    """

    external_id: str
    space_seller_id: str | None = None
    status: str | None = None
    duplicate: bool = False
    body: dict[str, Any] = field(default_factory=dict)


class SpaceSellerClient:
    """Push and fetch SpaceSeller resources for one configured account."""

    def __init__(self, settings: Settings, http_client: httpx.Client | None = None) -> None:
        self.settings = settings
        self.transport = SpaceSellerTransport(settings, http_client)

    def close(self) -> None:
        self.transport.close()

    def __enter__(self) -> "SpaceSellerClient":
        return self

    def __exit__(self, *_exc_info: object) -> None:
        self.close()

    # ------------------------------------------------------------------ push

    def push_lead(self, order: Any) -> LeadSubmission:
        """Create a lead from one of our orders.

        ``retry_safe=True`` is deliberate: the body carries ``external_id``, so
        a replay that reaches a lead SpaceSeller already created comes back 409
        and is reported as ``duplicate`` instead of failing the delivery.
        """
        payload = build_lead_payload(order, source=self.settings.site_public_url)
        logger.info("spaceseller_push_lead %s", summarize_for_log(payload))
        try:
            body = self.transport.request(
                "POST",
                self.settings.spaceseller_leads_path,
                json_body=payload,
                retry_safe=True,
            )
        except SpaceSellerError as error:
            if is_duplicate(error):
                logger.info("spaceseller_lead_duplicate external_id=%s", order.id)
                return LeadSubmission(external_id=order.id, duplicate=True)
            raise
        return self._submission(order.id, body)

    def _submission(self, external_id: str, body: Any) -> LeadSubmission:
        document = unwrap_data(body)
        if not isinstance(document, dict):
            return LeadSubmission(external_id=external_id, body={})
        identifier = document.get("id") or document.get("lead_id")
        status = document.get("status")
        return LeadSubmission(
            external_id=external_id,
            space_seller_id=str(identifier) if identifier is not None else None,
            status=str(status) if status is not None else None,
            body=document,
        )

    # ------------------------------------------------------------------ read

    def get_lead(self, lead_id: str | int) -> dict[str, Any]:
        """Fetch one lead by SpaceSeller's own id."""
        path = _detail_path(self.settings.spaceseller_leads_path, lead_id)
        return _as_document(self.transport.request("GET", path))

    def list_leads(
        self,
        *,
        page: int = 1,
        per_page: int = DEFAULT_PAGE_SIZE,
        status: str | None = None,
    ) -> dict[str, Any]:
        """Page through leads, optionally filtered by SpaceSeller status."""
        return self._list(
            self.settings.spaceseller_leads_path, page=page, per_page=per_page, status=status
        )

    def get_order(self, order_id: str | int) -> dict[str, Any]:
        """Fetch one SpaceSeller order by id."""
        path = _detail_path(self.settings.spaceseller_orders_path, order_id)
        return _as_document(self.transport.request("GET", path))

    def list_orders(
        self,
        *,
        page: int = 1,
        per_page: int = DEFAULT_PAGE_SIZE,
        status: str | None = None,
    ) -> dict[str, Any]:
        """Page through orders, optionally filtered by delivery status."""
        return self._list(
            self.settings.spaceseller_orders_path, page=page, per_page=per_page, status=status
        )

    def ping(self) -> dict[str, Any]:
        """Cheapest authenticated call, used by the credential smoke test."""
        return _as_document(self.transport.request("GET", self.settings.spaceseller_health_path))

    def _list(
        self,
        path: str,
        *,
        page: int,
        per_page: int,
        status: str | None,
    ) -> dict[str, Any]:
        page, per_page = clamp_page(page, per_page)
        params: dict[str, Any] = {"page": page, "per_page": per_page}
        if status:
            params["status"] = status
        return _collection(self.transport.request("GET", path, params=params), page=page, per_page=per_page)


def _detail_path(collection_path: str, identifier: str | int) -> str:
    return f"{collection_path.rstrip('/')}/{identifier}"


def _as_document(body: Any) -> dict[str, Any]:
    document = unwrap_data(body)
    if document is None:
        return {}
    if not isinstance(document, dict):
        raise SpaceSellerResponseError(
            "spaceseller_unexpected_shape",
            message="expected a JSON object",
        )
    return document


def _collection(body: Any, *, page: int, per_page: int) -> dict[str, Any]:
    """Normalise a listing to ``{"items", "page", "per_page", "meta"}``."""
    document = unwrap_data(body)
    items: list[Any] = []
    meta: dict[str, Any] = {}

    if isinstance(document, list):
        items = document
    elif isinstance(document, dict):
        raw_items = document.get("items") or document.get("results") or []
        items = raw_items if isinstance(raw_items, list) else [raw_items]
        if isinstance(document.get("meta"), dict):
            meta = dict(document["meta"])
    elif document is not None:
        items = [document]

    if isinstance(body, dict) and isinstance(body.get("meta"), dict):
        meta = {**body["meta"], **meta}
    return {"items": items, "page": page, "per_page": per_page, "meta": meta}
