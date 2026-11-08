import hashlib
import hmac
import re
import uuid

from fastapi import HTTPException

from app.settings import get_settings


_ASCII_DIGITS = {**{0x0660 + i: str(i) for i in range(10)}, **{0x06F0 + i: str(i) for i in range(10)}}


def normalize_moroccan_mobile(value: str) -> str:
    # Arabic keyboards produce Arabic-Indic digits; normalize them before matching ASCII-only patterns.
    compact = re.sub(r"[\s().-]", "", value.translate(_ASCII_DIGITS))
    if re.fullmatch(r"0[67][0-9]{8}", compact):
        return "+212" + compact[1:]
    if re.fullmatch(r"\+212[67][0-9]{8}", compact):
        return compact
    raise ValueError("invalid_moroccan_mobile")


def issue_order_token(order_id: str) -> str:
    secret = get_settings().order_token_secret.encode()
    signature = hmac.new(secret, order_id.encode(), hashlib.sha256).hexdigest()
    return order_id + "." + signature


def verify_order_token(token: str) -> str:
    try:
        order_id, supplied = token.split(".", 1)
        uuid.UUID(order_id)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=404, detail="order_not_found") from None
    expected = issue_order_token(order_id).split(".", 1)[1]
    if not hmac.compare_digest(supplied, expected):
        raise HTTPException(status_code=404, detail="order_not_found")
    return order_id


def request_digest(payload: dict) -> str:
    import json

    serialized = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(serialized.encode()).hexdigest()
