import { apiErrorMessage, GENERIC_ERROR } from "./errors";
import type { TrackingPayload } from "./tracking";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export type CartLine = { sku: string; quantity: number };

export type Quote = {
  lines: Array<{
    sku: string;
    name_ar: string;
    quantity: number;
    unit_price_mad: number;
    regular_subtotal_mad: number;
    offer_total_mad: number;
    savings_mad: number;
  }>;
  regular_subtotal_mad: number;
  quantity_offer_savings_mad: number;
  merchandise_total_mad: number;
  delivery_fee_mad: number | null;
  total_mad: number | null;
  checkout_ready: boolean;
};

export type OrderResult = {
  order_id: string;
  order_token: string;
  status: string;
  total_mad: number;
  upsell: null | { sku: string; name_ar: string; price_mad: number; expires_at: string };
};

export type OrderStatus = {
  order_id: string;
  status: string;
  customer?: { name: string; phone: string; city: string };
  items: Array<{ sku: string; name: string; quantity: number; line_total_mad: number }>;
  total_mad: number;
  delivery_fee_mad: number;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/v1${path}`, {
      ...init,
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
  } catch {
    throw new Error(GENERIC_ERROR);
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(apiErrorMessage((data as { detail?: unknown }).detail));
  return data as T;
}

export function fetchCartQuote(items: CartLine[]) {
  return request<Quote>("/quotes", { method: "POST", body: JSON.stringify({ items }) });
}

export function createOrder(input: {
  idempotency_key: string;
  items: CartLine[];
  customer: { name: string; phone: string; city: string };
  tracking: TrackingPayload;
}) {
  return request<OrderResult>("/orders", { method: "POST", body: JSON.stringify(input) });
}

export function decideUpsell(token: string, decision: "accept" | "decline") {
  return request<OrderStatus>(`/orders/${encodeURIComponent(token)}/upsell`, {
    method: "POST",
    body: JSON.stringify({ decision }),
  });
}

export function updateOrderContact(token: string, customer: { name: string; phone: string; city: string }) {
  return request<OrderStatus>(`/orders/${encodeURIComponent(token)}/contact`, {
    method: "POST",
    body: JSON.stringify(customer),
  });
}

export function fetchOrderStatus(token: string) {
  return request<OrderStatus>(`/orders/${encodeURIComponent(token)}/status`);
}
