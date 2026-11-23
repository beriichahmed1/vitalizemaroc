"""Durable lead delivery for SpaceSeller.

Same shape as the Sheets and CAPI outboxes: an enqueue that runs inside the
order transaction, and a worker task that drains one row per tick with
exponential backoff. Nothing here decides *whether* a lead is business-valid —
that is `should_enqueue`, driven purely by configuration.
"""

from __future__ import annotations

from app.integrations.spaceseller.errors import MAX_CODE_LENGTH
from app.settings import Settings

PENDING = "pending"
DELIVERED = "delivered"
FAILED = "failed"

#: Matches the Sheets/CAPI ceiling so all three outboxes give up together.
MAX_ATTEMPTS = 12


def should_enqueue(settings: Settings) -> bool:
    """True only when the integration is fully configured.

    Mirrors ``configured_platforms``: a half-configured SpaceSeller must never
    create outbox rows, because they could only ever fail.
    """
    return settings.spaceseller_configured


def next_state(attempts: int, *, succeeded: bool, permanent: bool) -> str:
    """Decide the row's state after a delivery attempt."""
    if succeeded:
        return DELIVERED
    if permanent or attempts >= MAX_ATTEMPTS:
        return FAILED
    return PENDING


def store_error_code(code: str | None) -> str | None:
    """Trim to what the ``last_error_code`` column holds."""
    return code[:MAX_CODE_LENGTH] if code else None


def enqueue_lead(db, order, settings: Settings) -> bool:
    """Queue one order for delivery, inside the caller's transaction.

    Returns False when the integration is not configured, so ``finalize_order``
    stays a no-op on deployments without SpaceSeller credentials.
    """
    if not should_enqueue(settings):
        return False

    from app.models import SpaceSellerOutbox

    db.add(SpaceSellerOutbox(order_id=order.id, state=PENDING))
    return True
