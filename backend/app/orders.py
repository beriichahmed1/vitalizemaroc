import ipaddress
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.db import SessionLocal
from app.models import Order, OrderEvent, OrderItem, WebhookOutbox
from app.pricing import PRODUCTS, calculate_quote
from app.schemas import ContactUpdateIn, OrderCreateIn, QuoteIn, UpsellDecisionIn
from app.security import issue_order_token, normalize_moroccan_mobile, request_digest, verify_order_token
from app.settings import get_settings
from app.tracking.capi import enqueue_conversions

router = APIRouter(prefix="/v1")

UPSELL_PRICE_MAD = 99
MAX_ORDERS_PER_PHONE_PER_HOUR = 5


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def aware(moment: datetime | None) -> datetime | None:
    if moment is not None and moment.tzinfo is None:
        return moment.replace(tzinfo=timezone.utc)
    return moment


def client_ip(request: Request) -> str | None:
    settings = get_settings()
    candidate = request.client.host if request.client else None
    forwarded = request.headers.get("x-forwarded-for", "")
    parts = [part.strip() for part in forwarded.split(",") if part.strip()]
    if settings.trusted_proxy_count and len(parts) >= settings.trusted_proxy_count:
        candidate = parts[-settings.trusted_proxy_count]
    try:
        return str(ipaddress.ip_address(candidate)) if candidate else None
    except ValueError:
        return None


def order_items_data(order: Order) -> list[dict]:
    return [
        {
            "sku": item.sku,
            "name": item.name_ar,
            "quantity": item.quantity,
            "unit_price_mad": item.unit_price_mad,
            "line_total_mad": item.line_total_mad,
            "item_kind": item.item_kind,
        }
        for item in order.items
    ]


def sheet_payload(order: Order) -> dict:
    return {
        "order_id": order.id,
        "created_at_utc": aware(order.created_at).astimezone(timezone.utc).isoformat(),
        "order_status": order.status,
        "customer": {
            "name": order.customer_name,
            "phone": order.customer_phone,
            "city": order.customer_city,
        },
        "currency": "MAD",
        "payment_method": "cash_on_delivery",
        "items": order_items_data(order),
        "regular_subtotal_mad": order.regular_subtotal_mad,
        "quantity_offer_savings_mad": order.quantity_offer_savings_mad,
        "post_form_offer_mad": order.post_form_offer_mad,
        "delivery_fee_mad": order.delivery_fee_mad,
        "total_mad": order.total_mad,
        "attribution": {"tracking_consent": order.tracking_consent},
    }


def finalize_order(db: Session, order: Order) -> None:
    if order.status == "submitted":
        return
    order.status = "submitted"
    order.finalized_at = datetime.now(timezone.utc)
    order.upsell_expires_at = None
    db.add(WebhookOutbox(order_id=order.id, payload=sheet_payload(order), state="pending"))
    enqueue_conversions(db, order, get_settings())


def public_order(order: Order) -> dict:
    return {
        "order_id": order.id,
        "status": order.status,
        "customer": {"name": order.customer_name, "phone": order.customer_phone, "city": order.customer_city},
        "items": order_items_data(order),
        "regular_subtotal_mad": order.regular_subtotal_mad,
        "quantity_offer_savings_mad": order.quantity_offer_savings_mad,
        "post_form_offer_mad": order.post_form_offer_mad,
        "delivery_fee_mad": order.delivery_fee_mad,
        "total_mad": order.total_mad,
        "currency": "MAD",
    }


def order_response(db: Session, order: Order) -> dict:
    db.refresh(order)
    result = {**public_order(order), "order_token": issue_order_token(order.id), "upsell": None}
    if order.status == "upsell_pending" and order.upsell_sku:
        product = PRODUCTS[order.upsell_sku]
        result["upsell"] = {
            "sku": product.sku,
            "name_ar": product.name_ar,
            "price_mad": UPSELL_PRICE_MAD,
            "expires_at": aware(order.upsell_expires_at).astimezone(timezone.utc).isoformat(),
        }
    return result


def load_order(db: Session, order_id: str, lock: bool = False) -> Order | None:
    query = select(Order).options(selectinload(Order.items)).where(Order.id == order_id)
    if lock:
        query = query.with_for_update()
    return db.scalar(query)


@router.get("/products")
def products():
    return {"products": [
        {
            "sku": product.sku,
            "slug": product.slug,
            "name_ar": product.name_ar,
            "name_en": product.name_en,
            "description_ar": product.description_ar,
            "unit_price_mad": product.unit_price_mad,
            "tiers_mad": list(product.tiers_mad),
        }
        for product in PRODUCTS.values()
        if product.active
    ]}


@router.post("/quotes")
def quote(body: QuoteIn):
    try:
        return calculate_quote([item.model_dump() for item in body.items], get_settings().delivery_fee_mad)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@router.post("/orders")
def create_order(body: OrderCreateIn, request: Request, db: Session = Depends(get_db)):
    settings = get_settings()
    if settings.delivery_fee_mad is None:
        raise HTTPException(status_code=503, detail="delivery_fee_not_configured")

    aggregated: dict[str, int] = {}
    for item in body.items:
        aggregated[item.sku] = aggregated.get(item.sku, 0) + item.quantity
        if aggregated[item.sku] > 99:
            raise HTTPException(status_code=422, detail="invalid_quantity")
    normalized_items = [{"sku": sku, "quantity": qty} for sku, qty in sorted(aggregated.items())]
    try:
        customer_phone = normalize_moroccan_mobile(body.customer.phone)
        quote_data = calculate_quote(normalized_items, settings.delivery_fee_mad)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error

    digest = request_digest({
        "items": normalized_items,
        "customer": {"name": body.customer.name, "phone": customer_phone, "city": body.customer.city},
    })
    existing = db.scalar(
        select(Order).options(selectinload(Order.items)).where(Order.idempotency_key == body.idempotency_key)
    )
    if existing:
        if existing.request_hash != digest:
            raise HTTPException(status_code=409, detail="idempotency_key_reused")
        return order_response(db, existing)

    recent = db.scalar(
        select(func.count()).select_from(Order).where(
            Order.customer_phone == customer_phone,
            Order.created_at >= datetime.now(timezone.utc) - timedelta(hours=1),
        )
    )
    if recent >= MAX_ORDERS_PER_PHONE_PER_HOUR:
        raise HTTPException(status_code=429, detail="too_many_orders")

    counts = {line["sku"]: line["quantity"] for line in normalized_items}
    lines = {line["sku"]: line for line in quote_data["lines"]}
    upsell_sku = None
    if "vitality-gummies" not in counts:
        upsell_sku = "vitality-gummies"
    elif "immunity-shield" not in counts:
        upsell_sku = "immunity-shield"

    consent = bool(body.tracking and body.tracking.consent)
    context = None
    if consent:
        context = body.tracking.model_dump(exclude={"consent"}, exclude_none=True)
        context["ip"] = client_ip(request)
        context["user_agent"] = (request.headers.get("user-agent") or "")[:500] or None

    now = datetime.now(timezone.utc)
    order = Order(
        id=str(uuid.uuid4()),
        idempotency_key=body.idempotency_key,
        request_hash=digest,
        status="upsell_pending" if upsell_sku else "pending",
        customer_name=body.customer.name,
        customer_phone=customer_phone,
        customer_city=body.customer.city,
        regular_subtotal_mad=quote_data["regular_subtotal_mad"],
        quantity_offer_savings_mad=quote_data["quantity_offer_savings_mad"],
        post_form_offer_mad=0,
        delivery_fee_mad=settings.delivery_fee_mad,
        total_mad=quote_data["total_mad"],
        upsell_sku=upsell_sku,
        upsell_expires_at=now + timedelta(seconds=settings.upsell_seconds) if upsell_sku else None,
        tracking_consent=consent,
        tracking_context=context,
        created_at=now,
    )
    for sku, quantity in counts.items():
        product = PRODUCTS[sku]
        order.items.append(OrderItem(
            sku=sku,
            name_ar=product.name_ar,
            quantity=quantity,
            unit_price_mad=product.unit_price_mad,
            line_total_mad=lines[sku]["offer_total_mad"],
            item_kind="regular",
        ))
    db.add(order)
    db.add(OrderEvent(order_id=order.id, event_type="order_created", event_data={}))
    if not upsell_sku:
        finalize_order(db, order)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        existing = db.scalar(
            select(Order).options(selectinload(Order.items)).where(Order.idempotency_key == body.idempotency_key)
        )
        if existing and existing.request_hash == digest:
            return order_response(db, existing)
        raise HTTPException(status_code=409, detail="order_conflict") from None
    return order_response(db, order)


@router.post("/orders/{token}/upsell")
def decide_upsell(token: str, body: UpsellDecisionIn, db: Session = Depends(get_db)):
    order = load_order(db, verify_order_token(token), lock=True)
    if not order:
        raise HTTPException(status_code=404, detail="order_not_found")
    if order.status == "submitted":
        return public_order(order)

    expires = aware(order.upsell_expires_at)
    if not expires or datetime.now(timezone.utc) >= expires:
        finalize_order(db, order)
        db.commit()
        return public_order(order)

    if body.decision == "accept":
        product = PRODUCTS[order.upsell_sku]
        order.items.append(OrderItem(
            sku=product.sku,
            name_ar=product.name_ar,
            quantity=1,
            unit_price_mad=UPSELL_PRICE_MAD,
            line_total_mad=UPSELL_PRICE_MAD,
            item_kind="post_form_offer",
        ))
        order.post_form_offer_mad = UPSELL_PRICE_MAD
        order.total_mad += UPSELL_PRICE_MAD
        db.add(OrderEvent(order_id=order.id, event_type="upsell_accepted", event_data={"sku": product.sku}))
    else:
        db.add(OrderEvent(order_id=order.id, event_type="upsell_declined", event_data={}))
    finalize_order(db, order)
    db.commit()
    return public_order(order)


@router.post("/orders/{token}/contact")
def update_contact(token: str, body: ContactUpdateIn, db: Session = Depends(get_db)):
    order = load_order(db, verify_order_token(token), lock=True)
    if not order:
        raise HTTPException(status_code=404, detail="order_not_found")
    try:
        phone = normalize_moroccan_mobile(body.phone)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error

    order.customer_name = body.name
    order.customer_phone = phone
    order.customer_city = body.city
    db.add(OrderEvent(order_id=order.id, event_type="contact_updated", event_data={}))
    if order.status == "submitted":
        payload = {**sheet_payload(order), "order_status": "contact_updated"}
        outbox = db.scalar(select(WebhookOutbox).where(WebhookOutbox.order_id == order.id))
        if outbox:
            outbox.payload = payload
            outbox.state = "pending"
            outbox.attempts = 0
            outbox.next_attempt_at = datetime.now(timezone.utc)
            outbox.last_error_code = None
            outbox.delivered_at = None
        else:
            db.add(WebhookOutbox(order_id=order.id, payload=payload, state="pending"))
    db.commit()
    return public_order(order)


@router.get("/orders/{token}/status")
def order_status(token: str, db: Session = Depends(get_db)):
    order = load_order(db, verify_order_token(token))
    if not order:
        raise HTTPException(status_code=404, detail="order_not_found")
    return public_order(order)
