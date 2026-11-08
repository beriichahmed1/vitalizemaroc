"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CartLine, createOrder, decideUpsell, fetchCartQuote, Quote } from "@/lib/api";
import { getProduct, MAX_QUANTITY } from "@/lib/catalog";
import { tierTotal } from "@/lib/pricing";
import { getTrackingPayload, newEventId, trackEvent } from "@/lib/tracking";
import { CartUI } from "@/components/cart-ui";

type StoreContextValue = {
  lines: CartLine[];
  add: (sku: string, quantity: number) => void;
  setQuantity: (sku: string, quantity: number) => void;
  remove: (sku: string) => void;
  openCart: () => void;
  cartCount: number;
};

export type Upsell = { token: string; sku: string; name_ar: string; price_mad: number; expires_at: string };
export type CustomerInput = { name: string; phone: string; city: string };

const CART_KEY = "vitalize-cart";
const StoreContext = createContext<StoreContextValue | null>(null);

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used inside StoreProvider");
  return context;
}

function clamp(quantity: number) {
  return Math.max(0, Math.min(MAX_QUANTITY, Math.floor(quantity)));
}

function readSavedCart(): CartLine[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(CART_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    const merged = new Map<string, number>();
    for (const line of parsed) {
      if (typeof line?.sku === "string" && getProduct(line.sku) && Number.isInteger(line.quantity)) {
        merged.set(line.sku, clamp((merged.get(line.sku) ?? 0) + line.quantity));
      }
    }
    return [...merged].filter(([, quantity]) => quantity > 0).map(([sku, quantity]) => ({ sku, quantity }));
  } catch {
    window.localStorage.removeItem(CART_KEY);
    return [];
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deciding, setDeciding] = useState(false);
  const [error, setError] = useState("");
  const [upsell, setUpsell] = useState<Upsell | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const idempotencyKey = useRef<string | null>(null);
  const submittingRef = useRef(false);
  const decidingRef = useRef(false);
  const autoDeclined = useRef(false);
  const upsellRef = useRef<Upsell | null>(null);

  useEffect(() => {
    setLines(readSavedCart());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(CART_KEY, JSON.stringify(lines));
  }, [hydrated, lines]);

  useEffect(() => {
    // A changed cart is a different order, so it must not reuse the previous idempotency key.
    idempotencyKey.current = null;
    if (!hydrated) return;
    if (!lines.length) {
      setQuote(null);
      setQuoteError("");
      setQuoteLoading(false);
      return;
    }
    let active = true;
    setQuoteLoading(true);
    fetchCartQuote(lines)
      .then((result) => {
        if (!active) return;
        setQuote(result);
        setQuoteError("");
      })
      .catch((cause: Error) => {
        if (active) setQuoteError(cause.message);
      })
      .finally(() => {
        if (active) setQuoteLoading(false);
      });
    return () => {
      active = false;
    };
  }, [hydrated, lines]);

  const add = useCallback((sku: string, quantity: number) => {
    const product = getProduct(sku);
    if (!product) return;
    const amount = clamp(quantity);
    if (amount < 1) return;
    setLines((current) => {
      const found = current.find((line) => line.sku === sku);
      if (!found) return [...current, { sku, quantity: amount }];
      return current.map((line) => (line.sku === sku ? { ...line, quantity: clamp(line.quantity + amount) } : line));
    });
    const total = tierTotal(product.tiers, amount);
    trackEvent("AddToCart", { items: [{ sku, quantity: amount, price: Math.round((total / amount) * 100) / 100 }], value: total });
    setCartOpen(true);
  }, []);

  const setQuantity = useCallback((sku: string, quantity: number) => {
    const next = clamp(quantity);
    setLines((current) =>
      next < 1 ? current.filter((line) => line.sku !== sku) : current.map((line) => (line.sku === sku ? { ...line, quantity: next } : line)),
    );
  }, []);

  const remove = useCallback((sku: string) => setLines((current) => current.filter((line) => line.sku !== sku)), []);
  const openCart = useCallback(() => setCartOpen(true), []);
  const cartCount = useMemo(() => lines.reduce((sum, line) => sum + line.quantity, 0), [lines]);
  const contextValue = useMemo(
    () => ({ lines, add, setQuantity, remove, openCart, cartCount }),
    [lines, add, setQuantity, remove, openCart, cartCount],
  );

  useEffect(() => {
    const anyOpen = cartOpen || checkoutOpen || Boolean(upsell);
    document.body.style.overflow = anyOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [cartOpen, checkoutOpen, upsell]);

  const openCheckout = useCallback(() => {
    if (!quote?.checkout_ready || quoteLoading || quoteError) return;
    setError("");
    if (!idempotencyKey.current) idempotencyKey.current = newEventId();
    trackEvent("InitiateCheckout", {
      items: quote.lines.map((line) => ({
        sku: line.sku,
        quantity: line.quantity,
        price: Math.round((line.offer_total_mad / line.quantity) * 100) / 100,
      })),
      value: quote.merchandise_total_mad,
    });
    setCheckoutOpen(true);
  }, [quote, quoteLoading, quoteError]);

  const finishOrder = useCallback(
    (token: string) => {
      window.sessionStorage.setItem("vitalize-order-token", token);
      window.localStorage.removeItem(CART_KEY);
      idempotencyKey.current = null;
      upsellRef.current = null;
      setLines([]);
      setUpsell(null);
      setCheckoutOpen(false);
      setCartOpen(false);
      router.push("/thank-you");
    },
    [router],
  );

  const submitOrder = useCallback(
    async (customer: CustomerInput) => {
      if (submittingRef.current) return;
      submittingRef.current = true;
      setSubmitting(true);
      setError("");
      try {
        if (!idempotencyKey.current) idempotencyKey.current = newEventId();
        const result = await createOrder({
          idempotency_key: idempotencyKey.current,
          items: lines,
          customer,
          tracking: getTrackingPayload(),
        });
        if (result.upsell) {
          const next = { ...result.upsell, token: result.order_token };
          upsellRef.current = next;
          autoDeclined.current = false;
          setCheckoutOpen(false);
          setUpsell(next);
          setSecondsLeft(Math.max(0, Math.ceil((Date.parse(next.expires_at) - Date.now()) / 1000)));
        } else {
          finishOrder(result.order_token);
        }
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "تعذر إرسال الطلب");
      } finally {
        submittingRef.current = false;
        setSubmitting(false);
      }
    },
    [lines, finishOrder],
  );

  const decide = useCallback(
    async (decision: "accept" | "decline") => {
      const current = upsellRef.current;
      if (!current || decidingRef.current) return;
      decidingRef.current = true;
      setDeciding(true);
      setError("");
      try {
        await decideUpsell(current.token, decision);
        finishOrder(current.token);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "تعذر تأكيد الاختيار");
      } finally {
        decidingRef.current = false;
        setDeciding(false);
      }
    },
    [finishOrder],
  );

  useEffect(() => {
    if (!upsell) return;
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((Date.parse(upsell.expires_at) - Date.now()) / 1000));
      setSecondsLeft(remaining);
      // One automatic decline attempt; if the network fails the shopper retries manually (no request loop).
      if (remaining === 0 && !autoDeclined.current) {
        autoDeclined.current = true;
        void decide("decline");
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [upsell, decide]);

  return (
    <StoreContext.Provider value={contextValue}>
      {children}
      <CartUI
        lines={lines}
        quote={quote}
        quoteLoading={quoteLoading}
        quoteError={quoteError}
        cartOpen={cartOpen}
        checkoutOpen={checkoutOpen}
        submitting={submitting}
        deciding={deciding}
        error={error}
        upsell={upsell}
        secondsLeft={secondsLeft}
        onCloseCart={() => setCartOpen(false)}
        onOpenCheckout={openCheckout}
        onCloseCheckout={() => setCheckoutOpen(false)}
        onSubmit={submitOrder}
        onDecision={decide}
        onAdd={add}
        onSetQuantity={setQuantity}
        onRemove={remove}
      />
    </StoreContext.Provider>
  );
}
