const MESSAGES: Record<string, string> = {
  invalid_moroccan_mobile: "رقم الهاتف ماشي صحيح. دخل رقم مغربي كيبدا بـ 06 أو 07.",
  delivery_fee_not_configured: "الطلب غير متاح مؤقتاً. عاود حاول من بعد شوية.",
  too_many_orders: "بزاف ديال الطلبات من نفس الرقم. عاود حاول من بعد.",
  invalid_quantity: "الكمية غير صحيحة. راجع السلة وعاود حاول.",
  unknown_or_unavailable_product: "واحد المنتج ما بقاش متوفر. راجع السلة.",
  idempotency_key_reused: "وقع مشكل فالطلب. عاود حاول.",
  order_conflict: "وقع مشكل فالطلب. عاود حاول.",
  order_not_found: "ما لقيناش هاد الطلب.",
};

const FIELD_MESSAGES: Record<string, string> = {
  phone: "رقم الهاتف ماشي صحيح. دخل رقم مغربي كيبدا بـ 06 أو 07.",
  name: "كتب الاسم الكامل.",
  city: "كتب المدينة.",
};

export const GENERIC_ERROR = "وقع مشكل. تأكد من الإنترنت وعاود حاول.";

export function apiErrorMessage(detail: unknown): string {
  if (typeof detail === "string") return MESSAGES[detail] ?? GENERIC_ERROR;
  if (Array.isArray(detail)) {
    for (const entry of detail) {
      const loc = (entry as { loc?: unknown[] })?.loc;
      const field = Array.isArray(loc) ? loc.find((part) => typeof part === "string" && part in FIELD_MESSAGES) : undefined;
      if (typeof field === "string") return FIELD_MESSAGES[field];
    }
  }
  return GENERIC_ERROR;
}
