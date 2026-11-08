"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { useStore } from "@/components/store-provider";
import { getProduct } from "@/lib/catalog";
import { productContent } from "@/lib/product-content";
import { whatsappUrl } from "@/lib/site";
import { formatMad, savingsVsSingles, tierTotal } from "@/lib/pricing";

export function AddToCartButton({
  sku,
  quantity = 1,
  className = "button",
  children,
}: {
  sku: string;
  quantity?: number;
  className?: string;
  children: ReactNode;
}) {
  const store = useStore();
  return (
    <button className={className} onClick={() => store.add(sku, quantity)}>
      {children}
    </button>
  );
}

export function ProductPurchase({ sku }: { sku: string }) {
  const product = getProduct(sku);
  const store = useStore();
  const [quantity, setQuantity] = useState(1);
  const [stickyVisible, setStickyVisible] = useState(false);
  const ctaRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const node = ctaRef.current;
    if (!node || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(([entry]) => {
      setStickyVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  if (!product) return null;
  const content = productContent[product.sku];
  const waUrl = whatsappUrl(`السلام، بغيت نستفسر على ${product.nameAr}`);
  const total = tierTotal(product.tiers, quantity);

  return (
    <div>
      <div className="quantity-options" role="radiogroup" aria-label="اختار الكمية">
        {product.tiers.map((tierPrice, index) => {
          const count = index + 1;
          const saving = savingsVsSingles(product.unitPrice, product.tiers, count);
          const perUnit = Math.round(tierPrice / count);
          return (
            <label key={count} className={`quantity-option ${quantity === count ? "selected" : ""}`}>
              <span className="option-main">
                <input type="radio" name={`quantity-${sku}`} checked={quantity === count} onChange={() => setQuantity(count)} />
                <span>
                  <strong>{count === 1 ? "قطعة وحدة" : count === 2 ? "قطعتين" : "3 قطع"}</strong>
                  <small className="muted">
                    {count > 1 ? `${formatMad(perUnit)} للقطعة` : "الثمن العادي"}
                    {content?.unitDuration ? ` · تكفيك ${count === 1 ? "شهر" : count === 2 ? "شهرين" : "3 شهور"}` : ""}
                  </small>
                </span>
              </span>
              <span className="option-price">
                <strong>{formatMad(tierPrice)}</strong>
                {saving > 0 && <small className="saving-chip">وفّر {formatMad(saving)}</small>}
                {count === 3 && <small className="best-chip">أحسن قيمة</small>}
              </span>
            </label>
          );
        })}
      </div>
      <button ref={ctaRef} className="button full cta" onClick={() => store.add(sku, quantity)}>
        اطلب الآن والدفع عند الاستلام — {formatMad(total)}
      </button>
      <ul className="order-assurances">
        <li>🚚 Livraison incluse dans le prix · التوصيل شامل فالثمن</li>
        <li>🔍 Vérification avant paiement · الفحص قبل الدفع</li>
        <li>📞 Confirmation par téléphone · غنتصلو بيك لتأكيد الطلب</li>
      </ul>
      {waUrl && <a className="button secondary full" href={waUrl} target="_blank" rel="noopener noreferrer">سولنا فالواتساب قبل ما تطلب</a>}

      {stickyVisible && (
        <div className="sticky-buy" role="region" aria-label="شراء سريع">
          <div>
            <strong>{formatMad(total)}</strong>
            <small className="muted"> · {quantity} {quantity === 1 ? "قطعة" : "قطع"}</small>
          </div>
          <button className="button cta" onClick={() => store.add(sku, quantity)}>زيد للسلة</button>
        </div>
      )}
    </div>
  );
}
