"""Translate our order records into SpaceSeller lead payloads.

SpaceSeller's public documentation is not available, so this module is the only
place that encodes *which field names* we send. Everything else in the package
is field-agnostic. When the official spec arrives, only this file changes.

Field provenance — verify the second block against the spec before go-live:

Derived from our own data model (safe):
    external_id, customer_name, customer_phone, customer_city, total, currency,
    products[].sku/.name/.quantity/.unit_price/.line_total

Assumed from the SpaceSeller dashboard vocabulary (verify):
    payment_method, delivery_fee, note, source, products[].product_name

``external_id`` carries our order id on purpose: it is the deduplication key, so
a retried POST cannot create a second lead on their side. That is what makes
pushing a lead ``retry_safe``.
"""

from __future__ import annotations

from typing import Any

PAYMENT_METHOD = "cash_on_delivery"
CURRENCY = "MAD"

#: Bumped whenever the payload shape below changes, so stored outbox rows can be
#: recognised after a deploy.
LEAD_PAYLOAD_VERSION = 1


def _money(value: Any) -> int:
    """SpaceSeller takes whole dirhams, like the rest of our money columns."""
    return int(round(float(value or 0)))


def _order_lines(order: Any) -> list[dict[str, Any]]:
    return [
        {
            "sku": item.sku,
            "product_name": item.name_ar,
            "quantity": int(item.quantity),
            "unit_price": _money(item.unit_price_mad),
            "line_total": _money(item.line_total_mad),
        }
        for item in order.items
    ]


def build_lead_payload(order: Any, *, source: str = "vitalizemaroc.shop") -> dict[str, Any]:
    """Build the JSON body that pushes one order to SpaceSeller as a lead."""
    return {
        "external_id": order.id,
        "customer_name": order.customer_name,
        "customer_phone": order.customer_phone,
        "customer_city": order.customer_city,
        "payment_method": PAYMENT_METHOD,
        "currency": CURRENCY,
        "delivery_fee": _money(order.delivery_fee_mad),
        "total": _money(order.total_mad),
        "products": _order_lines(order),
        "note": order_note(order),
        "source": source,
        "payload_version": LEAD_PAYLOAD_VERSION,
    }


def order_note(order: Any) -> str:
    """Free-text hint for the confirmation agent, without echoing PII."""
    parts: list[str] = []
    if getattr(order, "post_form_offer_mad", 0):
        parts.append("upsell accepted")
    if getattr(order, "quantity_offer_savings_mad", 0):
        parts.append("quantity offer applied")
    return "; ".join(parts)


def summarize_for_log(payload: dict[str, Any]) -> str:
    """Non-PII one-liner: order id, item count, total. Safe for worker logs."""
    products = payload.get("products") or []
    quantity = sum(int(line.get("quantity", 0)) for line in products)
    return (
        f"external_id={payload.get('external_id')} "
        f"lines={len(products)} units={quantity} total={payload.get('total')}"
    )
