import { OrderItem, Product } from "./types";

/** Comissão escalonada baseada na margem do pedido (%). */
export function commissionFromMargin(marginPct: number): number {
  if (marginPct < -3) return 0; // bloqueia
  if (marginPct < 0) return 0.5;
  if (marginPct < 2) return 1.2;
  if (marginPct < 5) return 1.8;
  if (marginPct < 8) return 2.3;
  if (marginPct < 12) return 2.8;
  return 3.4;
}

export interface OrderTotals {
  gross: number;
  cost: number;
  marginValue: number;
  marginPct: number;
  commissionPct: number;
  commissionValue: number;
  weightKg: number;
  itemsCount: number;
  blocked: boolean;
}

export function computeTotals(items: OrderItem[], productMap: Record<string, Product>): OrderTotals {
  let gross = 0, cost = 0, weightKg = 0;
  for (const it of items) {
    const p = productMap[it.productId];
    if (!p) continue;
    gross += it.price * it.qty;
    cost += p.cost * it.qty;
    weightKg += p.weightKg * it.qty;
  }
  const marginValue = gross - cost;
  const marginPct = gross > 0 ? (marginValue / gross) * 100 : 0;
  const commissionPct = commissionFromMargin(marginPct);
  const commissionValue = (gross * commissionPct) / 100;
  return {
    gross, cost, marginValue, marginPct, commissionPct, commissionValue,
    weightKg, itemsCount: items.reduce((s, i) => s + i.qty, 0),
    blocked: marginPct < -3,
  };
}

export function itemMarginPct(price: number, cost: number) {
  if (price <= 0) return 0;
  return ((price - cost) / price) * 100;
}

/** Cor semântica baseada na margem do item vs PMV/PSV */
export type HealthLevel = "good" | "warn" | "bad";
export function priceHealth(price: number, p: Product): HealthLevel {
  if (price < p.pmv) return "bad";
  if (price < p.psv * 0.96) return "warn";
  return "good";
}

export function marginHealth(marginPct: number): HealthLevel {
  if (marginPct < 0) return "bad";
  if (marginPct < 5) return "warn";
  return "good";
}
