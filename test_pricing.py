import pytest

from app.pricing import PRODUCTS, calculate_quote, price_for_quantity


@pytest.mark.parametrize(
    ("sku", "expected"),
    [
        ("vitality-gummies", [280, 499, 690, 970, 1189, 1380]),
        ("immunity-shield", [240, 440, 620, 860, 1060, 1240]),
        ("endurance-power", [350, 640, 690, 1040, 1330, 1380]),
    ],
)
def test_price_tiers_and_grouping(sku, expected):
    product = PRODUCTS[sku]
    assert [price_for_quantity(product, quantity) for quantity in range(1, 7)] == expected


def test_mixed_sku_quote_sums_each_product_tier():
    result = calculate_quote(
        [
            {"sku": "vitality-gummies", "quantity": 2},
            {"sku": "immunity-shield", "quantity": 3},
            {"sku": "endurance-power", "quantity": 1},
        ],
        delivery_fee_mad=30,
    )
    assert result["merchandise_total_mad"] == 499 + 620 + 350
    assert result["total_mad"] == 1499
    assert result["checkout_ready"] is True


def test_quote_is_not_orderable_without_delivery_fee():
    result = calculate_quote([{"sku": "immunity-shield", "quantity": 1}], None)
    assert result["merchandise_total_mad"] == 240
    assert result["total_mad"] is None
    assert result["checkout_ready"] is False


def test_unknown_product_is_rejected():
    with pytest.raises(ValueError, match="unknown_or_unavailable_product"):
        calculate_quote([{"sku": "missing", "quantity": 1}], 0)


def test_duplicate_cart_lines_are_aggregated_before_tier_calculation():
    result = calculate_quote(
        [
            {"sku": "immunity-shield", "quantity": 1},
            {"sku": "immunity-shield", "quantity": 1},
        ],
        delivery_fee_mad=0,
    )
    assert result["lines"][0]["quantity"] == 2
    assert result["merchandise_total_mad"] == 440
