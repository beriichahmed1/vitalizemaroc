"use client";

import { useEffect, useState, type FormEvent } from "react";
import { fetchOrderStatus, updateOrderContact, type OrderStatus } from "@/lib/api";
import { getProduct } from "@/lib/catalog";
import { normalizeMoroccanMobile } from "@/lib/phone";
import { formatMad } from "@/lib/pricing";
import { trackEvent } from "@/lib/tracking";

type Customer = { name: string; phone: string; city: string };
type State = { orderId?: string; total?: number; customer?: Customer; items?: OrderStatus["items"]; error?: string };

export default function ThankYouPage() {
  const [state, setState] = useState<State | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Customer>({ name: "", phone: "", city: "" });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    const phone = normalizeMoroccanMobile(draft.phone);
    if (draft.name.trim().length < 2 || draft.city.trim().length < 2) return setFormError("كتب الاسم والمدينة.");
    if (!phone) return setFormError("رقم الهاتف ماشي صحيح. دخل رقم مغربي كيبدا بـ 06 أو 07.");
    const token = window.sessionStorage.getItem("vitalize-order-token");
    if (!token || saving) return;
    setSaving(true);
    setFormError("");
    try {
      const order = await updateOrderContact(token, { name: draft.name.trim(), phone, city: draft.city.trim() });
      setState((current) => ({ ...current, customer: order.customer }));
      setEditing(false);
      setSaved(true);
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "وقع مشكل.");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const token = window.sessionStorage.getItem("vitalize-order-token");
    if (!token) {
      setState({ error: "ما لقيناش مرجع الطلب فهاد الجلسة." });
      return;
    }
    fetchOrderStatus(token)
      .then((order) => {
        if (order.status !== "submitted") throw new Error("الطلب مازال كيتعالج. حدّث الصفحة من بعد شوية.");
        setState({ orderId: order.order_id, total: order.total_mad, customer: order.customer, items: order.items });

        const firedKey = `vitalize-purchase-${order.order_id}`;
        if (window.sessionStorage.getItem(firedKey)) return;
        window.sessionStorage.setItem(firedKey, "1");
        const merged = new Map<string, { quantity: number; total: number }>();
        for (const item of order.items) {
          const entry = merged.get(item.sku) ?? { quantity: 0, total: 0 };
          merged.set(item.sku, { quantity: entry.quantity + item.quantity, total: entry.total + item.line_total_mad });
        }
        // Same id as the server-side event (the order id) so the platforms deduplicate the pair.
        trackEvent(
          "Purchase",
          {
            orderId: order.order_id,
            value: order.total_mad,
            items: [...merged].map(([sku, entry]) => ({
              sku,
              quantity: entry.quantity,
              price: Math.round((entry.total / entry.quantity) * 100) / 100,
            })),
          },
          order.order_id,
        );
      })
      .catch((cause: Error) => setState({ error: cause.message }));
  }, []);

  return (
    <main className="container section">
      <section className="panel thank-you">
        <div className="thank-badge">✓</div>
        <h1>شكراً على الطلب</h1>
        {state?.orderId ? (
          <>
            <p className="lead">توصلنا بطلبك. الأداء غادي يكون عند الاستلام.</p>
            <div className="call-note">📞 غادي نتصلو بيك قريباً لتأكيد الطلب. خلي هاتفك قريب.</div>

            <h2 className="mini-title">معلوماتك</h2>
            {editing ? (
              <form onSubmit={save} noValidate>
                <label className="form-field">الاسم الكامل
                  <input value={draft.name} maxLength={160} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                </label>
                <label className="form-field">رقم الهاتف
                  <input value={draft.phone} dir="ltr" type="tel" inputMode="tel" onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
                </label>
                <label className="form-field">المدينة
                  <input value={draft.city} maxLength={120} onChange={(e) => setDraft({ ...draft, city: e.target.value })} />
                </label>
                {formError && <p className="form-error" role="alert">{formError}</p>}
                <div className="actions">
                  <button className="button" disabled={saving}>{saving ? "كنسجلو..." : "حفظ التعديل"}</button>
                  <button type="button" className="button secondary" onClick={() => setEditing(false)}>إلغاء</button>
                </div>
              </form>
            ) : (
              state.customer && (
                <div className="info-card">
                  <div className="total-row"><span className="muted">الاسم</span><strong>{state.customer.name}</strong></div>
                  <div className="total-row"><span className="muted">الهاتف</span><strong dir="ltr">{state.customer.phone}</strong></div>
                  <div className="total-row"><span className="muted">المدينة</span><strong>{state.customer.city}</strong></div>
                  {saved && <p className="saving-row small">✓ تحدثات المعلومات.</p>}
                  <button
                    className="text-button"
                    onClick={() => {
                      setDraft(state.customer as Customer);
                      setFormError("");
                      setEditing(true);
                    }}
                  >
                    الرقم ماشي صحيح؟ عدّل المعلومات
                  </button>
                </div>
              )
            )}

            <h2 className="mini-title">ملخص الطلب</h2>
            <div className="info-card">
              {state.items?.map((item, index) => (
                <div className="total-row" key={`${item.sku}-${index}`}><span><strong dir="ltr">{getProduct(item.sku)?.nameFr ?? item.name}</strong> <small className="muted">· {item.quantity} {item.quantity > 1 ? "boîtes" : "boîte"}</small></span><strong>{formatMad(item.line_total_mad)}</strong></div>
              ))}
              <div className="total-row grand"><span>المجموع عند الاستلام</span><strong>{formatMad(state.total ?? null)}</strong></div>
            </div>
            <p className="muted small">مرجع الطلب: <strong dir="ltr">{state.orderId}</strong></p>
          </>
        ) : state?.error ? (
          <p role="alert">{state.error}</p>
        ) : (
          <p>كنتحققو من الطلب...</p>
        )}
      </section>
    </main>
  );
}
