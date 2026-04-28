import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ListChecks, MapPin, Sun, Sunset, Moon, Check, X, CalendarClock,
  PlayCircle, RotateCcw, ChevronDown, ChevronUp,
} from "lucide-react";
import { Visit, VisitStatus, VisitShift, todayISO } from "@/lib/agenda";
import { clients, formatBRL } from "@/lib/mock";
import { cn } from "@/lib/utils";
import { ReasonPicker } from "@/components/ReasonPicker";

const clientMap = Object.fromEntries(clients.map(c => [c.id, c]));

type StatusFilter = "todas" | "agendada" | "realizada" | "reagendada" | "cancelada";

const STATUS_META: Record<VisitStatus, { label: string; cls: string; dot: string }> = {
  pendente:   { label: "Agendada",   cls: "bg-primary/10 text-primary",        dot: "bg-primary" },
  em_visita:  { label: "Em visita",  cls: "bg-accent/15 text-accent",          dot: "bg-accent" },
  concluida:  { label: "Realizada",  cls: "bg-success-soft text-success",      dot: "bg-success" },
  remarcada:  { label: "Reagendada", cls: "bg-warning-soft text-warning",      dot: "bg-warning" },
  cancelada:  { label: "Cancelada",  cls: "bg-muted text-muted-foreground line-through", dot: "bg-muted-foreground" },
};

const FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "todas",      label: "Todas" },
  { value: "agendada",   label: "Agendadas" },
  { value: "realizada",  label: "Realizadas" },
  { value: "reagendada", label: "Reagendadas" },
  { value: "cancelada",  label: "Canceladas" },
];

const matchFilter = (status: VisitStatus, f: StatusFilter) => {
  if (f === "todas") return true;
  if (f === "agendada") return status === "pendente" || status === "em_visita";
  if (f === "realizada") return status === "concluida";
  if (f === "reagendada") return status === "remarcada";
  if (f === "cancelada") return status === "cancelada";
  return true;
};

const ShiftIcon = (s: VisitShift) => s === "manha" ? Sun : s === "tarde" ? Sunset : Moon;

const formatDay = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const today = todayISO();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tIso = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
  if (iso === today) return "Hoje";
  if (iso === tIso) return "Amanhã";
  const day = dt.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
  const short = dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  return `${day} · ${short}`;
};

interface Props {
  visits: Visit[];
  onUpdate: (id: string, patch: Partial<Visit>) => void;
  onReschedule: (v: Visit) => void;
  /** Limite máximo de itens exibidos quando colapsado. */
  initialLimit?: number;
}

export function UpcomingVisits({ visits, onUpdate, onReschedule, initialLimit = 5 }: Props) {
  const [filter, setFilter] = useState<StatusFilter>("todas");
  const [expanded, setExpanded] = useState(false);

  const today = todayISO();

  const upcoming = useMemo(() => {
    return visits
      .filter(v => v.date >= today)
      .filter(v => matchFilter(v.status, filter))
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        const order = { manha: 0, tarde: 1, noite: 2 } as const;
        return order[a.shift] - order[b.shift];
      });
  }, [visits, filter, today]);

  const counts = useMemo(() => {
    const all = visits.filter(v => v.date >= today);
    return {
      total: all.length,
      agendada: all.filter(v => v.status === "pendente" || v.status === "em_visita").length,
      realizada: all.filter(v => v.status === "concluida").length,
      reagendada: all.filter(v => v.status === "remarcada").length,
      cancelada: all.filter(v => v.status === "cancelada").length,
    };
  }, [visits, today]);

  const visible = expanded ? upcoming : upcoming.slice(0, initialLimit);
  const hasMore = upcoming.length > initialLimit;

  const [cancelTarget, setCancelTarget] = useState<Visit | null>(null);

  const setStatus = (v: Visit, status: VisitStatus) => {
    if (status === "cancelada") {
      setCancelTarget(v);
      return;
    }
    onUpdate(v.id, { status });
  };

  return (
    <section className="mb-4 rounded-2xl bg-card p-3 shadow-soft">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="inline-flex items-center gap-1.5 text-sm font-semibold">
          <ListChecks className="h-4 w-4 text-primary" />
          Próximas visitas
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
            {counts.total}
          </span>
        </h2>
        <div className="flex items-center gap-1.5 text-[10px] font-semibold">
          <span className="inline-flex items-center gap-1 text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" /> {counts.agendada}
          </span>
          <span className="inline-flex items-center gap-1 text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success" /> {counts.realizada}
          </span>
          <span className="inline-flex items-center gap-1 text-warning">
            <span className="h-1.5 w-1.5 rounded-full bg-warning" /> {counts.reagendada}
          </span>
        </div>
      </div>

      {/* Filtros */}
      <div className="mb-2 flex gap-1 overflow-x-auto no-scrollbar">
        {FILTER_OPTIONS.map(o => {
          const active = filter === o.value;
          return (
            <button
              key={o.value}
              onClick={() => setFilter(o.value)}
              className={cn(
                "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold transition",
                active ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground hover:bg-muted"
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>

      {upcoming.length === 0 ? (
        <p className="rounded-xl bg-muted/30 p-3 text-center text-xs text-muted-foreground">
          Nenhuma visita {filter !== "todas" ? FILTER_OPTIONS.find(o => o.value === filter)?.label.toLowerCase() : ""} no período.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {visible.map(v => {
            const c = clientMap[v.clientId];
            if (!c) return null;
            const meta = STATUS_META[v.status];
            const SIcon = ShiftIcon(v.shift);
            const isFinal = v.status === "concluida" || v.status === "cancelada";

            return (
              <li
                key={v.id}
                className={cn(
                  "rounded-xl border border-border/60 bg-background/40 p-2",
                  v.status === "cancelada" && "opacity-60",
                  v.status === "em_visita" && "ring-1 ring-primary/40"
                )}
              >
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-muted/60 text-muted-foreground">
                    <SIcon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <Link
                        to={`/clientes/${c.id}`}
                        className={cn("truncate text-sm font-semibold hover:underline",
                          v.status === "cancelada" && "line-through"
                        )}
                      >
                        {c.fantasy}
                      </Link>
                      <span className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide", meta.cls)}>
                        {meta.label}
                      </span>
                    </div>
                    <p className="truncate text-[11px] text-muted-foreground inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      <span className="font-semibold text-foreground/80">{formatDay(v.date)}</span>
                      <span>· {c.city}</span>
                      <span className="num">· {formatBRL(v.realized ?? v.projected)}</span>
                    </p>
                  </div>
                </div>

                {/* Ações rápidas de status */}
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {v.status !== "concluida" && (
                    <button
                      onClick={() => setStatus(v, "concluida")}
                      className="inline-flex items-center gap-1 rounded-lg bg-success-soft px-2 py-1 text-[10px] font-bold text-success transition active:scale-95 hover:bg-success/20"
                    >
                      <Check className="h-3 w-3" /> Realizada
                    </button>
                  )}
                  {v.status === "pendente" && (
                    <button
                      onClick={() => setStatus(v, "em_visita")}
                      className="inline-flex items-center gap-1 rounded-lg bg-accent/15 px-2 py-1 text-[10px] font-bold text-accent transition active:scale-95 hover:bg-accent/25"
                    >
                      <PlayCircle className="h-3 w-3" /> Iniciar
                    </button>
                  )}
                  {!isFinal && (
                    <button
                      onClick={() => onReschedule(v)}
                      className="inline-flex items-center gap-1 rounded-lg bg-warning-soft px-2 py-1 text-[10px] font-bold text-warning transition active:scale-95 hover:bg-warning/20"
                    >
                      <CalendarClock className="h-3 w-3" /> Reagendar
                    </button>
                  )}
                  {!isFinal && (
                    <button
                      onClick={() => setStatus(v, "cancelada")}
                      className="inline-flex items-center gap-1 rounded-lg bg-muted px-2 py-1 text-[10px] font-bold text-muted-foreground transition active:scale-95 hover:bg-danger-soft hover:text-danger"
                    >
                      <X className="h-3 w-3" /> Cancelar
                    </button>
                  )}
                  {isFinal && (
                    <button
                      onClick={() => setStatus(v, "pendente")}
                      className="inline-flex items-center gap-1 rounded-lg bg-muted/60 px-2 py-1 text-[10px] font-bold text-muted-foreground transition active:scale-95 hover:bg-muted"
                    >
                      <RotateCcw className="h-3 w-3" /> Reabrir
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {hasMore && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-xl bg-muted/40 py-1.5 text-[11px] font-semibold text-muted-foreground transition hover:bg-muted"
        >
          {expanded ? (
            <><ChevronUp className="h-3 w-3" /> Mostrar menos</>
          ) : (
            <><ChevronDown className="h-3 w-3" /> Ver todas ({upcoming.length})</>
          )}
        </button>
      )}
    </section>
  );
}
