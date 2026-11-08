from datetime import datetime, timezone
from types import SimpleNamespace

from app.settings import Settings
from app.tracking.capi import build_meta, build_snap, build_tiktok, configured_platforms
from app.tracking.hashing import (
    meta_city_hash,
    meta_phone_hash,
    sha256_hex,
    snap_phone_hash,
    tiktok_phone_hash,
)


def fake_order():
    return SimpleNamespace(
        id="3b1f7f0e-5d7a-4a3a-8a6e-1f0c5c0d9a11",
        customer_phone="+212612345678",
        customer_city="Casablanca",
        total_mad=299,
        finalized_at=datetime(2026, 1, 1, 12, 0, tzinfo=timezone.utc),
        created_at=datetime(2026, 1, 1, 11, 59, tzinfo=timezone.utc),
        tracking_context={"ip": "41.1.2.3", "user_agent": "UA", "fbp": "fb.1.1.2", "ttclid": "tt1", "sc_click_id": "sc1"},
        items=[
            SimpleNamespace(sku="immunity-shield", quantity=1, line_total_mad=240),
            SimpleNamespace(sku="vitality-gummies", quantity=1, line_total_mad=59),
        ],
    )


def settings(**overrides):
    base = dict(
        meta_pixel_id="111", meta_capi_access_token="m",
        tiktok_pixel_id="222", tiktok_events_api_access_token="t",
        snap_pixel_id="333", snap_capi_access_token="s",
    )
    base.update(overrides)
    return Settings(**base)


def test_meta_documented_phone_vector():
    # Example from Meta's customer information parameters documentation.
    assert meta_phone_hash("+1 (650) 555-1212") == "e323ec626319ca94ee8bff2e4c87cf613be6ea19919ed1364124e16807ab3176"


def test_phone_variants_per_platform():
    assert meta_phone_hash("+212612345678") == sha256_hex("212612345678")
    assert snap_phone_hash("+212612345678") == sha256_hex("212612345678")
    assert tiktok_phone_hash("+212612345678") == sha256_hex("+212612345678")
    assert meta_phone_hash("00212612345678") == sha256_hex("212612345678")


def test_city_normalization():
    assert meta_city_hash(" Casa Blanca! ") == sha256_hex("casablanca")


def test_no_raw_pii_in_payloads():
    order = fake_order()
    cfg = settings()
    for body in (build_meta(order, cfg)[2], build_tiktok(order, cfg)[2], build_snap(order, cfg)[2]):
        text = str(body)
        assert "612345678" not in text
        assert "Casablanca" not in text


def test_event_id_is_shared_for_deduplication():
    order = fake_order()
    cfg = settings()
    assert build_meta(order, cfg)[2]["data"][0]["event_id"] == order.id
    assert build_tiktok(order, cfg)[2]["data"][0]["event_id"] == order.id
    snap = build_snap(order, cfg)[2]["data"][0]
    assert snap["event_id"] == order.id and snap["custom_data"]["order_id"] == order.id


def test_event_names_match_browser_constants():
    order = fake_order()
    cfg = settings()
    assert build_meta(order, cfg)[2]["data"][0]["event_name"] == "Purchase"
    assert build_tiktok(order, cfg)[2]["data"][0]["event"] == "CompletePayment"
    assert build_snap(order, cfg)[2]["data"][0]["event_name"] == "PURCHASE"


def test_meta_payload_shape_and_test_code():
    order = fake_order()
    url, params, body = build_meta(order, settings(meta_test_event_code="TEST123"))
    assert url.endswith("/111/events")
    assert params == {"access_token": "m"}
    assert body["test_event_code"] == "TEST123"
    event = body["data"][0]
    assert event["action_source"] == "website"
    assert event["event_time"] == int(datetime(2026, 1, 1, 12, 0, tzinfo=timezone.utc).timestamp())
    assert event["custom_data"]["value"] == 299 and event["custom_data"]["currency"] == "MAD"
    assert event["custom_data"]["num_items"] == 2
    assert event["user_data"]["client_ip_address"] == "41.1.2.3"


def test_tiktok_uses_header_token_and_plus_phone():
    url, params, body, headers = build_tiktok(fake_order(), settings())
    assert headers == {"Access-Token": "t"}
    assert body["event_source"] == "web" and body["event_source_id"] == "222"
    assert body["data"][0]["user"]["phone"] == sha256_hex("+212612345678")


def test_snap_validate_endpoint_toggle():
    assert build_snap(fake_order(), settings())[0].endswith("/v3/333/events")
    assert build_snap(fake_order(), settings(snap_capi_validate_only=True))[0].endswith("/v3/333/events/validate")


def test_configured_platforms_requires_id_and_token():
    assert configured_platforms(settings()) == ["meta", "tiktok", "snap"]
    assert configured_platforms(settings(meta_capi_access_token="", snap_pixel_id="")) == ["tiktok"]
