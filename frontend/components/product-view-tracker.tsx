"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/tracking";
import { getProduct } from "@/lib/catalog";

export function ProductViewTracker({ sku }: { sku: string }) {
  useEffect(() => {
    const product = getProduct(sku);
    if (!product) return;
    trackEvent("ViewContent", {
      items: [{ sku, quantity: 1, price: product.unitPrice }],
      value: product.unitPrice,
    });
  }, [sku]);
  return null;
}
