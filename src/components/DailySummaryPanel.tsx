import { useMemo, useState } from "react";
import {
  Activity, CheckCircle2, ListChecks, AlertTriangle, XCircle,
  CalendarClock, ChevronDown, ChevronUp, Clock, ListTodo,
  Sun, Sunset, Moon, Layers,
} from "lucide-react";
import { Visit, VisitShift, todayISO } from "@/lib/agenda";
import { clients } from "@/lib/mock";
import { cn } from "@/lib/utils";
import { lateMinutes, isLate, checklistProgress, pendingChecklist, SHIFT_WINDOW } from "@/lib/visitMetrics";
import { ActionPlansPanel, NewPlanButton } from "./ActionPlansPanel";

const clientMap = Object.fromEntries(clients.map(c => [c.id, c]));

interface Props {
  visits: Visit[];
}

export function DailySummaryPanel({ visits }: Props) {
  const [expanded, setExpanded] = useState(false);
  const today = todayISO();
  const now = new Date();

  const dayVisits = useMemo(
    () => visits.filter(v => v.date === today),
    [visits, today]
  );

  const stats = useMemo(() => {
    const total = dayVisits.length;
    const realizadas = dayVisits.filter(v => v.status === "concluida");
    const canceladas = dayVisits.filter(v => v.status === "cancelada");
    const reagendadas = dayVisits.filter(v => v.status === "remarcada");
    const pendentes = dayVisits.filter(v => v.status === "pendente" || v.status === "em_visita");

    const checklist100 = realizadas.filter(v => checklistProgress(v) === 100);
    const checklistRate = realizadas.length > 0
      ? Math.round((checklist100.length / realizadas.length) * 100)
      : 0;

    // Checklist parcial (1–99%) — onde a execução está incompleta
    const parcial = dayVisits
      .map(v => ({ v, pct: checklistProgress(v) }))
      .filter(({ v, pct }) => pct >= 1 && pct < 100 && v.status !== "cancelada" && v.status !== "remarcada")
      .sort((a, b) => a.pct - b.pct);

    // Atrasos baseados em horário real (check-in) ou em hora atual vs fim do turno
    const atrasos = dayVisits
      .map(v => ({ v, mins: lateMinutes(v, now) }))
      .filter(x => isLate(x.v, now))
      .sort((a, b) => b.mins - a.mins);

    // Motivos agregados (cancel + reagendamento) — global
    const motivos = new Map<string, number>();
    [...canceladas, ...reagendadas].forEach(v => {
      const r = (v.cancelReason || v.rescheduleReason || "").trim();
      if (!r) return;
      motivos.set(r, (motivos.get(r) ?? 0) + 1);
    });
    const motivosTop = Array.from(motivos.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, count]) => ({ label, count }));

    const semMotivo = [...canceladas, ...reagendadas].filter(
      v => !(v.cancelReason || v.rescheduleReason)?.trim()
    ).length;

    // Motivos por turno × tipo (cancel/reagend)
    const shifts: VisitShift[] = ["manha", "tarde", "noite"];
    const byShift = shifts.map(shift => {
      const items = [...canceladas, ...reagendadas].filter(v => v.shift === shift);
      const cancelMap = new Map<string, number>();
      const remarcMap = new Map<string, number>();
      let semMot = 0;
      items.forEach(v => {
        const reason = (v.cancelReason || v.rescheduleReason || "").trim();
        if (!reason) { semMot++; return; }
        const map = v.status === "cancelada" ? cancelMap : remarcMap;
        map.set(reason, (map.get(reason) ?? 0) + 1);
      });
      const top = (m: Map<string, number>) =>
        Array.from(m.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([label, count]) => ({ label, count }));
      return {
        shift,
        total: items.length,
        canceladas: items.filter(v => v.status === "cancelada").length,
        reagendadas: items.filter(v => v.status === "remarcada").length,
        cancelTop: top(cancelMap),
        remarcTop: top(remarcMap),
        semMotivo: semMot,
      };
    });

    const concluidaPct = total > 0 ? Math.round((realizadas.length / total) * 100) : 0;

    return {
      total,
      realizadas: realizadas.length,
      canceladas: canceladas.length,
      reagendadas: reagendadas.length,
      pendentes: pendentes.length,
      checklist100: checklist100.length,
      checklistRate,
      parcial,
      atrasos,
      motivosTop,
      semMotivo,
      byShift,
      concluidaPct,
    };
  }, [dayVisits, now]);

  if (stats.total === 0) return null;

  return (
    <section className="mb-4 rounded-2xl border border-border bg-card p-3 shadow-soft">
      <div className="flex items-center justify-between">
        <h2 className="inline-flex items-center gap-1.5 text-sm font-semibold">
          <Activity className="h-4 w-4 text-primary" />
          Resumo do dia · produtividade
        </h2>
        <button
          onClick={() => setExpanded(e => !e)}
          className="inline-flex items-center gap-1 rounded-lg bg-muted/50 px-2 py-1 text-[10px] font-bold text-muted-foreground hover:bg-muted"
          aria-label={expanded ? "Recolher" : "Expandir"}
        >
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {expanded ? "Recolher" : "Detalhes"}
        </button>
      </div>

      {/* KPIs principais */}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <KpiTile
          icon={<CheckCircle2 className="h-3.5 w-3.5" />}
          label="Realizadas"
          value={`${stats.realizadas}/${stats.total}`}
          hint={`${stats.concluidaPct}% do dia`}
          tone="success"
        />
        <KpiTile
          icon={<ListChecks className="h-3.5 w-3.5" />}
          label="Checklist 100%"
          value={`${stats.checklist100}`}
          hint={stats.realizadas > 0 ? `${stats.checklistRate}% das realizadas` : "—"}
          tone={stats.checklistRate >= 80 ? "success" : stats.checklistRate >= 50 ? "primary" : "warning"}
        />
        <KpiTile
          icon={<ListTodo className="h-3.5 w-3.5" />}
          label="Checklist parcial"
          value={`${stats.parcial.length}`}
          hint={stats.parcial.length > 0 ? "execução em aberto" : "tudo em ordem"}
          tone={stats.parcial.length > 0 ? "warning" : "muted"}
        />
        <KpiTile
          icon={<AlertTriangle className="h-3.5 w-3.5" />}
          label="Atrasos"
          value={`${stats.atrasos.length}`}
          hint={stats.atrasos.length > 0 ? `máx ${stats.atrasos[0].mins}min` : "no horário"}
          tone={stats.atrasos.length > 0 ? "warning" : "muted"}
        />
        <KpiTile
          icon={<XCircle className="h-3.5 w-3.5" />}
          label="Não realizadas"
          value={`${stats.canceladas + stats.reagendadas}`}
          hint={`${stats.canceladas} canc · ${stats.reagendadas} rem`}
          tone={stats.canceladas + stats.reagendadas > 0 ? "danger" : "muted"}
        />
      </div>

      {expanded && (
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {/* Atrasos */}
          <div className="rounded-xl bg-muted/30 p-2.5">
            <p className="mb-1.5 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-warning">
              <Clock className="h-3 w-3" /> Atrasos ({stats.atrasos.length})
            </p>
            {stats.atrasos.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">Nenhum atraso até agora.</p>
            ) : (
              <ul className="space-y-1">
                {stats.atrasos.slice(0, 6).map(({ v, mins }) => {
                  const c = clientMap[v.clientId];
                  const win = SHIFT_WINDOW[v.shift];
                  return (
                    <li key={v.id} className="flex items-center justify-between gap-2 rounded-lg bg-background/60 px-2 py-1">
                      <span className="min-w-0 truncate text-[11px] font-semibold">
                        {c?.fantasy ?? v.clientId}
                        <span className="ml-1 font-normal text-muted-foreground">
                          ({win.label} até {String(win.end).padStart(2, "0")}h)
                        </span>
                      </span>
                      <span className="shrink-0 rounded-full bg-warning-soft px-1.5 py-0.5 text-[9px] font-bold text-warning num">
                        +{mins}min
                      </span>
                    </li>
                  );
                })}
                {stats.atrasos.length > 6 && (
                  <li className="text-[10px] text-muted-foreground">+{stats.atrasos.length - 6} outras</li>
                )}
              </ul>
            )}
          </div>

          {/* Checklist parcial */}
          <div className="rounded-xl bg-muted/30 p-2.5">
            <p className="mb-1.5 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-primary">
              <ListTodo className="h-3 w-3" /> Checklist parcial ({stats.parcial.length})
            </p>
            {stats.parcial.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">Nenhuma execução parcial.</p>
            ) : (
              <ul className="space-y-1">
                {stats.parcial.slice(0, 6).map(({ v, pct }) => {
                  const c = clientMap[v.clientId];
                  const pend = pendingChecklist(v);
                  return (
                    <li key={v.id} className="rounded-lg bg-background/60 px-2 py-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="min-w-0 truncate text-[11px] font-semibold">
                          {c?.fantasy ?? v.clientId}
                        </span>
                        <span className={cn(
                          "shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold num",
                          pct >= 75 ? "bg-success-soft text-success"
                          : pct >= 40 ? "bg-primary/15 text-primary"
                          : "bg-warning-soft text-warning"
                        )}>
                          {pct}%
                        </span>
                      </div>
                      <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn("h-full",
                            pct >= 75 ? "bg-success"
                            : pct >= 40 ? "bg-primary"
                            : "bg-warning"
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      {pend.length > 0 && (
                        <p className="mt-1 truncate text-[10px] text-muted-foreground">
                          Falta: {pend.slice(0, 2).join(", ")}
                          {pend.length > 2 && ` +${pend.length - 2}`}
                        </p>
                      )}
                    </li>
                  );
                })}
                {stats.parcial.length > 6 && (
                  <li className="text-[10px] text-muted-foreground">+{stats.parcial.length - 6} outras</li>
                )}
              </ul>
            )}
          </div>

          {/* Motivos */}
          <div className="rounded-xl bg-muted/30 p-2.5">
            <p className="mb-1.5 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-danger">
              <CalendarClock className="h-3 w-3" /> Motivos
            </p>
            {stats.motivosTop.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">
                {stats.canceladas + stats.reagendadas === 0
                  ? "Nada cancelado ou reagendado."
                  : "Sem motivos registrados."}
              </p>
            ) : (
              <ul className="space-y-1">
                {stats.motivosTop.map(m => (
                  <li key={m.label} className="flex items-center justify-between gap-2 rounded-lg bg-background/60 px-2 py-1">
                    <span className="truncate text-[11px]">{m.label}</span>
                    <span className="shrink-0 rounded-full bg-danger-soft px-1.5 py-0.5 text-[9px] font-bold text-danger num">
                      {m.count}×
                    </span>
                  </li>
                ))}
                {stats.semMotivo > 0 && (
                  <li className="text-[10px] text-muted-foreground">
                    {stats.semMotivo} sem motivo informado
                  </li>
                )}
              </ul>
            )}
          </div>

          {/* Motivos por turno (full-width abaixo) */}
          <div className="rounded-xl bg-muted/30 p-2.5 md:col-span-3">
            <p className="mb-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              <Layers className="h-3 w-3" /> Motivos por turno
            </p>
            <div className="grid gap-2 sm:grid-cols-3">
              {stats.byShift.map(s => {
                const ShiftIcon = s.shift === "manha" ? Sun : s.shift === "tarde" ? Sunset : Moon;
                const label = SHIFT_WINDOW[s.shift].label;
                return (
                  <div key={s.shift} className="rounded-lg border border-border/50 bg-background/60 p-2">
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold capitalize">
                        <ShiftIcon className="h-3 w-3 text-muted-foreground" />
                        {label}
                      </span>
                      <span className="text-[10px] text-muted-foreground num">
                        {s.canceladas}c · {s.reagendadas}r
                      </span>
                    </div>

                    {s.total === 0 ? (
                      <p className="text-[10px] text-muted-foreground">Sem ocorrências.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {s.cancelTop.length > 0 && (
                          <div>
                            <p className="text-[9px] font-bold uppercase tracking-wide text-danger">
                              Cancelamento
                            </p>
                            <ul className="mt-0.5 space-y-0.5">
                              {s.cancelTop.map(m => (
                                <li key={m.label} className="flex items-center justify-between gap-1.5">
                                  <span className="truncate text-[11px]">{m.label}</span>
                                  <span className="shrink-0 rounded-full bg-danger-soft px-1.5 text-[9px] font-bold text-danger num">
                                    {m.count}×
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {s.remarcTop.length > 0 && (
                          <div>
                            <p className="text-[9px] font-bold uppercase tracking-wide text-warning">
                              Reagendamento
                            </p>
                            <ul className="mt-0.5 space-y-0.5">
                              {s.remarcTop.map(m => (
                                <li key={m.label} className="flex items-center justify-between gap-1.5">
                                  <span className="truncate text-[11px]">{m.label}</span>
                                  <span className="shrink-0 rounded-full bg-warning-soft px-1.5 text-[9px] font-bold text-warning num">
                                    {m.count}×
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {s.semMotivo > 0 && (
                          <p className="text-[10px] text-muted-foreground">
                            {s.semMotivo} sem motivo
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function KpiTile({
  icon, label, value, hint, tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  tone: "success" | "primary" | "warning" | "danger" | "muted";
}) {
  const cls: Record<string, string> = {
    success: "bg-success-soft text-success",
    primary: "bg-primary/10 text-primary",
    warning: "bg-warning-soft text-warning",
    danger:  "bg-danger-soft text-danger",
    muted:   "bg-muted text-muted-foreground",
  };
  return (
    <div className="rounded-xl bg-background/40 p-2.5 ring-1 ring-border/40">
      <div className="flex items-center justify-between gap-1">
        <p className="truncate text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <span className={cn("grid h-5 w-5 place-items-center rounded-md", cls[tone])}>
          {icon}
        </span>
      </div>
      <p className="mt-1 text-lg font-bold num">{value}</p>
      <p className="text-[10px] text-muted-foreground">{hint}</p>
    </div>
  );
}
