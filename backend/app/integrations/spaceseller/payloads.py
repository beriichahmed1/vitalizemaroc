"""Translate our order records into SpaceSeller order payloads.

Field names follow SpaceSeller's official API guide (POST /api/v1/orders):
fullname, phone, address, id_city, note, total_price and
products[].sku / .quantity / .unit_price.
"""

from __future__ import annotations

from typing import Any

PAYMENT_METHOD = "cash_on_delivery"
CURRENCY = "MAD"

#: Bumped whenever the payload shape below changes, so stored outbox rows can be
#: recognised after a deploy.
LEAD_PAYLOAD_VERSION = 2

#: Our storefront SKU -> the SKU registered in SpaceSeller's catalogue.
SPACESELLER_SKUS = {
    "immunity-shield": "energie",
    "vitality-gummies": "energyfocus-gummies",
}


def _money(value: Any) -> int:
    """SpaceSeller takes whole dirhams, like the rest of our money columns."""
    return int(round(float(value or 0)))


def _spaceseller_sku(sku: str) -> str:
    return SPACESELLER_SKUS.get(sku, sku)


def _order_lines(order: Any) -> list[dict[str, Any]]:
    return [
        {
            "sku": _spaceseller_sku(item.sku),
            "quantity": int(item.quantity),
            "unit_price": _money(item.unit_price_mad),
        }
        for item in order.items
    ]


def build_lead_payload(order: Any, *, source: str = "vitalizemaroc.shop") -> dict[str, Any]:
    """Build the JSON body that pushes one order to SpaceSeller."""
    return {
        "fullname": order.customer_name,
        "phone": order.customer_phone,
        "address": order.customer_city,
        "note": order_note(order),
        "total_price": _money(order.total_mad),
        "products": _order_lines(order),
    }


def order_note(order: Any) -> str:
    """Free-text hint for the confirmation agent, without echoing PII."""
    parts: list[str] = [f"ref {order.id}"]
    if getattr(order, "post_form_offer_mad", 0):
        parts.append("upsell accepted")
    if getattr(order, "quantity_offer_savings_mad", 0):
        parts.append("quantity offer applied")
    return "; ".join(parts)


def summarize_for_log(payload: dict[str, Any]) -> str:
    """Non-PII one-liner: item count, units, total. Safe for worker logs."""
    products = payload.get("products") or []
    quantity = sum(int(line.get("quantity", 0)) for line in products)
    return (
        f"lines={len(products)} units={quantity} "
        f"total={payload.get('total_price')}"
    )