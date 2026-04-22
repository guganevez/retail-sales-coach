import { useMemo } from "react";
import {
  TrendingUp, TrendingDown, Award, Activity, AlertCircle,
  Users, ShoppingBag, DollarSign, Percent, Target, Briefcase,
} from "lucide-react";
import { reps, supervisors, kpisForRep, kpisForSupervisor, kpisForManager } from "@/lib/team";
import { clients, formatBRL, formatPct, recentOrders } from "@/lib/mock";
import { trackedOrders } from "@/lib/tracking";
import { Role } from "@/lib/profile";
import { cn } from "@/lib/utils";

interface AdvancedKpisProps {
  role: Role;
  /** Para vendedor/supervisor: id da identidade ativa. Para gerente: opcional drill-down. */
  scopeId?: string | null;
  /** Para gerente: supervisor selecionado para drill */
  selectedSupervisorId?: string | null;
}

const Card: React.FC<{ icon: React.ElementType; label: string; value: string; hint?: string; tone?: "default"|"success"|"warning"|"danger" }> = ({ icon: Icon, label, value, hint, tone = "default" }) => (
  <div className="rounded-2xl bg-card p-3 shadow-soft">
    <div className="flex items-center gap-2">
      <span className={cn("grid h-7 w-7 place-items-center rounded-lg",
        tone === "success" ? "bg-success-soft text-success" :
        tone === "warning" ? "bg-warning-soft text-warning" :
        tone === "danger" ? "bg-danger-soft text-danger" :
        "bg-primary/10 text-primary"
      )}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <p className="text-[10px] font-bold uppercase text-muted-foreground">{label}</p>
    </div>
    <p className={cn("mt-1 text-lg font-bold num",
      tone === "success" && "text-success",
      tone === "warning" && "text-warning",
      tone === "danger" && "text-danger",
    )}>{value}</p>
    {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
  </div>
);

export function AdvancedKpis({ role, scopeId, selectedSupervisorId }: AdvancedKpisProps) {
  const data = useMemo(() => {
    if (role === "vendedor" && scopeId) {
      const rep = reps.find(r => r.id === scopeId);
      const k = kpisForRep(scopeId);
      const repOrders = trackedOrders.filter(o => o.repId === scopeId);
      const delivered = repOrders.filter(o => o.status === "entregue").length;
      const inRoute = repOrders.filter(o => ["separacao","carga","em_rota"].includes(o.status)).length;
      const cancelled = repOrders.filter(o => o.status === "cancelado").length;
      return { rep, k, delivered, inRoute, cancelled };
    }
    return null;
  }, [role, scopeId]);

  if (role === "vendedor" && data?.rep) {
    const { rep, k, delivered, inRoute, cancelled } = data;
    const goalGap = rep.goal - rep.sold;
    return (
      <section className="mt-4 space-y-3">
        <h2 className="inline-flex items-center gap-1.5 text-sm font-semibold">
          <Award className="h-4 w-4 text-accent" /> KPIs detalhados — {rep.name.split(" ")[0]}
        </h2>
        <div className="grid grid-cols-2 gap-2">
          <Card icon={Target} label="Gap p/ meta" value={formatBRL(Math.max(0, goalGap))}
            tone={goalGap <= 0 ? "success" : "warning"}
            hint={goalGap <= 0 ? "Meta batida 🎉" : `${k.goalPct.toFixed(0)}% atingido`} />
          <Card icon={Percent} label="Margem média" value={formatPct(rep.margin)}
            tone={rep.margin >= 9 ? "success" : rep.margin >= 6 ? "default" : "warning"} />
          <Card icon={ShoppingBag} label="Pedidos entregues" value={String(delivered)} hint={`${inRoute} em rota`} />
          <Card icon={AlertCircle} label="Cancelados" value={String(cancelled)}
            tone={cancelled > 0 ? "danger" : "default"} />
          <Card icon={DollarSign} label="Ticket médio" value={formatBRL(k.ticket)} hint={`${k.deals} pedidos`} />
          <Card icon={Activity} label="Comissão prev." value={formatBRL(k.commission)} tone="success" />
        </div>
      </section>
    );
  }

  if (role === "supervisor" && scopeId) {
    const sup = supervisors.find(s => s.id === scopeId);
    if (!sup) return null;
    const k = kpisForSupervisor(scopeId);
    const ranked = [...sup.reps].sort((a, b) => b.sold - a.sold);
    const top = ranked[0];
    const bottom = ranked[ranked.length - 1];
    const avgMargin = k.margin;
    const overGoal = sup.reps.filter(r => r.sold >= r.goal).length;
    return (
      <section className="mt-4 space-y-3">
        <h2 className="inline-flex items-center gap-1.5 text-sm font-semibold">
          <Users className="h-4 w-4 text-primary" /> KPIs da equipe — {sup.team}
        </h2>
        <div className="grid grid-cols-2 gap-2">
          <Card icon={Award} label="Bateram meta" value={`${overGoal}/${sup.reps.length}`}
            tone={overGoal === sup.reps.length ? "success" : overGoal === 0 ? "danger" : "warning"} />
          <Card icon={Percent} label="Margem equipe" value={formatPct(avgMargin)}
            tone={avgMargin >= 8 ? "success" : "warning"} />
          <Card icon={TrendingUp} label="Top vendedor" value={top.name.split(" ")[0]}
            hint={formatBRL(top.sold)} tone="success" />
          <Card icon={TrendingDown} label="Precisa apoio" value={bottom.name.split(" ")[0]}
            hint={formatBRL(bottom.sold)} tone="warning" />
          <Card icon={DollarSign} label="Ticket médio" value={formatBRL(k.ticket)} hint={`${k.deals} pedidos`} />
          <Card icon={Activity} label="Comissão equipe" value={formatBRL(k.commission)} tone="success" />
        </div>

        {/* Detalhe por vendedor */}
        <div className="rounded-2xl bg-card p-3 shadow-soft">
          <p className="mb-2 text-[10px] font-bold uppercase text-muted-foreground">Performance por vendedor</p>
          <div className="space-y-2">
            {ranked.map(r => {
              const rk = kpisForRep(r.id);
              const pct = Math.min(100, rk.goalPct);
              return (
                <div key={r.id}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold">{r.name}</span>
                    <span className="num font-bold">{formatBRL(r.sold)} <span className="text-muted-foreground font-normal">({rk.goalPct.toFixed(0)}%)</span></span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className={cn("h-full",
                      pct >= 100 ? "bg-success" : pct >= 70 ? "bg-primary" : "bg-warning"
                    )} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  if (role === "gerente") {
    const k = kpisForManager();
    const totalReps = reps.length;
    const overGoal = reps.filter(r => r.sold >= r.goal).length;
    const bestSup = [...supervisors].sort((a, b) => kpisForSupervisor(b.id).sold - kpisForSupervisor(a.id).sold)[0];
    const bestRep = [...reps].sort((a, b) => b.sold - a.sold)[0];
    const activeClients = clients.filter(c => c.status === "ativo").length;
    const blockedClients = clients.filter(c => c.status === "bloqueado").length;

    return (
      <section className="mt-4 space-y-3">
        <h2 className="inline-flex items-center gap-1.5 text-sm font-semibold">
          <Briefcase className="h-4 w-4 text-primary" /> KPIs da diretoria
        </h2>
        <div className="grid grid-cols-2 gap-2">
          <Card icon={Award} label="Vendedores na meta" value={`${overGoal}/${totalReps}`}
            tone={overGoal >= totalReps * 0.7 ? "success" : "warning"} />
          <Card icon={Percent} label="Margem geral" value={formatPct(k.margin)}
            tone={k.margin >= 8 ? "success" : "warning"} />
          <Card icon={TrendingUp} label="Melhor equipe" value={bestSup.name.split(" ")[0]}
            hint={bestSup.team} tone="success" />
          <Card icon={Award} label="Top vendedor" value={bestRep.name.split(" ")[0]}
            hint={`${bestRep.region} · ${formatBRL(bestRep.sold)}`} tone="success" />
          <Card icon={Users} label="Carteira ativa" value={String(activeClients)}
            hint={`${blockedClients} bloqueado(s)`} />
          <Card icon={DollarSign} label="Comissão total" value={formatBRL(k.commission)} tone="success" />
        </div>

        {/* Por supervisor */}
        <div className="rounded-2xl bg-card p-3 shadow-soft">
          <p className="mb-2 text-[10px] font-bold uppercase text-muted-foreground">Comparativo por supervisor</p>
          <div className="space-y-3">
            {supervisors.map(s => {
              const sk = kpisForSupervisor(s.id);
              const pct = Math.min(100, sk.goalPct);
              return (
                <div key={s.id}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold">{s.team}</span>
                    <span className="num font-bold">{formatBRL(sk.sold)} <span className="text-muted-foreground font-normal">({sk.goalPct.toFixed(0)}%)</span></span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className={cn("h-full",
                      pct >= 100 ? "bg-success" : pct >= 70 ? "bg-primary" : "bg-warning"
                    )} style={{ width: `${pct}%` }} />
                  </div>
                  {/* mini-ranking dos vendedores do sup, se for o selecionado */}
                  {selectedSupervisorId === s.id && (
                    <div className="mt-2 ml-3 space-y-1.5 border-l border-border pl-2">
                      {[...s.reps].sort((a, b) => b.sold - a.sold).map(r => {
                        const rk = kpisForRep(r.id);
                        return (
                          <div key={r.id} className="flex items-center justify-between text-[11px]">
                            <span>{r.name}</span>
                            <span className="num text-muted-foreground">
                              {formatBRL(r.sold)} <span className="text-[10px]">({rk.goalPct.toFixed(0)}%)</span>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  return null;
}
