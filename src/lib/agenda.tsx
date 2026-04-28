// Agenda em memória (localStorage) — visitas programadas pelo vendedor.

import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { clients } from "./mock";
import { getCycleInfo, suggestionScore } from "./cycle";
import { Client } from "./types";

const STORAGE_KEY = "negri.agenda.v3"; // bump por checklist

export type VisitStatus = "pendente" | "em_visita" | "concluida" | "remarcada" | "cancelada";
export type VisitOrigin = "programada" | "sugestao_ciclo" | "forcada";
export type VisitShift = "manha" | "tarde" | "noite";

export interface CheckPoint {
  at: string;         // ISO timestamp
  geo?: { lat: number; lng: number } | null;
  geoError?: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
  /** Itens default não podem ser removidos, só desmarcados/marcados. */
  builtin?: boolean;
}

export const DEFAULT_CHECKLIST: Omit<ChecklistItem, "done">[] = [
  { id: "confirm_order",   label: "Confirmar pedido",   builtin: true },
  { id: "collect_payment", label: "Coletar pagamento",  builtin: true },
  { id: "update_stock",    label: "Atualizar estoque",  builtin: true },
];

export const buildDefaultChecklist = (): ChecklistItem[] =>
  DEFAULT_CHECKLIST.map(i => ({ ...i, done: false }));

export interface Visit {
  id: string;
  clientId: string;
  date: string;             // ISO YYYY-MM-DD
  shift: VisitShift;
  status: VisitStatus;
  origin: VisitOrigin;
  notes?: string;
  projected: number;
  realized?: number;
  checkIn?: CheckPoint;
  checkOut?: CheckPoint;
  checklist?: ChecklistItem[];
  /** Motivo informado ao cancelar a visita. */
  cancelReason?: string;
  /** Motivo informado ao reagendar a visita. */
  rescheduleReason?: string;
}

interface AgendaCtx {
  visits: Visit[];
  add: (v: Omit<Visit, "id">) => Visit;
  update: (id: string, patch: Partial<Visit>) => void;
  remove: (id: string) => void;
  forVendedor: (repId: string) => Visit[];
  /** Cria visita só se ainda não existe para o mesmo cliente+data. Retorna a existente ou criada. */
  ensureScheduled: (input: Omit<Visit, "id">) => { visit: Visit; created: boolean };
}

const Ctx = createContext<AgendaCtx | null>(null);

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const seed = (): Visit[] => {
  const today = todayISO();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const t = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
  return [
    { id: "vt1", clientId: "c1", date: today, shift: "manha", status: "concluida", origin: "programada", projected: 2840, realized: 3120 },
    { id: "vt2", clientId: "c2", date: today, shift: "tarde", status: "pendente", origin: "programada", projected: 5120 },
    { id: "vt3", clientId: "c3", date: today, shift: "tarde", status: "pendente", origin: "sugestao_ciclo", projected: 4200 },
    { id: "vt4", clientId: "c7", date: t, shift: "manha", status: "pendente", origin: "programada", projected: 2100 },
  ];
};

export function AgendaProvider({ children }: { children: ReactNode }) {
  const [visits, setVisits] = useState<Visit[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as Visit[];
    } catch { /* ignore */ }
    return seed();
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(visits)); } catch { /* ignore */ }
  }, [visits]);

  const value = useMemo<AgendaCtx>(() => ({
    visits,
    add: (v) => {
      const nv: Visit = { ...v, id: `vt${Date.now()}-${Math.random().toString(36).slice(2, 6)}` };
      setVisits((prev) => [...prev, nv]);
      return nv;
    },
    update: (id, patch) => setVisits((prev) => prev.map(v => v.id === id ? { ...v, ...patch } : v)),
    remove: (id) => setVisits((prev) => prev.filter(v => v.id !== id)),
    forVendedor: () => visits,
    ensureScheduled: (input) => {
      const existing = visits.find(v =>
        v.clientId === input.clientId
        && v.date === input.date
        && v.status !== "cancelada"
        && v.status !== "remarcada"
      );
      if (existing) return { visit: existing, created: false };
      const nv: Visit = { ...input, id: `vt${Date.now()}-${Math.random().toString(36).slice(2, 6)}` };
      setVisits((prev) => [...prev, nv]);
      return { visit: nv, created: true };
    },
  }), [visits]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAgenda() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAgenda must be used within AgendaProvider");
  return ctx;
}

/** Sugestões de visita por ciclo, excluindo clientes já agendados para uma data. */
export function suggestionsForDate(
  dateISO: string,
  alreadyScheduled: Visit[],
  segmentOverrides?: Record<string, number>,
): Array<{ client: Client; info: ReturnType<typeof getCycleInfo>; score: number }> {
  const usedIds = new Set(
    alreadyScheduled
      .filter(v => v.date === dateISO && v.status !== "cancelada" && v.status !== "remarcada")
      .map(v => v.clientId)
  );
  return clients
    .filter(c => c.status !== "bloqueado" && !usedIds.has(c.id))
    .map(c => {
      const info = getCycleInfo(c, undefined, segmentOverrides);
      return { client: c, info, score: suggestionScore(info) };
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score);
}

export { todayISO };
