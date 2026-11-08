import re

from pydantic import BaseModel, Field, field_validator

TOKEN_PATTERN = r"[A-Za-z0-9._\-~%=:+/]+"


class CartLineIn(BaseModel):
    sku: str = Field(min_length=1, max_length=80)
    quantity: int = Field(ge=1, le=99)


class QuoteIn(BaseModel):
    items: list[CartLineIn] = Field(min_length=1, max_length=30)


class CustomerIn(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    phone: str = Field(min_length=9, max_length=20)
    city: str = Field(min_length=2, max_length=120)

    @field_validator("name", "city")
    @classmethod
    def trim_required_text(cls, value: str) -> str:
        cleaned = value.strip()
        if len(cleaned) < 2:
            raise ValueError("must_contain_at_least_two_non_space_characters")
        return cleaned


class TrackingIn(BaseModel):
    """Attribution hints are best-effort: malformed values are dropped instead of blocking the order."""

    consent: bool = False
    source_url: str | None = None
    fbp: str | None = None
    fbc: str | None = None
    ttp: str | None = None
    ttclid: str | None = None
    sc_cookie1: str | None = None
    sc_click_id: str | None = None

    @field_validator("fbp", "fbc", "ttp", "ttclid", "sc_cookie1", "sc_click_id", mode="before")
    @classmethod
    def keep_only_safe_tokens(cls, value):
        if isinstance(value, str) and len(value) <= 300 and re.fullmatch(TOKEN_PATTERN, value):
            return value
        return None

    @field_validator("source_url", mode="before")
    @classmethod
    def keep_only_http_urls(cls, value):
        if isinstance(value, str) and len(value) <= 500 and value.startswith(("https://", "http://")):
            return value
        return None


class OrderCreateIn(BaseModel):
    idempotency_key: str = Field(min_length=16, max_length=128)
    items: list[CartLineIn] = Field(min_length=1, max_length=30)
    customer: CustomerIn
    tracking: TrackingIn | None = None


class ContactUpdateIn(CustomerIn):
    pass


class UpsellDecisionIn(BaseModel):
    decision: str = Field(pattern="^(accept|decline)$")
