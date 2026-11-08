import hashlib
import re


def sha256_hex(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def phone_digits(e164: str) -> str:
    """Country code + subscriber digits: no '+', spaces, or leading zeros."""
    return re.sub(r"\D", "", e164).lstrip("0")


def meta_phone_hash(e164: str) -> str:
    # Meta: remove symbols/letters/leading zeros, include country code.
    return sha256_hex(phone_digits(e164))


def snap_phone_hash(e164: str) -> str:
    # Snap: country code included, '+' and non-numeric characters removed.
    return sha256_hex(phone_digits(e164))


def tiktok_phone_hash(e164: str) -> str:
    # TikTok: E.164 with the leading '+'. Verify in Events Manager "Test events".
    return sha256_hex("+" + phone_digits(e164))


def meta_city_hash(city: str) -> str:
    cleaned = re.sub(r"[\W_]+", "", city.strip().lower())
    return sha256_hex(cleaned)


def meta_country_hash(country_code: str = "ma") -> str:
    return sha256_hex(country_code.strip().lower())
