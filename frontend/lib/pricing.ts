export type Tiers = readonly [number, number, number];

/** Total for `quantity` units: complete groups of 3 use the 3-unit price, the remainder uses its own tier. */
export function tierTotal(tiers: Tiers, quantity: number): number {
  if (!Number.isInteger(quantity) || quantity < 1) throw new Error("invalid_quantity");
  const groups = Math.floor(quantity / 3);
  const remainder = quantity % 3;
  return groups * tiers[2] + (remainder === 0 ? 0 : tiers[remainder - 1]);
}

export function savingsVsSingles(unitPrice: number, tiers: Tiers, quantity: number): number {
  return Math.max(unitPrice * quantity - tierTotal(tiers, quantity), 0);
}

export function formatMad(value: number | null): string {
  if (value === null) return "كيتم التأكيد";
  return `${String(value).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} درهم`;
}
