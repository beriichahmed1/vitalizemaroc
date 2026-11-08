export type ConsentState = "granted" | "denied" | null;

export const REQUIRE_CONSENT = process.env.NEXT_PUBLIC_REQUIRE_TRACKING_CONSENT !== "false";
const KEY = "vitalize-consent";
export const CONSENT_EVENT = "vitalize:consent";

export function getConsent(): ConsentState {
  if (!REQUIRE_CONSENT) return "granted";
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    return null;
  }
}

export function setConsent(value: "granted" | "denied" | "unset") {
  try {
    if (value === "unset") window.localStorage.removeItem(KEY);
    else window.localStorage.setItem(KEY, value);
  } catch {
    // Storage can be unavailable (private mode); the decision then applies to this page view only.
  }
  window.dispatchEvent(new Event(CONSENT_EVENT));
}
