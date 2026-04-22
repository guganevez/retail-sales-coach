import { useMemo, useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { StatCard } from "@/components/StatCard";
import { DailyGoalCard } from "@/components/DailyGoalCard";
import { AdvancedKpis } from "@/components/AdvancedKpis";
import { clients, formatBRL, formatPct, salesperson } from "@/lib/mock";
import { Trophy, Users, TrendingDown, UserCircle2, UsersRound, Building2 } from "lucide-react";
import { useProfile, ROLE_LABEL } from "@/lib/profile";
import { useHolidays } from "@/lib/holidays";
import { cn } from "@/lib/utils";
import {
  reps, supervisors, manager,
  kpisForManager, kpisForRep, kpisForSupervisor, aggregate,
} from "@/lib/team";

const Painel = () => {
  const {
    role, scope, setScope,
    profile,
    selectedRepId, setSelectedRepId,
    selectedSupervisorId, setSelectedSupervisorId,
  } = useProfile();
  const { holidays } = useHolidays();
  const holidaySet = useMemo(() => new Set(holidays.map(h => h.date)), [holidays]);

  // Defaults para drill-down
  const [localRepId, setLocalRepId] = useState<string | null>(selectedRepId);

  let kpis = { sold: 0, goal: 0, deals: 0, margin: 0, ticket: 0, commission: 0, goalPct: 0 };
  let label = "";
  let viewSupervisor: typeof supervisors[number] | null = null;

  if (role === "vendedor") {
    kpis = kpisForRep(profile.id);
    label = reps.find(r => r.id === profile.id)?.name ?? profile.name;
  } else if (role === "supervisor") {
    const supId = profile.id;
    if (scope === "individual" && localRepId) {
      kpis = kpisForRep(localRepId);
      label = reps.find(r => r.id === localRepId)!.name;
    } else {
      kpis = kpisForSupervisor(supId);
      label = supervisors.find(s => s.id === supId)?.team ?? "";
    }
    viewSupervisor = supervisors.find(s => s.id === supId) ?? null;
  } else {
    // gerente
    if (selectedRepId) {
      kpis = kpisForRep(selectedRepId);
      const r = reps.find(x => x.id === selectedRepId)!;
      label = `${r.name} · ${r.region}`;
      viewSupervisor = supervisors.find(s => s.id === r.supervisorId)!;
    } else if (selectedSupervisorId) {
      kpis = kpisForSupervisor(selectedSupervisorId);
      const sup = supervisors.find(s => s.id === selectedSupervisorId)!;
      label = sup.team;
      viewSupervisor = sup;
    } else {
      kpis = kpisForManager();
      label = `Direção · ${reps.length} vendedores`;
    }
  }

  // Ranking geral (sempre disponível p/ supervisor e gerente)
  const ranking = role === "gerente"
    ? (selectedRepId
        ? [reps.find(r => r.id === selectedRepId)!]
        : selectedSupervisorId
          ? viewSupervisor!.reps
          : [...reps].sort((a, b) => b.sold - a.sold))
    : role === "supervisor"
      ? viewSupervisor!.reps
      : [];

  const inactives = clients.filter(c => c.lastPurchaseDays > 30 && c.status !== "potencial");

  return (
    <MobileShell title="Painel gerencial" subtitle={role === "vendedor" ? "Sua performance" : `${ROLE_LABEL[role]} · ${label}`}>
      {/* === GERENTE: comparativo de supervisores === */}
      {role === "gerente" && (
        <section className="mb-4">
          <div className="mb-2 flex items-center gap-1.5">
            <Building2 className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Equipes</h2>
          </div>
          <div className="grid gap-2">
            <button
              onClick={() => setSelectedSupervisorId(null)}
              className={cn(
                "rounded-2xl p-3 text-left shadow-soft transition",
                !selectedSupervisorId ? "bg-primary text-primary-foreground" : "bg-card"
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase opacity-80">Visão consolidada</p>
                  <p className="text-sm font-semibold">{manager.area}</p>
                </div>
                <p className="text-sm font-bold num">{formatBRL(kpisForManager().sold)}</p>
              </div>
            </button>
            {supervisors.map(s => {
              const k = kpisForSupervisor(s.id);
              const active = selectedSupervisorId === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedSupervisorId(active ? null : s.id)}
                  className={cn(
                    "rounded-2xl p-3 text-left shadow-soft transition",
                    active ? "bg-primary text-primary-foreground" : "bg-card"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className={cn("text-[10px] font-bold uppercase", active ? "opacity-80" : "text-muted-foreground")}>
                        {s.team}
                      </p>
                      <p className="truncate text-sm font-semibold">{s.name}</p>
                      <p className={cn("text-[11px]", active ? "opacity-80" : "text-muted-foreground")}>
                        {s.reps.length} vendedores · {k.deals} pedidos · margem {formatPct(k.margin)}
                      </p>
                    </div>
                    <p className="text-sm font-bold num">{formatBRL(k.sold)}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Drill-down: vendedores do supervisor selecionado */}
          {selectedSupervisorId && viewSupervisor && (
            <div className="mt-3">
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">Vendedores da equipe</p>
                {selectedRepId && (
                  <button
                    onClick={() => setSelectedRepId(null)}
                    className="text-[10px] font-bold text-primary"
                  >
                    Limpar seleção
                  </button>
                )}
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {viewSupervisor.reps.map(r => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRepId(selectedRepId === r.id ? null : r.id)}
                    className={cn(
                      "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                      selectedRepId === r.id ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"
                    )}
                  >
                    <UserCircle2 className="mr-1 inline h-3 w-3" />
                    {r.name.split(" ")[0]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* === SUPERVISOR: toggle equipe x vendedor === */}
      {role === "supervisor" && (
        <div className="mb-3 flex items-center gap-1 rounded-2xl bg-card p-1 shadow-soft">
          <button
            onClick={() => { setScope("equipe"); setLocalRepId(null); setSelectedRepId(null); }}
            className={cn(
              "flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition",
              scope === "equipe" ? "bg-primary text-primary-foreground shadow-glow" : "text-muted-foreground"
            )}
          >
            <UsersRound className="h-4 w-4" /> Equipe completa
          </button>
          <button
            onClick={() => setScope("individual")}
            className={cn(
              "flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition",
              scope === "individual" ? "bg-primary text-primary-foreground shadow-glow" : "text-muted-foreground"
            )}
          >
            <UserCircle2 className="h-4 w-4" /> Por vendedor
          </button>
        </div>
      )}

      {role === "supervisor" && scope === "individual" && (
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {viewSupervisor!.reps.map(r => (
            <button
              key={r.id}
              onClick={() => { setLocalRepId(r.id); setSelectedRepId(r.id); }}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                localRepId === r.id ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"
              )}
            >
              {r.name.split(" ")[0]}
            </button>
          ))}
        </div>
      )}

      <p className="mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">
        Visualizando: <strong className="text-foreground">{label}</strong>
      </p>

      {/* === KPIs principais === */}
      <section className="grid grid-cols-2 gap-3">
        <StatCard label="Faturamento" value={formatBRL(kpis.sold)} hint={`Meta ${formatBRL(kpis.goal)}`} />
        <StatCard label="Ticket médio" value={formatBRL(kpis.ticket)} hint={`${kpis.deals} pedidos`} />
        <StatCard label="Margem média" value={formatPct(kpis.margin)} tone={kpis.margin >= 8 ? "success" : "warning"} />
        <StatCard label="Comissão prev." value={formatBRL(kpis.commission)} tone="success" />
      </section>

      <section className="mt-3 rounded-2xl bg-card p-3 shadow-soft">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Atingimento da meta mensal</span>
          <span className="font-bold num">{kpis.goalPct.toFixed(0)}%</span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full",
              kpis.goalPct >= 100 ? "bg-success" : kpis.goalPct >= 70 ? "bg-primary" : "bg-warning"
            )}
            style={{ width: `${Math.min(100, kpis.goalPct)}%` }}
          />
        </div>
      </section>

      {/* === Meta diária por dias úteis === */}
      <div className="mt-3">
        <DailyGoalCard
          monthlyGoal={kpis.goal}
          achievedMonth={kpis.sold}
          achievedToday={role === "vendedor" ? salesperson.achievedToday : Math.round(kpis.sold * 0.05)}
          holidays={holidaySet}
        />
      </div>

      {/* === KPIs avançados por papel === */}
      <AdvancedKpis
        role={role}
        scopeId={role === "vendedor" ? profile.id : role === "supervisor" ? profile.id : null}
        selectedSupervisorId={selectedSupervisorId}
      />

      {/* === Ranking de vendedores (supervisor + gerente) === */}
      {role !== "vendedor" && ranking.length > 0 && (
        <section className="mt-5">
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
            <Trophy className="h-4 w-4 text-warning" />
            Ranking {role === "gerente" && !selectedSupervisorId ? "geral" : "da equipe"}
          </h2>
          <div className="space-y-2">
            {ranking
              .slice()
              .sort((a, b) => b.sold - a.sold)
              .map((r, i) => {
                const isMe = false; // demo: o "eu" só aparece como vendedor (visão diferente)
                const k = kpisForRep(r.id);
                return (
                  <button
                    key={r.id}
                    onClick={() => { setScope("individual"); setLocalRepId(r.id); setSelectedRepId(r.id); }}
                    className={cn(
                      "flex w-full items-center justify-between rounded-2xl p-3 shadow-soft text-left transition",
                      isMe ? "bg-primary/5 ring-1 ring-primary/20" : "bg-card",
                      localRepId === r.id && "ring-2 ring-primary"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={cn(
                        "grid h-8 w-8 place-items-center rounded-full text-xs font-bold",
                        i === 0 ? "bg-warning text-warning-foreground" : "bg-muted text-muted-foreground"
                      )}>
                        {i + 1}º
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{r.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {r.region} · {r.deals} pedidos · margem {formatPct(r.margin)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold num">{formatBRL(r.sold)}</p>
                      <p className="text-[10px] text-muted-foreground num">{k.goalPct.toFixed(0)}% meta</p>
                    </div>
                  </button>
                );
              })}
          </div>
        </section>
      )}

      {/* === Conferência hierárquica === */}
      {role === "gerente" && (
        <section className="mt-5 rounded-2xl border border-border bg-card p-3 shadow-soft">
          <h3 className="text-xs font-bold uppercase text-muted-foreground">Soma conferida</h3>
          <div className="mt-2 space-y-1 text-xs">
            {supervisors.map(s => {
              const k = kpisForSupervisor(s.id);
              return (
                <div key={s.id} className="flex justify-between">
                  <span className="text-muted-foreground">{s.team}</span>
                  <span className="font-bold num">{formatBRL(k.sold)}</span>
                </div>
              );
            })}
            <div className="mt-1 flex justify-between border-t border-border pt-1">
              <span className="font-semibold">Total geral</span>
              <span className="font-bold text-primary num">{formatBRL(kpisForManager().sold)}</span>
            </div>
          </div>
        </section>
      )}

      {/* === Inativos === */}
      <section className="mt-5">
        <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
          <TrendingDown className="h-4 w-4 text-warning" /> Clientes inativos ({inactives.length})
        </h2>
        <div className="space-y-2">
          {inactives.map(c => (
            <div key={c.id} className="flex items-center justify-between rounded-2xl bg-card p-3 shadow-soft">
              <div>
                <p className="text-sm font-semibold">{c.fantasy}</p>
                <p className="text-[11px] text-muted-foreground">{c.city} · ticket {formatBRL(c.avgTicket)}</p>
              </div>
              <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[11px] font-bold text-warning num">{c.lastPurchaseDays}d</span>
            </div>
          ))}
        </div>
      </section>

      {/* === Carteira === */}
      <section className="mt-5 rounded-2xl bg-card p-4 shadow-soft">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold"><Users className="h-4 w-4" /> Carteira</h2>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-lg font-bold num">{clients.length}</p>
            <p className="text-[11px] text-muted-foreground">Total</p>
          </div>
          <div>
            <p className="text-lg font-bold text-success num">{clients.filter(c=>c.status==="ativo").length}</p>
            <p className="text-[11px] text-muted-foreground">Ativos</p>
          </div>
          <div>
            <p className="text-lg font-bold text-danger num">{clients.filter(c=>c.status==="bloqueado").length}</p>
            <p className="text-[11px] text-muted-foreground">Bloq.</p>
          </div>
        </div>
      </section>
    </MobileShell>
  );
};

export default Painel;
