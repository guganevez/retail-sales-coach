import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays, Plus, Check, Clock, AlertTriangle, Sparkles, Trash2,
  CalendarPlus, Zap, TrendingDown, X, Target, MapPin,
} from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { useAgenda, suggestionsForDate, todayISO, Visit } from "@/lib/agenda";
import { useHolidays } from "@/lib/holidays";
import { computeDailyPace } from "@/lib/workdays";
import { clients, formatBRL, salesperson } from "@/lib/mock";
import { getCycleInfo } from "@/lib/cycle";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const clientMap = Object.fromEntries(clients.map(c => [c.id, c]));

const formatDateLabel = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const dayName = dt.toLocaleDateString("pt-BR", { weekday: "short" });
  const dayShort = dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  return `${dayName.replace(".", "")} · ${dayShort}`;
};

const Agenda = () => {
  const { visits, add, update, remove } = useAgenda();
  const { holidays, add: addHoliday, remove: removeHoliday, isHoliday } = useHolidays();
  const holidaySet = useMemo(() => new Set(holidays.map(h => h.date)), [holidays]);

  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [forceClient, setForceClient] = useState<string | null>(null);
  const [holidayDialog, setHolidayDialog] = useState(false);
  const [newHolidayDate, setNewHolidayDate] = useState("");
  const [newHolidayLabel, setNewHolidayLabel] = useState("");

  // Pace base do mês
  const pace = computeDailyPace(salesperson.goalMonth, salesperson.achievedMonth, new Date(), holidaySet);

  // Visitas do dia selecionado
  const dayVisits = visits
    .filter(v => v.date === selectedDate)
    .sort((a, b) => {
      const order = { manha: 0, tarde: 1, noite: 2 } as const;
      return order[a.shift] - order[b.shift];
    });

  // Sugestões para o dia (excluindo já agendadas)
  const suggestions = useMemo(
    () => suggestionsForDate(selectedDate, visits).slice(0, 6),
    [selectedDate, visits]
  );

  // Simulação: somatório do projetado das visitas pendentes/concluídas do dia
  const dayProjected = dayVisits.reduce((s, v) => s + (v.realized ?? v.projected), 0);
  const dayRealized = dayVisits.filter(v => v.status === "concluida").reduce((s, v) => s + (v.realized ?? 0), 0);

  // Considera realizado de hoje (do salesperson) + projeções das visitas futuras do dia
  const isToday = selectedDate === todayISO();
  const realizedToday = isToday ? salesperson.achievedToday : 0;
  const projectedRest = dayVisits
    .filter(v => v.status === "pendente")
    .reduce((s, v) => s + v.projected, 0);
  const simulatedTotalToday = realizedToday + projectedRest;
  const dailyGoal = pace.dailyGoal;
  const simulatedPct = dailyGoal > 0 ? (simulatedTotalToday / dailyGoal) * 100 : 0;

  // Alerta de risco
  const expectedSoFar = dailyGoal; // alvo do dia
  const actualPct = expectedSoFar > 0 ? (realizedToday / expectedSoFar) * 100 : 0;
  const isAtRisk = isToday && pace.isWorkdayToday && actualPct < 80;

  // Próximas datas (7 dias)
  const next7 = useMemo(() => {
    const arr: string[] = [];
    const d = new Date();
    for (let i = 0; i < 7; i++) {
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      arr.push(iso);
      d.setDate(d.getDate() + 1);
    }
    return arr;
  }, []);

  const handleAddSuggestion = (clientId: string, origin: Visit["origin"] = "sugestao_ciclo") => {
    const c = clientMap[clientId];
    if (!c) return;
    add({
      clientId,
      date: selectedDate,
      shift: "tarde",
      status: "pendente",
      origin,
      projected: c.avgTicket,
    });
  };

  const handleForceVisit = () => {
    if (!forceClient) return;
    handleAddSuggestion(forceClient, "forcada");
    setForceClient(null);
  };

  const handleAddHoliday = () => {
    if (!newHolidayDate || !newHolidayLabel.trim()) return;
    addHoliday({ date: newHolidayDate, label: newHolidayLabel.trim() });
    setNewHolidayDate("");
    setNewHolidayLabel("");
  };

  const eligibleForce = clients.filter(c => c.status !== "bloqueado");

  return (
    <MobileShell title="Agenda" subtitle="Roteiro & meta diária">
      {/* Alerta de risco */}
      {isAtRisk && (
        <section className="mb-4 rounded-2xl border border-warning/40 bg-warning-soft p-3 shadow-soft">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-warning text-warning-foreground">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-warning">Risco de ficar fora da meta hoje</p>
              <p className="mt-0.5 text-xs text-foreground">
                Você está em <strong className="num">{actualPct.toFixed(0)}%</strong> do esperado
                ({formatBRL(realizedToday)} de {formatBRL(dailyGoal)}).
                Faltam <strong className="num">{formatBRL(Math.max(0, dailyGoal - realizedToday))}</strong>.
              </p>
              {suggestions.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-[10px] font-bold uppercase text-warning">Priorize agora:</p>
                  {suggestions.slice(0, 2).map(s => (
                    <button
                      key={s.client.id}
                      onClick={() => handleAddSuggestion(s.client.id, "forcada")}
                      className="flex w-full items-center justify-between gap-2 rounded-xl bg-card p-2 text-left shadow-soft active:scale-[0.99]"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold">{s.client.fantasy}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {s.info.priority === "atrasado"
                            ? `Atrasado ${s.info.overdueDays}d`
                            : `Ciclo ~${s.info.cycleDays}d`} · ticket {formatBRL(s.client.avgTicket)}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-warning px-2 py-0.5 text-[10px] font-bold text-warning-foreground">
                        + agendar
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Simulador da meta diária */}
      <section className="mb-4 rounded-2xl bg-card p-4 shadow-soft">
        <div className="flex items-start justify-between">
          <div>
            <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <Target className="h-3.5 w-3.5" /> Simulação do dia
            </p>
            <p className="mt-1 text-2xl font-bold num">{formatBRL(simulatedTotalToday)}</p>
            <p className="text-[11px] text-muted-foreground">
              Meta {formatBRL(dailyGoal)} ·{" "}
              {pace.elapsedWorkdays}/{pace.totalWorkdays} dias úteis
            </p>
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold",
              simulatedPct >= 100 ? "bg-success-soft text-success"
              : simulatedPct >= 80 ? "bg-primary/10 text-primary"
              : "bg-warning-soft text-warning"
            )}
          >
            <Zap className="h-3 w-3" />
            {simulatedPct.toFixed(0)}%
          </span>
        </div>

        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-l-full",
              actualPct >= 100 ? "bg-success" : "bg-primary"
            )}
            style={{ width: `${Math.min(100, actualPct)}%` }}
          />
          <div
            className="h-full -mt-2.5 bg-primary/30"
            style={{
              width: `${Math.min(100, simulatedPct) - Math.min(100, actualPct)}%`,
              marginLeft: `${Math.min(100, actualPct)}%`,
            }}
          />
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl bg-muted/40 p-2.5">
            <p className="text-[10px] uppercase text-muted-foreground">Realizado</p>
            <p className="font-bold num">{formatBRL(realizedToday)}</p>
          </div>
          <div className="rounded-xl bg-primary/10 p-2.5">
            <p className="text-[10px] uppercase text-primary">Projetado (visitas)</p>
            <p className="font-bold text-primary num">+{formatBRL(projectedRest)}</p>
          </div>
        </div>
        {dayVisits.filter(v => v.status === "pendente").length === 0 && isToday && (
          <p className="mt-2 text-[11px] text-muted-foreground">
            Adicione visitas abaixo para simular o atingimento.
          </p>
        )}
      </section>

      {/* Seletor de data */}
      <section className="mb-3">
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {next7.map(iso => {
            const [y, m, d] = iso.split("-").map(Number);
            const dt = new Date(y, m - 1, d);
            const isWeekend = dt.getDay() === 0 || dt.getDay() === 6;
            const holiday = isHoliday(dt);
            const nonWorking = isWeekend || !!holiday;
            const count = visits.filter(v => v.date === iso).length;
            const active = selectedDate === iso;
            return (
              <button
                key={iso}
                onClick={() => setSelectedDate(iso)}
                className={cn(
                  "shrink-0 rounded-2xl px-3 py-2 text-center transition shadow-soft",
                  active ? "bg-primary text-primary-foreground" : "bg-card",
                  nonWorking && !active && "opacity-70"
                )}
              >
                <p className={cn("text-[10px] font-bold uppercase",
                  active ? "opacity-90" : "text-muted-foreground"
                )}>
                  {dt.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "")}
                </p>
                <p className="text-base font-bold num">{dt.getDate()}</p>
                <p className={cn("text-[10px]", active ? "opacity-90" : "text-muted-foreground")}>
                  {holiday ? "feriado" : isWeekend ? "—" : count > 0 ? `${count} visita${count > 1 ? "s" : ""}` : "livre"}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Visitas programadas do dia */}
      <section className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="inline-flex items-center gap-1.5 text-sm font-semibold">
            <CalendarDays className="h-4 w-4 text-primary" />
            {formatDateLabel(selectedDate)}
          </h2>
          <span className="text-[11px] text-muted-foreground">
            Projetado: <strong className="num text-foreground">{formatBRL(dayProjected)}</strong>
            {dayRealized > 0 && <> · realizado <strong className="num text-success">{formatBRL(dayRealized)}</strong></>}
          </span>
        </div>

        {dayVisits.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-4 text-center">
            <CalendarDays className="mx-auto h-6 w-6 text-muted-foreground" />
            <p className="mt-2 text-xs text-muted-foreground">Nenhuma visita programada</p>
          </div>
        ) : (
          <div className="space-y-2">
            {dayVisits.map(v => {
              const c = clientMap[v.clientId];
              if (!c) return null;
              const info = getCycleInfo(c);
              return (
                <div
                  key={v.id}
                  className={cn(
                    "rounded-2xl bg-card p-3 shadow-soft",
                    v.status === "concluida" && "opacity-70"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span className={cn(
                      "grid h-9 w-9 shrink-0 place-items-center rounded-xl text-xs font-bold",
                      v.origin === "forcada" ? "bg-warning text-warning-foreground"
                      : v.origin === "sugestao_ciclo" ? "bg-accent/15 text-accent"
                      : "bg-primary/10 text-primary"
                    )}>
                      {v.shift === "manha" ? "M" : v.shift === "tarde" ? "T" : "N"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <Link to={`/clientes/${c.id}`} className="block">
                        <p className="truncate text-sm font-semibold">{c.fantasy}</p>
                        <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" />{c.city} · {c.segment}
                        </p>
                      </Link>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {v.origin === "forcada" && (
                          <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[10px] font-bold text-warning">
                            forçada
                          </span>
                        )}
                        {v.origin === "sugestao_ciclo" && (
                          <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold text-accent">
                            ciclo
                          </span>
                        )}
                        {info.priority === "atrasado" && (
                          <span className="rounded-full bg-danger-soft px-2 py-0.5 text-[10px] font-bold text-danger">
                            atrasado {info.overdueDays}d
                          </span>
                        )}
                        <span className="text-[11px] text-muted-foreground num">
                          {v.realized
                            ? `R$ ${(v.realized).toFixed(0)} realizado`
                            : `proj. ${formatBRL(v.projected)}`}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      {v.status === "pendente" ? (
                        <button
                          onClick={() => update(v.id, { status: "concluida", realized: v.projected })}
                          className="grid h-8 w-8 place-items-center rounded-lg bg-success-soft text-success transition active:scale-95"
                          aria-label="Concluir visita"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      ) : (
                        <span className="grid h-8 w-8 place-items-center rounded-lg bg-success text-success-foreground">
                          <Check className="h-4 w-4" />
                        </span>
                      )}
                      <button
                        onClick={() => remove(v.id)}
                        className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition active:scale-95 hover:bg-muted"
                        aria-label="Remover"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Visita não programada (forçada) */}
      <section className="mb-4 rounded-2xl border border-warning/30 bg-warning-soft/40 p-3">
        <div className="mb-2 flex items-center gap-1.5">
          <Zap className="h-4 w-4 text-warning" />
          <h3 className="text-sm font-semibold">Forçar visita (não programada)</h3>
        </div>
        <div className="flex gap-2">
          <select
            value={forceClient ?? ""}
            onChange={(e) => setForceClient(e.target.value || null)}
            className="flex-1 rounded-xl border border-border bg-card px-3 py-2 text-sm"
          >
            <option value="">Escolher cliente...</option>
            {eligibleForce.map(c => (
              <option key={c.id} value={c.id}>{c.fantasy} · {c.city}</option>
            ))}
          </select>
          <button
            onClick={handleForceVisit}
            disabled={!forceClient}
            className="rounded-xl bg-warning px-3 py-2 text-xs font-bold text-warning-foreground disabled:opacity-50"
          >
            <CalendarPlus className="mr-1 inline h-4 w-4" />
            Adicionar
          </button>
        </div>
      </section>

      {/* Sugestões por ciclo */}
      <section className="mb-4">
        <div className="mb-2 flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-semibold">Sugestões por ciclo de venda</h2>
        </div>
        {suggestions.length === 0 ? (
          <p className="rounded-2xl bg-card p-3 text-center text-xs text-muted-foreground shadow-soft">
            Nenhuma sugestão pendente — bom trabalho!
          </p>
        ) : (
          <div className="space-y-2">
            {suggestions.map(({ client, info }) => (
              <button
                key={client.id}
                onClick={() => handleAddSuggestion(client.id)}
                className="flex w-full items-center gap-3 rounded-2xl bg-card p-3 text-left shadow-soft transition active:scale-[0.99]"
              >
                <span className={cn(
                  "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
                  info.priority === "atrasado" ? "bg-danger-soft text-danger"
                  : info.priority === "no_ciclo" ? "bg-warning-soft text-warning"
                  : "bg-accent/10 text-accent"
                )}>
                  {info.priority === "atrasado"
                    ? <TrendingDown className="h-5 w-5" />
                    : <Clock className="h-5 w-5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{client.fantasy}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Ciclo ~{info.cycleDays}d ({info.source}) ·{" "}
                    {info.priority === "atrasado"
                      ? `atrasado ${info.overdueDays}d`
                      : `há ${info.daysSinceLast}d sem comprar`}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Ticket {formatBRL(client.avgTicket)} · {client.segment}
                  </p>
                </div>
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
                  <Plus className="h-4 w-4" />
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Cadastro de feriados */}
      <section className="mb-4 rounded-2xl bg-card p-3 shadow-soft">
        <div className="flex items-center justify-between">
          <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold">
            <CalendarDays className="h-4 w-4 text-primary" />
            Feriados ({holidays.length})
          </h3>
          <button
            onClick={() => setHolidayDialog(true)}
            className="rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
          >
            Gerenciar
          </button>
        </div>
        {holidays.length === 0 ? (
          <p className="mt-2 text-[11px] text-muted-foreground">
            Nenhum feriado cadastrado. Adicione para refinar o cálculo da meta diária.
          </p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {holidays.slice(0, 5).map(h => (
              <span key={h.date} className="rounded-full bg-muted px-2 py-1 text-[11px]">
                {h.label} · {h.date.slice(8, 10)}/{h.date.slice(5, 7)}
              </span>
            ))}
            {holidays.length > 5 && (
              <span className="rounded-full bg-muted px-2 py-1 text-[11px] text-muted-foreground">
                +{holidays.length - 5}
              </span>
            )}
          </div>
        )}
      </section>

      <Dialog open={holidayDialog} onOpenChange={setHolidayDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Feriados regionais</DialogTitle>
            <DialogDescription>
              Datas marcadas aqui são tratadas como não-úteis no cálculo da meta diária.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                type="date"
                value={newHolidayDate}
                onChange={(e) => setNewHolidayDate(e.target.value)}
                className="flex-1"
              />
              <Input
                placeholder="Descrição (ex.: Aniversário cidade)"
                value={newHolidayLabel}
                onChange={(e) => setNewHolidayLabel(e.target.value)}
                className="flex-1"
              />
              <button
                onClick={handleAddHoliday}
                disabled={!newHolidayDate || !newHolidayLabel.trim()}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
              >
                Adicionar
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto space-y-1">
              {holidays.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  Nenhum feriado cadastrado.
                </p>
              ) : (
                holidays.map(h => (
                  <div key={h.date} className="flex items-center justify-between rounded-xl bg-muted/40 p-2">
                    <div>
                      <p className="text-sm font-semibold">{h.label}</p>
                      <p className="text-[11px] text-muted-foreground num">
                        {h.date.split("-").reverse().join("/")}
                      </p>
                    </div>
                    <button
                      onClick={() => removeHoliday(h.date)}
                      className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-card"
                      aria-label="Remover"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </MobileShell>
  );
};

export default Agenda;
