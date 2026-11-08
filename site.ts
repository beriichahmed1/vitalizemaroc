import { normalizeMoroccanMobile } from "./phone.ts";

/** wa.me link for the configured support number, or null when no valid number is configured. */
export function buildWhatsappUrl(rawNumber: string | undefined, message?: string): string | null {
  const normalized = normalizeMoroccanMobile(rawNumber ?? "");
  if (!normalized) return null;
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${normalized.slice(1)}${text}`;
}

export function whatsappUrl(message?: string): string | null {
  return buildWhatsappUrl(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER, message);
}

export function whatsappDisplay(): string | null {
  const normalized = normalizeMoroccanMobile(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "");
  return normalized ? `0${normalized.slice(4)}` : null;
}
