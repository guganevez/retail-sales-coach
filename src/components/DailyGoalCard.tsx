import { CalendarDays, TrendingUp, TrendingDown, Target, MapPin, ChevronDown, ChevronUp, EyeOff, Eye } from "lucide-react";
import { useEffect, useState } from "react";
import { computeDailyPace, HolidaySet } from "@/lib/workdays";
import { formatBRL } from "@/lib/mock";
import { cn } from "@/lib/utils";

type CompactMode = "full" | "mini" | "hidden";
const STORAGE_KEY = "negri.dailyGoal.compactMode.v1";

export interface RealizedSource {
  /** rótulo (cliente/rota) */
  label: string;
  /** valor realizado em R$ */
  value: number;
  /** opcional: cidade ou rota */
  hint?: string;
}

interface DailyGoalCardProps {
  monthlyGoal: number;
  achievedMonth: number;
  achievedToday: number;
  /** Visual compacto para usar dentro do header */
  compact?: boolean;
  /** Feriados que devem contar como não-úteis */
  holidays?: HolidaySet;
  /** Quebra do realizado de hoje por cliente/rota */
  sources?: RealizedSource[];
}

export function DailyGoalCard({
  monthlyGoal,
  achievedMonth,
  achievedToday,
  compact = false,
  holidays,
  sources,
}: DailyGoalCardProps) {
  const pace = computeDailyPace(monthlyGoal, achievedMonth, new Date(), holidays);
  const todayPct = pace.dailyGoal > 0 ? (achievedToday / pace.dailyGoal) * 100 : 0;
  const onTrack = pace.delta >= 0;
  const TrendIcon = onTrack ? TrendingUp : TrendingDown;

  const sourcesTotal = (sources ?? []).reduce((s, x) => s + x.value, 0);
  const showSources = !!sources && sources.length > 0 && sourcesTotal > 0;

  const [mode, setMode] = useState<CompactMode>("full");

  useEffect(() => {
    if (!compact) return;
    try {
      const v = localStorage.getItem(STORAGE_KEY) as CompactMode | null;
      if (v === "full" || v === "mini" || v === "hidden") setMode(v);
    } catch { /* ignore */ }
  }, [compact]);

  const persistMode = (m: CompactMode) => {
    setMode(m);
    try { localStorage.setItem(STORAGE_KEY, m); } catch { /* ignore */ }
  };

  if (compact) {
    if (mode === "hidden") {
      return (
        <button
          onClick={() => persistMode("full")}
          className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold backdrop-blur transition hover:bg-white/15"
          aria-label="Mostrar meta diária"
        >
          <Eye className="h-3.5 w-3.5" />
          Mostrar meta diária ({todayPct.toFixed(0)}%)
        </button>
      );
    }

    if (mode === "mini") {
      return (
        <div className="rounded-2xl bg-white/10 p-2.5 backdrop-blur">
          <div className="flex items-center gap-2">
            <Target className="h-3.5 w-3.5 shrink-0 opacity-90" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between text-[11px]">
                <span className="opacity-90">Meta diária</span>
                <span className="num font-semibold">
                  {formatBRL(achievedToday)} / {formatBRL(pace.dailyGoal)} ({todayPct.toFixed(0)}%)
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/20">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    todayPct >= 100 ? "bg-success" : todayPct >= 60 ? "bg-accent" : "bg-warning"
                  )}
                  style={{ width: `${Math.min(100, todayPct)}%` }}
                />
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              <button
                onClick={() => persistMode("full")}
                className="grid h-6 w-6 place-items-center rounded-md text-white/80 hover:bg-white/10"
                aria-label="Expandir meta diária"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => persistMode("hidden")}
                className="grid h-6 w-6 place-items-center rounded-md text-white/80 hover:bg-white/10"
                aria-label="Ocultar meta diária"
              >
                <EyeOff className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-2xl bg-white/10 p-3 backdrop-blur">
        <div className="flex items-center justify-between text-xs">
          <span className="opacity-90 inline-flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5" /> Meta diária ({pace.elapsedWorkdays}/{pace.totalWorkdays} dias úteis)
          </span>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold num">
              {formatBRL(achievedToday)} / {formatBRL(pace.dailyGoal)}
            </span>
            <button
              onClick={() => persistMode("mini")}
              className="grid h-6 w-6 place-items-center rounded-md text-white/80 hover:bg-white/10"
              aria-label="Reduzir meta diária"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => persistMode("hidden")}
              className="grid h-6 w-6 place-items-center rounded-md text-white/80 hover:bg-white/10"
              aria-label="Ocultar meta diária"
            >
              <EyeOff className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/20">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              todayPct >= 100 ? "bg-gradient-to-r from-success to-white/90" : "bg-gradient-to-r from-accent to-white/90"
            )}
            style={{ width: `${Math.min(100, todayPct)}%` }}
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[11px] opacity-90">
          <span className="inline-flex items-center gap-1">
            <TrendIcon className="h-3 w-3" />
            {onTrack ? "Acima do ritmo" : "Abaixo do ritmo"} ({pace.pace > 0 ? `${(pace.pace * 100).toFixed(0)}%` : "—"})
          </span>
          <span className="num">
            {onTrack ? "+" : ""}{formatBRL(pace.delta)} vs esperado
          </span>
        </div>

        {/* Breakdown compacto */}
        {showSources && (
          <div className="mt-2 border-t border-white/15 pt-2">
            <p className="mb-1 text-[10px] font-bold uppercase opacity-75">Origem do realizado</p>
            <div className="space-y-1">
              {sources!.slice(0, 3).map((s) => {
                const pct = sourcesTotal > 0 ? (s.value / sourcesTotal) * 100 : 0;
                return (
                  <div key={s.label} className="flex items-center justify-between text-[11px]">
                    <span className="truncate opacity-90">{s.label}</span>
                    <span className="num font-semibold">
                      {formatBRL(s.value)} <span className="opacity-70">({pct.toFixed(0)}%)</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <section className="rounded-2xl bg-card p-4 shadow-soft">
      <div className="flex items-start justify-between">
        <div>
          <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" /> Meta por dias úteis
          </p>
          <p className="mt-1 text-2xl font-bold num">{formatBRL(pace.dailyGoal)}</p>
          <p className="text-[11px] text-muted-foreground">
            por dia · {pace.totalWorkdays} dias úteis no mês
          </p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold",
            onTrack ? "bg-success-soft text-success" : "bg-warning-soft text-warning"
          )}
        >
          <TrendIcon className="h-3 w-3" />
          {pace.pace > 0 ? `${(pace.pace * 100).toFixed(0)}%` : "—"}
        </span>
      </div>

      <div className="mt-3 rounded-xl bg-muted/40 p-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Hoje</span>
          <span className="font-bold num">
            {formatBRL(achievedToday)} / {formatBRL(pace.dailyGoal)}
          </span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-background">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              todayPct >= 100 ? "bg-success" : todayPct >= 60 ? "bg-primary" : "bg-warning"
            )}
            style={{ width: `${Math.min(100, todayPct)}%` }}
          />
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {todayPct >= 100
            ? `🎯 Meta do dia batida (+${formatBRL(achievedToday - pace.dailyGoal)})`
            : `Faltam ${formatBRL(Math.max(0, pace.dailyGoal - achievedToday))} para a meta de hoje`}
        </p>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl bg-muted/40 p-2.5">
          <p className="text-[10px] uppercase text-muted-foreground">Esperado até hoje</p>
          <p className="font-bold num">{formatBRL(pace.expectedToDate)}</p>
        </div>
        <div className={cn("rounded-xl p-2.5", onTrack ? "bg-success-soft" : "bg-warning-soft")}>
          <p className={cn("text-[10px] uppercase", onTrack ? "text-success" : "text-warning")}>
            {onTrack ? "Adiantado" : "Atrasado"}
          </p>
          <p className={cn("font-bold num", onTrack ? "text-success" : "text-warning")}>
            {onTrack ? "+" : ""}{formatBRL(pace.delta)}
          </p>
        </div>
      </div>

      {pace.remainingWorkdays > 0 && (
        <div className="mt-2 rounded-xl border border-border p-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">
              Para bater 100% — {pace.remainingWorkdays} dias úteis restantes:
            </span>
            <span className="font-bold text-primary num">
              {formatBRL(pace.requiredPerRemainingDay)}/dia
            </span>
          </div>
        </div>
      )}

      {/* Breakdown completo */}
      {showSources && (
        <div className="mt-3 rounded-xl border border-border p-3">
          <p className="mb-2 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase text-muted-foreground">
            <MapPin className="h-3 w-3" /> Origem do realizado de hoje
          </p>
          <div className="space-y-2">
            {sources!.map(s => {
              const pct = sourcesTotal > 0 ? (s.value / sourcesTotal) * 100 : 0;
              return (
                <div key={s.label}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="truncate font-semibold">{s.label}</span>
                    <span className="num font-bold">
                      {formatBRL(s.value)} <span className="text-muted-foreground">({pct.toFixed(0)}%)</span>
                    </span>
                  </div>
                  {s.hint && (
                    <p className="text-[10px] text-muted-foreground">{s.hint}</p>
                  )}
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
