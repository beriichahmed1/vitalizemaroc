import asyncio
import base64
import hashlib
import hmac
import json
import logging
from datetime import datetime, timedelta, timezone

import httpx
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db import SessionLocal
from app.models import Order, TrackingOutbox, WebhookOutbox
from app.orders import finalize_order
from app.settings import get_settings
from app.tracking.capi import TrackingSendError, send_conversion

logger = logging.getLogger("vitalize.worker")
MAX_ATTEMPTS = 12


def backoff(attempts: int) -> datetime:
    return datetime.now(timezone.utc) + timedelta(seconds=min(30 * (2 ** min(attempts, 8)), 21600))


def finalize_expired_orders() -> int:
    now = datetime.now(timezone.utc)
    count = 0
    with SessionLocal() as db:
        orders = db.scalars(
            select(Order)
            .options(selectinload(Order.items))
            .where(Order.status == "upsell_pending", Order.upsell_expires_at <= now)
            .with_for_update(skip_locked=True)
            .limit(50)
        ).all()
        for order in orders:
            finalize_order(db, order)
            count += 1
        db.commit()
    return count


def deliver_one_sheet() -> bool:
    settings = get_settings()
    if not settings.google_sheets_webhook_url or not settings.google_sheets_hmac_secret:
        return False

    with SessionLocal() as db:
        event = db.scalar(
            select(WebhookOutbox)
            .where(WebhookOutbox.state == "pending", WebhookOutbox.next_attempt_at <= datetime.now(timezone.utc))
            .order_by(WebhookOutbox.id)
            .with_for_update(skip_locked=True)
            .limit(1)
        )
        if not event:
            return False
        event_id, payload, order_id = event.id, event.payload, event.order_id
        event.attempts += 1
        # Push the next attempt out so a crash mid-request cannot cause a hot retry loop.
        event.next_attempt_at = backoff(event.attempts)
        db.commit()

    raw_payload = json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    signature = hmac.new(settings.google_sheets_hmac_secret.encode("utf-8"), raw_payload, hashlib.sha256).hexdigest()
    envelope = {"payload_b64": base64.b64encode(raw_payload).decode("ascii"), "signature_hex": signature}

    try:
        response = httpx.post(settings.google_sheets_webhook_url, json=envelope, timeout=20.0, follow_redirects=True)
        response.raise_for_status()
        result = response.json()
        if not isinstance(result, dict) or result.get("ok") is not True or result.get("order_id") != order_id:
            raise ValueError("webhook_rejected")
    except (httpx.HTTPError, ValueError):
        with SessionLocal() as db:
            event = db.get(WebhookOutbox, event_id)
            if event:
                event.state = "pending" if event.attempts < MAX_ATTEMPTS else "failed"
                event.last_error_code = "webhook_delivery_failed"
                db.commit()
        return False

    with SessionLocal() as db:
        event = db.get(WebhookOutbox, event_id)
        if event:
            event.state = "delivered"
            event.delivered_at = datetime.now(timezone.utc)
            event.last_error_code = None
            db.commit()
    return True


def scrub_tracking_context_if_done(db, order_id: str) -> None:
    open_rows = db.scalar(
        select(TrackingOutbox.id).where(TrackingOutbox.order_id == order_id, TrackingOutbox.state == "pending").limit(1)
    )
    if open_rows is None:
        order = db.get(Order, order_id)
        if order is not None:
            order.tracking_context = None


def deliver_one_tracking() -> bool:
    settings = get_settings()
    with SessionLocal() as db:
        row = db.scalar(
            select(TrackingOutbox)
            .where(TrackingOutbox.state == "pending", TrackingOutbox.next_attempt_at <= datetime.now(timezone.utc))
            .order_by(TrackingOutbox.id)
            .with_for_update(skip_locked=True)
            .limit(1)
        )
        if not row:
            return False
        row_id, platform, order_id = row.id, row.platform, row.order_id
        row.attempts += 1
        row.next_attempt_at = backoff(row.attempts)
        db.commit()

    error_code = None
    permanent = False
    with SessionLocal() as db:
        order = db.scalar(select(Order).options(selectinload(Order.items)).where(Order.id == order_id))
        if order is None:
            error_code, permanent = "order_missing", True
        else:
            try:
                send_conversion(platform, order, settings)
            except TrackingSendError as error:
                error_code, permanent = error.code, error.permanent

    with SessionLocal() as db:
        row = db.get(TrackingOutbox, row_id)
        if row:
            if error_code is None:
                row.state, row.delivered_at, row.last_error_code = "delivered", datetime.now(timezone.utc), None
            else:
                row.last_error_code = error_code[:80]
                row.state = "failed" if permanent or row.attempts >= MAX_ATTEMPTS else "pending"
            db.flush()
            scrub_tracking_context_if_done(db, order_id)
            db.commit()
    return error_code is None


async def run() -> None:
    while True:
        for task in (finalize_expired_orders, deliver_one_sheet, deliver_one_tracking):
            try:
                await asyncio.to_thread(task)
            except Exception as error:  # keep the loop alive; never log row data
                logger.error("worker_task_failed task=%s error=%s", task.__name__, type(error).__name__)
        await asyncio.sleep(2)


if __name__ == "__main__":
    logging.basicConfig(level=get_settings().log_level)
    asyncio.run(run())
