import { useMemo, useState } from "react";
import {
  Activity, CheckCircle2, ListChecks, AlertTriangle, XCircle,
  CalendarClock, ChevronDown, ChevronUp, Clock,
} from "lucide-react";
import { Visit, VisitShift, todayISO } from "@/lib/agenda";
import { clients } from "@/lib/mock";
import { cn } from "@/lib/utils";

const clientMap = Object.fromEntries(clients.map(c => [c.id, c]));

/** Hora limite (em horas locais) considerada "fim" de cada turno. */
const SHIFT_END_HOUR: Record<VisitShift, number> = {
  manha: 12,
  tarde: 18,
  noite: 22,
};

const SHIFT_LABEL: Record<VisitShift, string> = {
  manha: "manhã",
  tarde: "tarde",
  noite: "noite",
};

const checklistDone = (v: Visit) => {
  if (!v.checklist || v.checklist.length === 0) return false;
  return v.checklist.every(i => i.done);
};

interface Props {
  visits: Visit[];
}

export function DailySummaryPanel({ visits }: Props) {
  const [expanded, setExpanded] = useState(false);
  const today = todayISO();
  const now = new Date();
  const currentHour = now.getHours() + now.getMinutes() / 60;

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

    const checklist100 = realizadas.filter(checklistDone);
    const checklistRate = realizadas.length > 0
      ? Math.round((checklist100.length / realizadas.length) * 100)
      : 0;

    // Atrasos: pendentes cujo turno já encerrou; ou em_visita com check-in após o fim do turno.
    const atrasos = dayVisits.filter(v => {
      if (v.status === "pendente" || v.status === "em_visita") {
        return currentHour > SHIFT_END_HOUR[v.shift];
      }
      if (v.status === "concluida" && v.checkIn?.at) {
        const ci = new Date(v.checkIn.at);
        return ci.getHours() + ci.getMinutes() / 60 > SHIFT_END_HOUR[v.shift];
      }
      return false;
    });

    // Motivos agregados (cancel + reagendamento)
    const motivos = new Map<string, number>();
    [...canceladas, ...reagendadas].forEach(v => {
      const r = (v.cancelReason || v.rescheduleReason || "").trim();
      if (!r) return;
      const key = r.toLowerCase();
      motivos.set(key, (motivos.get(key) ?? 0) + 1);
    });
    const motivosTop = Array.from(motivos.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, count]) => ({ label, count }));

    const semMotivo = [...canceladas, ...reagendadas].filter(
      v => !(v.cancelReason || v.rescheduleReason)?.trim()
    ).length;

    const concluidaPct = total > 0 ? Math.round((realizadas.length / total) * 100) : 0;

    return {
      total,
      realizadas: realizadas.length,
      canceladas: canceladas.length,
      reagendadas: reagendadas.length,
      pendentes: pendentes.length,
      checklist100: checklist100.length,
      checklistRate,
      atrasos,
      motivosTop,
      semMotivo,
      concluidaPct,
    };
  }, [dayVisits, currentHour]);

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
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
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
          icon={<AlertTriangle className="h-3.5 w-3.5" />}
          label="Atrasos"
          value={`${stats.atrasos.length}`}
          hint={stats.atrasos.length > 0 ? "turno excedido" : "no horário"}
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
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {/* Lista de atrasos */}
          <div className="rounded-xl bg-muted/30 p-2.5">
            <p className="mb-1.5 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-warning">
              <Clock className="h-3 w-3" /> Atrasos ({stats.atrasos.length})
            </p>
            {stats.atrasos.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">Nenhum atraso até agora.</p>
            ) : (
              <ul className="space-y-1">
                {stats.atrasos.slice(0, 6).map(v => {
                  const c = clientMap[v.clientId];
                  return (
                    <li key={v.id} className="flex items-center justify-between gap-2 rounded-lg bg-background/60 px-2 py-1">
                      <span className="truncate text-[11px] font-semibold">
                        {c?.fantasy ?? v.clientId}
                      </span>
                      <span className="shrink-0 rounded-full bg-warning-soft px-1.5 py-0.5 text-[9px] font-bold text-warning">
                        {SHIFT_LABEL[v.shift]} · {v.status === "pendente" ? "não iniciada" : v.status === "em_visita" ? "em curso" : "tardia"}
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

          {/* Motivos */}
          <div className="rounded-xl bg-muted/30 p-2.5">
            <p className="mb-1.5 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-danger">
              <CalendarClock className="h-3 w-3" /> Motivos (cancel/reagendamento)
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
                    <span className="truncate text-[11px] capitalize">{m.label}</span>
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
