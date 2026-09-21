import type { Product, Vehicle } from "../types";

/**
 * Compatibility rule: a product fits when it is universal, or when any of its
 * compatibility entries matches the selected make + model, the year falls in the
 * entry's range, and (if the entry restricts fuels) the selected fuel is listed.
 */
export function isCompatible(p: Product, v: Vehicle | null): boolean {
  if (!v) return false;
  if (p.universal) return true;
  return p.compatibility.some(
    (c) =>
      c.make === v.make &&
      c.model === v.model &&
      v.year >= c.yearFrom &&
      v.year <= c.yearTo &&
      (!c.fuels || c.fuels.includes(v.fuel)),
  );
}

export const money = (n: number) => `$${n.toFixed(2)}`;
export const discountPct = (p: Product) =>
  p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
