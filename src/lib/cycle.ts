// Ciclo de venda híbrido: usa intervalo médio entre pedidos do cliente quando há histórico,
// senão cai no padrão por segmento (com overrides opcionais do usuário).

import { Client, Order } from "./types";
import { recentOrders } from "./mock";

export const SEGMENT_CYCLE_DEFAULTS: Record<string, number> = {
  "Bar": 7,
  "Restaurante": 14,
  "Mercado": 10,
  "Pizzaria": 12,
  "Conveniência": 9,
  "Lanchonete": 14,
  "Adega": 21,
};

/** Compat: alias antigo. */
export const SEGMENT_CYCLE = SEGMENT_CYCLE_DEFAULTS;

export const DEFAULT_CYCLE_DAYS = 15;

export interface CycleInfo {
  cycleDays: number;
  source: "historico" | "segmento";
  daysSinceLast: number;
  overdueDays: number;
  ratio: number;
  priority: "atrasado" | "no_ciclo" | "ok";
  expectedTicket: number;
}

function avgIntervalDays(orders: Order[]): number | null {
  if (orders.length < 2) return null;
  const sorted = [...orders].sort((a, b) => a.date.localeCompare(b.date));
  let totalDiff = 0;
  for (let i = 1; i < sorted.length; i++) {
    const a = new Date(sorted[i - 1].date).getTime();
    const b = new Date(sorted[i].date).getTime();
    totalDiff += (b - a) / 86400000;
  }
  return Math.round(totalDiff / (sorted.length - 1));
}

export function getCycleInfo(
  client: Client,
  orders: Order[] = recentOrders,
  segmentOverrides?: Record<string, number>,
): CycleInfo {
  const clientOrders = orders.filter(o => o.clientId === client.id);
  const historic = avgIntervalDays(clientOrders);
  const cycles = { ...SEGMENT_CYCLE_DEFAULTS, ...(segmentOverrides ?? {}) };
  const segment = cycles[client.segment] ?? DEFAULT_CYCLE_DAYS;
  const cycleDays = historic ?? segment;
  const source: CycleInfo["source"] = historic ? "historico" : "segmento";

  const daysSinceLast = client.lastPurchaseDays;
  const overdueDays = daysSinceLast - cycleDays;
  const ratio = cycleDays > 0 ? daysSinceLast / cycleDays : 0;

  let priority: CycleInfo["priority"];
  if (overdueDays > 0) priority = "atrasado";
  else if (ratio >= 0.8) priority = "no_ciclo";
  else priority = "ok";

  return {
    cycleDays, source, daysSinceLast, overdueDays, ratio, priority,
    expectedTicket: client.avgTicket,
  };
}

export function suggestionScore(info: CycleInfo): number {
  const overdueWeight = Math.max(0, info.overdueDays) * 4;
  const cycleWeight = info.ratio >= 0.8 && info.ratio < 1 ? 5 : 0;
  const ticketWeight = info.expectedTicket / 1000;
  return overdueWeight + cycleWeight + ticketWeight;
}
