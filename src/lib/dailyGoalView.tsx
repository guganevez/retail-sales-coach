import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";

export type DailyGoalMode = "full" | "mini" | "hidden";
const STORAGE_KEY = "negri.dailyGoal.compactMode.v1";

interface Ctx {
  mode: DailyGoalMode;
  setMode: (m: DailyGoalMode) => void;
}

const DailyGoalViewCtx = createContext<Ctx | null>(null);

export function DailyGoalViewProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<DailyGoalMode>("full");

  useEffect(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY) as DailyGoalMode | null;
      if (v === "full" || v === "mini" || v === "hidden") setModeState(v);
    } catch { /* ignore */ }
  }, []);

  const setMode = useCallback((m: DailyGoalMode) => {
    setModeState(m);
    try { localStorage.setItem(STORAGE_KEY, m); } catch { /* ignore */ }
  }, []);

  return (
    <DailyGoalViewCtx.Provider value={{ mode, setMode }}>
      {children}
    </DailyGoalViewCtx.Provider>
  );
}

export function useDailyGoalView(): Ctx {
  const ctx = useContext(DailyGoalViewCtx);
  // Fallback local quando não houver provider (não deve acontecer no app)
  if (!ctx) {
    return { mode: "full", setMode: () => {} };
  }
  return ctx;
}
