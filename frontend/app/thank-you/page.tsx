"use client";

import { useEffect, useState } from "react";
import { fetchOrderStatus } from "@/lib/api";
import { formatMad } from "@/lib/pricing";
import { trackEvent } from "@/lib/tracking";

type State = { orderId?: string; total?: number; error?: string };

export default function ThankYouPage() {
  const [state, setState] = useState<State | null>(null);

  useEffect(() => {
    const token = window.sessionStorage.getItem("vitalize-order-token");
    if (!token) {
      setState({ error: "ما لقيناش مرجع الطلب فهاد الجلسة." });
      return;
    }
    fetchOrderStatus(token)
      .then((order) => {
        if (order.status !== "submitted") throw new Error("الطلب مازال كيتعالج. حدّث الصفحة من بعد شوية.");
        setState({ orderId: order.order_id, total: order.total_mad });

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
      <section className="panel prose">
        <h1>شكراً على الطلب</h1>
        {state?.orderId ? (
          <>
            <p>توصلنا بطلبك. الأداء غادي يكون عند الاستلام.</p>
            <p>مرجع الطلب: <strong dir="ltr">{state.orderId}</strong></p>
            <p>المجموع: <strong>{formatMad(state.total ?? null)}</strong></p>
            <p className="muted">هاد التأكيد كيعني أن الطلب تسجل، ماشي أنه توصل أو تخلص.</p>
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
