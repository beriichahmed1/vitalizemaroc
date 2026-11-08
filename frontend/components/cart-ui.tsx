"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import type { CartLine, Quote } from "@/lib/api";
import { getProduct, products } from "@/lib/catalog";
import { formatMad } from "@/lib/pricing";
import { normalizeMoroccanMobile } from "@/lib/phone";
import { useDialog } from "@/components/use-dialog";
import type { CustomerInput, Upsell } from "@/components/store-provider";

const CITIES = [
  "الدار البيضاء", "الرباط", "مراكش", "فاس", "طنجة", "أكادير", "مكناس", "وجدة", "القنيطرة", "تطوان",
  "سلا", "تمارة", "المحمدية", "الجديدة", "بني ملال", "الناظور", "تازة", "خريبكة", "سطات", "العيون",
  "آسفي", "الصويرة", "العرائش", "برشيد", "الخميسات", "الحسيمة", "تيزنيت", "ورزازات",
];

type Props = {
  lines: CartLine[];
  quote: Quote | null;
  quoteLoading: boolean;
  quoteError: string;
  cartOpen: boolean;
  checkoutOpen: boolean;
  submitting: boolean;
  deciding: boolean;
  error: string;
  upsell: Upsell | null;
  secondsLeft: number;
  onCloseCart: () => void;
  onOpenCheckout: () => void;
  onCloseCheckout: () => void;
  onSubmit: (customer: CustomerInput) => void;
  onDecision: (decision: "accept" | "decline") => void;
  onAdd: (sku: string, quantity: number) => void;
  onSetQuantity: (sku: string, quantity: number) => void;
  onRemove: (sku: string) => void;
};

export function CartUI(props: Props) {
  return (
    <>
      {props.cartOpen && <CartDrawer {...props} />}
      {props.checkoutOpen && <CheckoutDialog {...props} />}
      {props.upsell && <UpsellDialog {...props} upsell={props.upsell} />}
    </>
  );
}

function CartDrawer(props: Props) {
  const active = props.cartOpen && !props.checkoutOpen && !props.upsell;
  const ref = useDialog<HTMLElement>(active, props.onCloseCart);
  const { quote } = props;
  const inCart = new Set(props.lines.map((line) => line.sku));
  const crossSells = products.filter((product) => !inCart.has(product.sku));
  const count = props.lines.reduce((sum, line) => sum + line.quantity, 0);
  const canCheckout = Boolean(quote?.checkout_ready) && !props.quoteLoading && !props.quoteError;

  return (
    <div className="overlay" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) props.onCloseCart();
    }}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="cart-title" ref={ref} tabIndex={-1}>
        <div className="drawer-head">
          <h2 id="cart-title">السلة ({count})</h2>
          <button className="icon-button" onClick={props.onCloseCart} aria-label="إغلاق السلة">×</button>
        </div>

        {!props.lines.length ? (
          <p className="muted">السلة خاوية دابا.</p>
        ) : (
          <>
            {props.lines.map((line) => {
              const product = getProduct(line.sku);
              const row = quote?.lines.find((item) => item.sku === line.sku);
              if (!product) return null;
              return (
                <div className="line-item" key={line.sku}>
                  <div>
                    <strong>{product.nameAr}</strong>
                    <div className="price small">{row ? formatMad(row.offer_total_mad) : "..."}</div>
                    {row && row.savings_mad > 0 && <div className="saving-chip">وفرتي {formatMad(row.savings_mad)}</div>}
                    <button className="text-button" onClick={() => props.onRemove(line.sku)}>حيد المنتج</button>
                  </div>
                  <div className="qty-controls">
                    <button onClick={() => props.onSetQuantity(line.sku, line.quantity - 1)} aria-label="نقص الكمية">−</button>
                    <span aria-live="polite">{line.quantity}</span>
                    <button onClick={() => props.onSetQuantity(line.sku, line.quantity + 1)} aria-label="زيد الكمية">+</button>
                  </div>
                </div>
              );
            })}

            {crossSells.length > 0 && (
              <section className="cross-sells" aria-labelledby="cross-title">
                <h3 id="cross-title">كمّل الروتين ديالك</h3>
                <p className="muted small">إضافة منتج كتبدل مجموع العرض؛ الثمن النهائي كيتحسب ف السلة.</p>
                {crossSells.map((product) => (
                  <div className="cross-item" key={product.sku}>
                    <div>
                      <strong>{product.nameAr}</strong>
                      <div className="muted small">{formatMad(product.unitPrice)}</div>
                    </div>
                    <button className="button secondary" onClick={() => props.onAdd(product.sku, 1)}>زيد</button>
                  </div>
                ))}
              </section>
            )}

            <div className="totals">
              {quote && quote.quantity_offer_savings_mad > 0 && (
                <div className="total-row saving-row"><span>مجموع التوفير</span><strong>{formatMad(quote.quantity_offer_savings_mad)}</strong></div>
              )}
              <div className="total-row"><span>مجموع المنتجات</span><strong>{formatMad(quote?.merchandise_total_mad ?? null)}</strong></div>
              <div className="total-row"><span>التوصيل</span><strong>{quote?.delivery_fee_mad == null ? "كيتم التأكيد" : quote.delivery_fee_mad === 0 ? "مجاني" : formatMad(quote.delivery_fee_mad)}</strong></div>
              <div className="total-row grand"><span>المجموع</span><strong>{formatMad(quote?.total_mad ?? null)}</strong></div>
            </div>
            <div className="notice">الدفع نقداً عند الاستلام. ما كتخلص والو دابا.</div>
            {props.quoteError && <p className="form-error" role="alert">{props.quoteError}</p>}
            <button className="button full cta" disabled={!canCheckout} onClick={props.onOpenCheckout}>
              {props.quoteLoading ? "كنحسبو الثمن..." : quote && !quote.checkout_ready ? "الطلب غير متاح مؤقتاً" : "كمل الطلب"}
            </button>
          </>
        )}
      </aside>
    </div>
  );
}

type Errors = Partial<Record<"name" | "phone" | "city", string>>;

function validate(values: CustomerInput): Errors {
  const errors: Errors = {};
  if (values.name.trim().length < 2) errors.name = "كتب الاسم الكامل.";
  if (!normalizeMoroccanMobile(values.phone)) errors.phone = "رقم الهاتف ماشي صحيح. دخل رقم مغربي كيبدا بـ 06 أو 07.";
  if (values.city.trim().length < 2) errors.city = "كتب المدينة.";
  return errors;
}

function CheckoutDialog(props: Props) {
  const active = props.checkoutOpen && !props.upsell;
  const ref = useDialog<HTMLElement>(active, props.onCloseCheckout);
  const [values, setValues] = useState<CustomerInput>({ name: "", phone: "", city: "" });
  const [errors, setErrors] = useState<Errors>({});
  const rows = props.quote?.lines ?? [];

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (props.submitting) return;
    const found = validate(values);
    setErrors(found);
    const first = (["name", "phone", "city"] as const).find((field) => found[field]);
    if (first) {
      (event.currentTarget.elements.namedItem(first) as HTMLElement | null)?.focus();
      return;
    }
    props.onSubmit({
      name: values.name.trim(),
      phone: normalizeMoroccanMobile(values.phone) ?? values.phone,
      city: values.city.trim(),
    });
  };

  const field = (name: keyof CustomerInput) => ({
    name,
    value: values[name],
    "aria-invalid": Boolean(errors[name]),
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
    onChange: (event: { target: { value: string } }) => {
      setValues((current) => ({ ...current, [name]: event.target.value }));
      if (errors[name]) setErrors((current) => ({ ...current, [name]: undefined }));
    },
  });

  return (
    <div className="overlay center" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) props.onCloseCheckout();
    }}>
      <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="checkout-title" ref={ref} tabIndex={-1}>
        <div className="drawer-head">
          <h2 id="checkout-title">أكمل الطلب فـ 3 معلومات</h2>
          <button className="icon-button" onClick={props.onCloseCheckout} aria-label="إغلاق">×</button>
        </div>
        <div className="panel summary">
          {rows.map((row) => (
            <div className="total-row" key={row.sku}><span>{getProduct(row.sku)?.nameAr ?? row.name_ar} × {row.quantity}</span><strong>{formatMad(row.offer_total_mad)}</strong></div>
          ))}
          {props.quote && props.quote.quantity_offer_savings_mad > 0 && (
            <div className="total-row saving-row"><span>مجموع التوفير</span><strong>{formatMad(props.quote.quantity_offer_savings_mad)}</strong></div>
          )}
          <div className="total-row"><span>التوصيل</span><strong>{props.quote?.delivery_fee_mad === 0 ? "مجاني" : formatMad(props.quote?.delivery_fee_mad ?? null)}</strong></div>
          <div className="total-row grand"><span>المجموع عند الاستلام</span><strong>{formatMad(props.quote?.total_mad ?? null)}</strong></div>
        </div>

        <form onSubmit={submit} noValidate>
          <label className="form-field">الاسم الكامل
            <input {...field("name")} required maxLength={160} autoComplete="name" enterKeyHint="next" />
            <span className="form-error" id="name-error" role="alert">{errors.name}</span>
          </label>
          <label className="form-field">رقم الهاتف
            <input {...field("phone")} required type="tel" dir="ltr" inputMode="tel" autoComplete="tel" placeholder="06 12 34 56 78" enterKeyHint="next" />
            <span className="form-error" id="phone-error" role="alert">{errors.phone}</span>
          </label>
          <label className="form-field">المدينة
            <input {...field("city")} required maxLength={120} list="ma-cities" autoComplete="address-level2" enterKeyHint="done" />
            <datalist id="ma-cities">{CITIES.map((city) => <option key={city} value={city} />)}</datalist>
            <span className="form-error" id="city-error" role="alert">{errors.city}</span>
          </label>
          {props.error && <p className="form-error" role="alert">{props.error}</p>}
          <button className="button full cta" disabled={props.submitting || !props.quote?.checkout_ready}>
            {props.submitting ? "كنسجلو الطلب..." : `أكد الطلب — ${formatMad(props.quote?.total_mad ?? null)}`}
          </button>
          <p className="muted small center-text">الدفع نقداً عند الاستلام. المعلومات كتستعمل غير لمعالجة الطلب والتوصيل. <Link href="/policies/privacy" target="_blank">سياسة الخصوصية</Link></p>
        </form>
      </section>
    </div>
  );
}

function UpsellDialog(props: Props & { upsell: Upsell }) {
  const ref = useDialog<HTMLElement>(true, () => props.onDecision("decline"));
  const [total] = useState(() => Math.max(1, props.secondsLeft));
  const progress = Math.min(100, Math.max(0, (props.secondsLeft / total) * 100));
  const product = getProduct(props.upsell.sku);

  return (
    <div className="overlay center">
      <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="upsell-title" ref={ref} tabIndex={-1}>
        <p className="muted small">طلبك تسجل ✓ — عرض اختياري قبل ما نكملو</p>
        <div className="countdown" aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>
        <p className="muted small" role="timer">باقي {props.secondsLeft} ثانية</p>
        <h2 id="upsell-title">زيد {product?.nameEn ?? "منتج"} بـ {formatMad(props.upsell.price_mad)} فقط</h2>
        <p>{props.upsell.name_ar}</p>
        <p className="muted small">الثمن العادي {product ? formatMad(product.unitPrice) : ""}. هاد العرض كيتزاد لنفس الطلب، والدفع عند الاستلام.</p>
        {props.error && <p className="form-error" role="alert">{props.error}</p>}
        <button className="button full cta" disabled={props.deciding || props.secondsLeft <= 0} onClick={() => props.onDecision("accept")}>
          نعم، زيدو للطلب — {formatMad(props.upsell.price_mad)}
        </button>
        <button className="button secondary full" disabled={props.deciding} onClick={() => props.onDecision("decline")}>
          {props.error ? "عاود المحاولة" : "لا شكراً، كمل الطلب"}
        </button>
      </section>
    </div>
  );
}
