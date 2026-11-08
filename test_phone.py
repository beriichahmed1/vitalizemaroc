import pytest

from app.security import normalize_moroccan_mobile


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("0612345678", "+212612345678"),
        ("07 12 34 56 78", "+212712345678"),
        ("+212 612345678", "+212612345678"),
        ("+212-712-345-678", "+212712345678"),
    ],
)
def test_normalizes_moroccan_mobile(raw, expected):
    assert normalize_moroccan_mobile(raw) == expected


@pytest.mark.parametrize("raw", ["0512345678", "061234567", "+33123456789", "06ABC45678"])
def test_rejects_invalid_mobile(raw):
    with pytest.raises(ValueError, match="invalid_moroccan_mobile"):
        normalize_moroccan_mobile(raw)


def test_arabic_indic_digits_are_normalized_to_ascii():
    assert normalize_moroccan_mobile("٠٦١٢٣٤٥٦٧٨") == "+212612345678"
    assert normalize_moroccan_mobile("۰۷۱۲۳۴۵۶۷۸") == "+212712345678"
