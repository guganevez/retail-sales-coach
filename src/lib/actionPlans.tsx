// Planos de ação vinculados a motivos (cancel/reagend) — persistidos em localStorage.
import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";

const STORAGE_KEY = "negri.actionPlans.v1";

export type ActionPlanStatus = "aberto" | "em_andamento" | "concluido" | "cancelado";

export interface ActionPlan {
  id: string;
  reason: string;            // motivo associado (ex.: "Cliente ausente")
  title: string;             // o que será feito
  owner: string;             // responsável
  dueDate: string;           // ISO YYYY-MM-DD
  status: ActionPlanStatus;
  createdAt: string;         // ISO timestamp
  notes?: string;
  completedAt?: string;
}

interface Ctx {
  plans: ActionPlan[];
  add: (p: Omit<ActionPlan, "id" | "createdAt" | "status"> & { status?: ActionPlanStatus }) => ActionPlan;
  update: (id: string, patch: Partial<ActionPlan>) => void;
  remove: (id: string) => void;
  forReason: (reason: string) => ActionPlan[];
}

const C = createContext<Ctx | null>(null);

export function ActionPlansProvider({ children }: { children: ReactNode }) {
  const [plans, setPlans] = useState<ActionPlan[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as ActionPlan[];
    } catch { /* ignore */ }
    return [];
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(plans)); } catch { /* ignore */ }
  }, [plans]);

  const value = useMemo<Ctx>(() => ({
    plans,
    add: (p) => {
      const np: ActionPlan = {
        ...p,
        id: `ap${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        createdAt: new Date().toISOString(),
        status: p.status ?? "aberto",
      };
      setPlans(prev => [np, ...prev]);
      return np;
    },
    update: (id, patch) => setPlans(prev => prev.map(p => {
      if (p.id !== id) return p;
      const next = { ...p, ...patch };
      if (patch.status === "concluido" && !p.completedAt) next.completedAt = new Date().toISOString();
      return next;
    })),
    remove: (id) => setPlans(prev => prev.filter(p => p.id !== id)),
    forReason: (reason) => plans.filter(p => p.reason === reason),
  }), [plans]);

  return <C.Provider value={value}>{children}</C.Provider>;
}

export function useActionPlans() {
  const ctx = useContext(C);
  if (!ctx) throw new Error("useActionPlans must be used within ActionPlansProvider");
  return ctx;
}

/** True se prazo passou e não está concluído/cancelado. */
export function isOverdue(p: ActionPlan, now: Date = new Date()): boolean {
  if (p.status === "concluido" || p.status === "cancelado") return false;
  const [y, m, d] = p.dueDate.split("-").map(Number);
  const due = new Date(y, m - 1, d, 23, 59, 59);
  return now > due;
}
