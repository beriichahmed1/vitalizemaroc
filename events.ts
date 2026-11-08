export type StoreEventName = "ViewContent" | "AddToCart" | "InitiateCheckout" | "Purchase";

export type TrackItem = { sku: string; quantity: number; price: number };
export type TrackData = { items: TrackItem[]; value: number; orderId?: string };

export const CURRENCY = "MAD";

// Purchase names must stay identical to backend/app/tracking/capi.py for deduplication.
export const PLATFORM_EVENT_NAMES = {
  meta: { ViewContent: "ViewContent", AddToCart: "AddToCart", InitiateCheckout: "InitiateCheckout", Purchase: "Purchase" },
  tiktok: { ViewContent: "ViewContent", AddToCart: "AddToCart", InitiateCheckout: "InitiateCheckout", Purchase: "CompletePayment" },
  snap: { ViewContent: "VIEW_CONTENT", AddToCart: "ADD_CART", InitiateCheckout: "START_CHECKOUT", Purchase: "PURCHASE" },
} as const;

export function metaParams(data: TrackData) {
  return {
    content_type: "product",
    content_ids: data.items.map((item) => item.sku),
    contents: data.items.map((item) => ({ id: item.sku, quantity: item.quantity, item_price: item.price })),
    num_items: data.items.reduce((sum, item) => sum + item.quantity, 0),
    value: data.value,
    currency: CURRENCY,
  };
}

export function tiktokParams(data: TrackData) {
  return {
    content_type: "product",
    contents: data.items.map((item) => ({
      content_id: item.sku,
      content_type: "product",
      quantity: item.quantity,
      price: item.price,
    })),
    value: data.value,
    currency: CURRENCY,
  };
}

export type SnapParams = {
  price: number;
  currency: string;
  item_ids: string[];
  number_items: number;
  transaction_id?: string;
  client_dedup_id?: string;
};

export function snapParams(data: TrackData, eventId: string, isPurchase: boolean): SnapParams {
  return {
    price: data.value,
    currency: CURRENCY,
    item_ids: data.items.map((item) => item.sku),
    number_items: data.items.reduce((sum, item) => sum + item.quantity, 0),
    ...(isPurchase ? { transaction_id: data.orderId ?? eventId } : { client_dedup_id: eventId }),
  };
}
