import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";

const STORAGE_KEY = "negri.holidays.v1";

export interface Holiday {
  /** ISO date YYYY-MM-DD */
  date: string;
  label: string;
}

interface HolidaysCtx {
  holidays: Holiday[];
  add: (h: Holiday) => void;
  remove: (date: string) => void;
  isHoliday: (d: Date) => Holiday | null;
}

const Ctx = createContext<HolidaysCtx | null>(null);

const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function HolidaysProvider({ children }: { children: ReactNode }) {
  const [holidays, setHolidays] = useState<Holiday[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as Holiday[];
    } catch {
      // ignore
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(holidays));
    } catch {
      // ignore
    }
  }, [holidays]);

  const value = useMemo<HolidaysCtx>(() => ({
    holidays: [...holidays].sort((a, b) => a.date.localeCompare(b.date)),
    add: (h) => setHolidays((prev) => {
      const dedup = prev.filter(p => p.date !== h.date);
      return [...dedup, h];
    }),
    remove: (date) => setHolidays((prev) => prev.filter(p => p.date !== date)),
    isHoliday: (d) => {
      const iso = toISO(d);
      return holidays.find(h => h.date === iso) ?? null;
    },
  }), [holidays]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useHolidays() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useHolidays must be used within HolidaysProvider");
  return ctx;
}

export { toISO };
