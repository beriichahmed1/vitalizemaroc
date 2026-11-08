const ARABIC_INDIC = /[\u0660-\u0669]/g;
const EXTENDED_ARABIC_INDIC = /[\u06F0-\u06F9]/g;

function toAsciiDigits(value: string): string {
  return value
    .replace(ARABIC_INDIC, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(EXTENDED_ARABIC_INDIC, (digit) => String(digit.charCodeAt(0) - 0x06f0));
}

/** Returns +212XXXXXXXXX for valid Moroccan mobiles (06/07 or +2126/+2127), otherwise null. Mirrors the backend. */
export function normalizeMoroccanMobile(raw: string): string | null {
  const compact = toAsciiDigits(raw).replace(/[\s().-]/g, "");
  if (/^0[67][0-9]{8}$/.test(compact)) return `+212${compact.slice(1)}`;
  if (/^\+212[67][0-9]{8}$/.test(compact)) return compact;
  return null;
}
