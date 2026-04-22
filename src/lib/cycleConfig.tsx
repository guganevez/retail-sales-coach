// Provider de overrides do ciclo por segmento — armazena no localStorage.
// Permite ao usuário ajustar o fallback (Bar = 7d, Restaurante = 14d, ...) sem mexer no código.

import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { SEGMENT_CYCLE_DEFAULTS } from "./cycle";

const STORAGE_KEY = "negri.cycle.overrides.v1";

interface CycleCtx {
  cycles: Record<string, number>;          // efetivo (defaults + overrides)
  defaults: Record<string, number>;        // imutável
  overrides: Record<string, number>;       // só os customizados
  setCycle: (segment: string, days: number) => void;
  resetSegment: (segment: string) => void;
  resetAll: () => void;
}

const Ctx = createContext<CycleCtx | null>(null);

export function CycleProvider({ children }: { children: ReactNode }) {
  const [overrides, setOverrides] = useState<Record<string, number>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as Record<string, number>;
    } catch { /* ignore */ }
    return {};
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides)); } catch { /* ignore */ }
  }, [overrides]);

  const value = useMemo<CycleCtx>(() => {
    const cycles: Record<string, number> = { ...SEGMENT_CYCLE_DEFAULTS, ...overrides };
    return {
      cycles,
      defaults: SEGMENT_CYCLE_DEFAULTS,
      overrides,
      setCycle: (segment, days) =>
        setOverrides((prev) => ({ ...prev, [segment]: Math.max(1, Math.round(days)) })),
      resetSegment: (segment) =>
        setOverrides((prev) => {
          const { [segment]: _drop, ...rest } = prev;
          return rest;
        }),
      resetAll: () => setOverrides({}),
    };
  }, [overrides]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCycleConfig() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCycleConfig must be used within CycleProvider");
  return ctx;
}
