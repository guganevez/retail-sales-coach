// Agenda em memória (localStorage) — visitas programadas pelo vendedor.

import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { clients } from "./mock";
import { getCycleInfo, suggestionScore } from "./cycle";
import { Client } from "./types";

const STORAGE_KEY = "negri.agenda.v1";

export type VisitStatus = "pendente" | "concluida" | "remarcada";
export type VisitOrigin = "programada" | "sugestao_ciclo" | "forcada";

export interface Visit {
  id: string;
  clientId: string;
  /** ISO YYYY-MM-DD */
  date: string;
  /** "manha" | "tarde" | "noite" */
  shift: "manha" | "tarde" | "noite";
  status: VisitStatus;
  origin: VisitOrigin;
  notes?: string;
  /** valor projetado de venda (= ticket médio) */
  projected: number;
  /** valor realizado (preenchido manualmente quando concluída) */
  realized?: number;
}

interface AgendaCtx {
  visits: Visit[];
  add: (v: Omit<Visit, "id">) => void;
  update: (id: string, patch: Partial<Visit>) => void;
  remove: (id: string) => void;
  forVendedor: (repId: string) => Visit[]; // por enquanto retorna tudo (mock single-user)
}

const Ctx = createContext<AgendaCtx | null>(null);

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const seed = (): Visit[] => {
  // Semente determinística: pré-agenda 3 visitas para hoje p/ demonstração.
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
    } catch {
      // ignore
    }
    return seed();
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(visits));
    } catch {
      // ignore
    }
  }, [visits]);

  const value = useMemo<AgendaCtx>(() => ({
    visits,
    add: (v) => setVisits((prev) => [...prev, { ...v, id: `vt${Date.now()}` }]),
    update: (id, patch) => setVisits((prev) => prev.map(v => v.id === id ? { ...v, ...patch } : v)),
    remove: (id) => setVisits((prev) => prev.filter(v => v.id !== id)),
    forVendedor: () => visits,
  }), [visits]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAgenda() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAgenda must be used within AgendaProvider");
  return ctx;
}

/** Sugestões de visita por ciclo, excluindo clientes já agendados para uma data. */
export function suggestionsForDate(dateISO: string, alreadyScheduled: Visit[]): Array<{ client: Client; info: ReturnType<typeof getCycleInfo>; score: number }> {
  const usedIds = new Set(alreadyScheduled.filter(v => v.date === dateISO).map(v => v.clientId));
  return clients
    .filter(c => c.status !== "bloqueado" && !usedIds.has(c.id))
    .map(c => {
      const info = getCycleInfo(c);
      return { client: c, info, score: suggestionScore(info) };
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score);
}

export { todayISO };
