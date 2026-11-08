from dataclasses import dataclass


@dataclass(frozen=True)
class Product:
    sku: str
    slug: str
    name_ar: str
    name_en: str
    description_ar: str
    unit_price_mad: int
    tiers_mad: tuple[int, int, int]
    active: bool = True


PRODUCTS: dict[str, Product] = {
    "vitality-gummies": Product(
        sku="vitality-gummies",
        slug="vitality-gummies",
        name_ar="فيتاليتي غوميز – علكات الطاقة والتركيز",
        name_en="Vitality Gummies",
        description_ar="علكات الطاقة والتركيز. راجع ملصق المنتج لمعرفة المكونات وطريقة الاستعمال.",
        unit_price_mad=280,
        tiers_mad=(280, 499, 690),
    ),
    "immunity-shield": Product(
        sku="immunity-shield",
        slug="immunity-shield",
        name_ar="إيمونيتي شيلد – درع المناعة",
        name_en="Immunity Shield",
        description_ar="منتج فيه فيتامين C وسبيرولينا حسب المعلومات المتوفرة؛ تحقق من الملصق قبل الاستعمال.",
        unit_price_mad=240,
        tiers_mad=(240, 440, 620),
    ),
    "endurance-power": Product(
        sku="endurance-power",
        slug="endurance-power",
        name_ar="إندورانس باور – مسحوق الطاقة والبروتين",
        name_en="Endurance Power",
        description_ar="مسحوق للطاقة والرياضة والتحمل حسب وصف المنتج؛ تحقق من الملصق للمكونات وطريقة الاستعمال.",
        unit_price_mad=350,
        tiers_mad=(350, 640, 690),
    ),
}


def product_public_data(product: Product) -> dict:
    return {
        "sku": product.sku,
        "slug": product.slug,
        "name_ar": product.name_ar,
        "name_en": product.name_en,
        "description_ar": product.description_ar,
        "unit_price_mad": product.unit_price_mad,
        "tiers_mad": list(product.tiers_mad),
        "active": product.active,
    }


def price_for_quantity(product: Product, quantity: int) -> int:
    if quantity < 1:
        raise ValueError("quantity_must_be_positive")
    groups, remainder = divmod(quantity, 3)
    remainder_price = 0 if remainder == 0 else product.tiers_mad[remainder - 1]
    return groups * product.tiers_mad[2] + remainder_price


def calculate_quote(items: list[dict], delivery_fee_mad: int | None) -> dict:
    quantities: dict[str, int] = {}
    for item in items:
        sku = item["sku"]
        quantity = item["quantity"]
        if sku not in PRODUCTS or not PRODUCTS[sku].active:
            raise ValueError("unknown_or_unavailable_product")
        if quantity < 1 or quantity > 99:
            raise ValueError("invalid_quantity")
        quantities[sku] = quantities.get(sku, 0) + quantity
        if quantities[sku] > 99:
            raise ValueError("invalid_quantity")

    lines = []
    regular_subtotal = 0
    merchandise_total = 0
    for sku, quantity in quantities.items():
        product = PRODUCTS[sku]
        regular_line_total = product.unit_price_mad * quantity
        offer_total = price_for_quantity(product, quantity)
        regular_subtotal += regular_line_total
        merchandise_total += offer_total
        lines.append(
            {
                "sku": sku,
                "name_ar": product.name_ar,
                "quantity": quantity,
                "unit_price_mad": product.unit_price_mad,
                "regular_subtotal_mad": regular_line_total,
                "offer_total_mad": offer_total,
                "savings_mad": max(regular_line_total - offer_total, 0),
            }
        )

    savings = max(regular_subtotal - merchandise_total, 0)
    total = None if delivery_fee_mad is None else merchandise_total + delivery_fee_mad
    return {
        "currency": "MAD",
        "lines": lines,
        "regular_subtotal_mad": regular_subtotal,
        "quantity_offer_savings_mad": savings,
        "merchandise_total_mad": merchandise_total,
        "delivery_fee_mad": delivery_fee_mad,
        "total_mad": total,
        "checkout_ready": delivery_fee_mad is not None,
    }
