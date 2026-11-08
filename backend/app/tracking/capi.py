"""Server-side conversion payloads (Meta CAPI, TikTok Events API, Snap CAPI v3).

The browser pixel and the server share one identifier per conversion: the order id.
It is sent as eventID (Meta), event_id (TikTok) and transaction_id/event_id (Snap).
Event names must stay identical to the names fired by the browser in
frontend/lib/tracking/events.ts.
"""
from datetime import datetime, timezone

import httpx

from app.models import Order
from app.settings import Settings
from app.tracking.hashing import (
    meta_city_hash,
    meta_country_hash,
    meta_phone_hash,
    snap_phone_hash,
    tiktok_phone_hash,
)

PLATFORMS = ("meta", "tiktok", "snap")
META_EVENT = "Purchase"
TIKTOK_EVENT = "CompletePayment"
SNAP_EVENT = "PURCHASE"
CURRENCY = "MAD"


class TrackingSendError(Exception):
    def __init__(self, code: str, permanent: bool = False):
        super().__init__(code)
        self.code = code
        self.permanent = permanent


def configured_platforms(settings: Settings) -> list[str]:
    result = []
    if settings.meta_pixel_id and settings.meta_capi_access_token:
        result.append("meta")
    if settings.tiktok_pixel_id and settings.tiktok_events_api_access_token:
        result.append("tiktok")
    if settings.snap_pixel_id and settings.snap_capi_access_token:
        result.append("snap")
    return result


def _clean(value):
    if isinstance(value, dict):
        cleaned = {key: _clean(item) for key, item in value.items()}
        return {key: item for key, item in cleaned.items() if item not in (None, "", [], {})}
    if isinstance(value, list):
        return [_clean(item) for item in value]
    return value


def _event_time(order: Order) -> int:
    moment = order.finalized_at or order.created_at
    if moment.tzinfo is None:
        moment = moment.replace(tzinfo=timezone.utc)
    return int(moment.astimezone(timezone.utc).timestamp())


def _contents(order: Order) -> list[dict]:
    merged: dict[str, dict] = {}
    for item in order.items:
        entry = merged.setdefault(item.sku, {"quantity": 0, "total": 0})
        entry["quantity"] += item.quantity
        entry["total"] += item.line_total_mad
    return [
        {"id": sku, "quantity": data["quantity"], "price": round(data["total"] / data["quantity"], 2)}
        for sku, data in merged.items()
    ]


def _source_url(order: Order, settings: Settings) -> str:
    context = order.tracking_context or {}
    return context.get("source_url") or settings.site_public_url


def build_meta(order: Order, settings: Settings) -> tuple[str, dict, dict]:
    context = order.tracking_context or {}
    contents = _contents(order)
    event = {
        "event_name": META_EVENT,
        "event_time": _event_time(order),
        "event_id": order.id,
        "action_source": "website",
        "event_source_url": _source_url(order, settings),
        "user_data": {
            "ph": [meta_phone_hash(order.customer_phone)],
            "ct": [meta_city_hash(order.customer_city)],
            "country": [meta_country_hash("ma")],
            "client_ip_address": context.get("ip"),
            "client_user_agent": context.get("user_agent"),
            "fbp": context.get("fbp"),
            "fbc": context.get("fbc"),
        },
        "custom_data": {
            "currency": CURRENCY,
            "value": order.total_mad,
            "order_id": order.id,
            "content_type": "product",
            "content_ids": [entry["id"] for entry in contents],
            "contents": [
                {"id": entry["id"], "quantity": entry["quantity"], "item_price": entry["price"]}
                for entry in contents
            ],
            "num_items": sum(entry["quantity"] for entry in contents),
        },
    }
    body: dict = {"data": [_clean(event)]}
    if settings.meta_test_event_code:
        body["test_event_code"] = settings.meta_test_event_code
    url = f"https://graph.facebook.com/{settings.meta_graph_version}/{settings.meta_pixel_id}/events"
    return url, {"access_token": settings.meta_capi_access_token}, body


def build_tiktok(order: Order, settings: Settings) -> tuple[str, dict, dict, dict]:
    context = order.tracking_context or {}
    contents = _contents(order)
    event = {
        "event": TIKTOK_EVENT,
        "event_time": _event_time(order),
        "event_id": order.id,
        "user": {
            "phone": tiktok_phone_hash(order.customer_phone),
            "ttclid": context.get("ttclid"),
            "ttp": context.get("ttp"),
            "ip": context.get("ip"),
            "user_agent": context.get("user_agent"),
        },
        "page": {"url": _source_url(order, settings)},
        "properties": {
            "currency": CURRENCY,
            "value": order.total_mad,
            "content_type": "product",
            "order_id": order.id,
            "contents": [
                {
                    "content_id": entry["id"],
                    "content_type": "product",
                    "quantity": entry["quantity"],
                    "price": entry["price"],
                }
                for entry in contents
            ],
        },
    }
    body: dict = {
        "event_source": "web",
        "event_source_id": settings.tiktok_pixel_id,
        "data": [_clean(event)],
    }
    if settings.tiktok_test_event_code:
        body["test_event_code"] = settings.tiktok_test_event_code
    url = "https://business-api.tiktok.com/open_api/v1.3/event/track/"
    return url, {}, body, {"Access-Token": settings.tiktok_events_api_access_token}


def build_snap(order: Order, settings: Settings) -> tuple[str, dict, dict]:
    context = order.tracking_context or {}
    contents = _contents(order)
    event = {
        "event_name": SNAP_EVENT,
        "action_source": "WEB",
        "event_time": _event_time(order),
        "event_id": order.id,
        "event_source_url": _source_url(order, settings),
        "user_data": {
            "ph": [snap_phone_hash(order.customer_phone)],
            "client_ip_address": context.get("ip"),
            "client_user_agent": context.get("user_agent"),
            "sc_click_id": context.get("sc_click_id"),
            "sc_cookie1": context.get("sc_cookie1"),
        },
        "custom_data": {
            "currency": CURRENCY,
            "value": order.total_mad,
            "order_id": order.id,
            "content_ids": [entry["id"] for entry in contents],
            "num_items": sum(entry["quantity"] for entry in contents),
        },
    }
    suffix = "/events/validate" if settings.snap_capi_validate_only else "/events"
    url = f"https://tr.snapchat.com/v3/{settings.snap_pixel_id}{suffix}"
    return url, {"access_token": settings.snap_capi_access_token}, {"data": [_clean(event)]}


def send_conversion(platform: str, order: Order, settings: Settings) -> None:
    headers: dict = {"Content-Type": "application/json"}
    if platform == "meta":
        url, params, body = build_meta(order, settings)
    elif platform == "tiktok":
        url, params, body, extra = build_tiktok(order, settings)
        headers.update(extra)
    elif platform == "snap":
        url, params, body = build_snap(order, settings)
    else:
        raise TrackingSendError("unknown_platform", permanent=True)

    try:
        response = httpx.post(url, params=params, json=body, headers=headers, timeout=10.0)
    except httpx.HTTPError as error:
        raise TrackingSendError("network_error") from error

    if response.status_code >= 500 or response.status_code == 429:
        raise TrackingSendError(f"http_{response.status_code}")
    if response.status_code >= 400:
        raise TrackingSendError(f"http_{response.status_code}", permanent=True)

    if platform == "tiktok":
        try:
            code = response.json().get("code")
        except ValueError as error:
            raise TrackingSendError("invalid_response") from error
        if code != 0:
            raise TrackingSendError(f"tiktok_code_{code}", permanent=True)


def enqueue_conversions(db, order: Order, settings: Settings) -> None:
    from app.models import TrackingOutbox

    if not order.tracking_consent:
        order.tracking_context = None
        return
    platforms = configured_platforms(settings)
    if not platforms:
        order.tracking_context = None
        return
    for platform in platforms:
        db.add(TrackingOutbox(order_id=order.id, platform=platform, state="pending"))


def now_utc() -> datetime:
    return datetime.now(timezone.utc)
