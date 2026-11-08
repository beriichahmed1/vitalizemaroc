from sqlalchemy import select

from app.db import SessionLocal
from app.models import Order, TrackingOutbox, WebhookOutbox
from app.settings import get_settings
from app.worker import finalize_expired_orders


def payload(sku="immunity-shield", quantity=1, phone="0612345678", key="k" * 20, consent=False):
    body = {
        "idempotency_key": key,
        "items": [{"sku": sku, "quantity": quantity}],
        "customer": {"name": "Test Customer", "phone": phone, "city": "Casablanca"},
    }
    if consent:
        body["tracking"] = {"consent": True, "fbp": "fb.1.1.2", "source_url": "https://vitalizemaroc.shop/products/x"}
    return body


def test_quote_is_authoritative(client):
    response = client.post("/v1/quotes", json={"items": [{"sku": "endurance-power", "quantity": 3}]})
    assert response.status_code == 200
    assert response.json()["merchandise_total_mad"] == 690
    assert response.json()["total_mad"] == 720


def test_order_with_upsell_accept_adds_exactly_one_99_line(client):
    created = client.post("/v1/orders", json=payload()).json()
    assert created["status"] == "upsell_pending"
    assert created["upsell"]["price_mad"] == 99
    assert created["total_mad"] == 240 + 30

    token = created["order_token"]
    accepted = client.post(f"/v1/orders/{token}/upsell", json={"decision": "accept"}).json()
    assert accepted["status"] == "submitted"
    assert accepted["total_mad"] == 240 + 30 + 99
    assert sum(1 for i in accepted["items"] if i["item_kind"] == "post_form_offer") == 1

    again = client.post(f"/v1/orders/{token}/upsell", json={"decision": "accept"}).json()
    assert again["total_mad"] == accepted["total_mad"]

    with SessionLocal() as db:
        assert len(db.scalars(select(WebhookOutbox)).all()) == 1


def test_decline_keeps_base_order(client):
    created = client.post("/v1/orders", json=payload()).json()
    declined = client.post(f"/v1/orders/{created['order_token']}/upsell", json={"decision": "decline"}).json()
    assert declined["status"] == "submitted"
    assert declined["post_form_offer_mad"] == 0
    assert declined["total_mad"] == 270


def test_order_without_eligible_upsell_is_submitted_with_outbox(client):
    body = payload()
    body["items"] = [
        {"sku": "vitality-gummies", "quantity": 1},
        {"sku": "immunity-shield", "quantity": 1},
    ]
    created = client.post("/v1/orders", json=body).json()
    assert created["status"] == "submitted"
    assert created["upsell"] is None
    with SessionLocal() as db:
        order = db.scalar(select(Order))
        assert order.finalized_at is not None
        assert len(db.scalars(select(WebhookOutbox)).all()) == 1


def test_idempotent_replay_returns_same_order(client):
    first = client.post("/v1/orders", json=payload()).json()
    second = client.post("/v1/orders", json=payload()).json()
    assert first["order_id"] == second["order_id"]
    changed = client.post("/v1/orders", json=payload(quantity=2))
    assert changed.status_code == 409


def test_invalid_phone_is_rejected(client):
    response = client.post("/v1/orders", json=payload(phone="0512345678"))
    assert response.status_code == 422
    assert response.json()["detail"] == "invalid_moroccan_mobile"


def test_phone_rate_limit(client):
    for index in range(5):
        assert client.post("/v1/orders", json=payload(key=f"key-number-{index:02d}-abcdef")).status_code == 200
    blocked = client.post("/v1/orders", json=payload(key="key-number-99-abcdef"))
    assert blocked.status_code == 429


def test_expired_upsell_is_finalized_by_worker(client):
    created = client.post("/v1/orders", json=payload()).json()
    with SessionLocal() as db:
        from datetime import datetime, timedelta, timezone

        order = db.scalar(select(Order))
        order.upsell_expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
        db.commit()
    assert finalize_expired_orders() == 1
    status = client.get(f"/v1/orders/{created['order_token']}/status").json()
    assert status["status"] == "submitted"
    assert status["total_mad"] == 270


def test_tampered_token_is_not_found(client):
    created = client.post("/v1/orders", json=payload()).json()
    response = client.get(f"/v1/orders/{created['order_token']}x/status")
    assert response.status_code == 404


def test_tracking_rows_only_created_with_consent_and_credentials(client, monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "meta_pixel_id", "123")
    monkeypatch.setattr(settings, "meta_capi_access_token", "token")

    body = payload(consent=False)
    body["items"] = [{"sku": "vitality-gummies", "quantity": 1}, {"sku": "immunity-shield", "quantity": 1}]
    client.post("/v1/orders", json=body)
    with SessionLocal() as db:
        assert db.scalars(select(TrackingOutbox)).all() == []

    body = payload(consent=True, key="consented-key-0000001")
    body["items"] = [{"sku": "vitality-gummies", "quantity": 1}, {"sku": "immunity-shield", "quantity": 1}]
    client.post("/v1/orders", json=body)
    with SessionLocal() as db:
        rows = db.scalars(select(TrackingOutbox)).all()
        assert [row.platform for row in rows] == ["meta"]
        order = db.scalar(select(Order).where(Order.tracking_consent.is_(True)))
        assert order.tracking_context["fbp"] == "fb.1.1.2"
