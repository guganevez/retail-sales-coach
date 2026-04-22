import { useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { StatCard } from "@/components/StatCard";
import { clients, formatBRL, formatPct, salesperson } from "@/lib/mock";
import { Trophy, Users, TrendingDown, UserCircle2, UsersRound } from "lucide-react";
import { useProfile, ROLE_LABEL } from "@/lib/profile";
import { cn } from "@/lib/utils";

const ranking = [
  { name: "Camila Tavares",    sold: 318420, margin: 9.8,  deals: 142 },
  { name: "Rafael Moreira",    sold: 192480, margin: 8.4,  deals: 96, me: true },
  { name: "Luís Henrique",     sold: 174900, margin: 7.6,  deals: 88 },
  { name: "Mariana Castro",    sold: 158300, margin: 11.2, deals: 71 },
  { name: "André Bittencourt", sold: 121540, margin: 6.4,  deals: 64 },
];

const Painel = () => {
  const { role, scope, setScope, profile } = useProfile();
  const [selected, setSelected] = useState<string | null>(null);

  const isManagerView = role === "supervisor" || role === "gerente";
  const effectiveScope = isManagerView ? scope : "individual";

  const inactives = clients.filter(c => c.lastPurchaseDays > 30 && c.status !== "potencial");
  const teamSold = ranking.reduce((s, r) => s + r.sold, 0);
  const teamMargin = ranking.reduce((s, r) => s + r.margin, 0) / ranking.length;
  const teamDeals = ranking.reduce((s, r) => s + r.deals, 0);
  const teamTicket = teamSold / teamDeals;
  const teamCommission = ranking.reduce((s, r) => s + r.sold * 0.022, 0);

  // Métricas individuais (vendedor selecionado, ou "eu" se vendedor)
  const targetRep = isManagerView
    ? ranking.find(r => r.name === selected) || ranking.find(r => r.me)!
    : ranking.find(r => r.me)!;
  const indCommission = targetRep.sold * 0.022;
  const indTicket = targetRep.sold / targetRep.deals;

  const showing = effectiveScope === "equipe"
    ? { sold: teamSold, margin: teamMargin, ticket: teamTicket, commission: teamCommission, label: "Equipe" }
    : { sold: targetRep.sold, margin: targetRep.margin, ticket: indTicket, commission: indCommission, label: targetRep.name };

  return (
    <MobileShell title="Painel gerencial" subtitle={isManagerView ? `${ROLE_LABEL[role]} · ${profile.team || ""}` : "Sua performance"}>
      {isManagerView && (
        <div className="mb-3 flex items-center gap-1 rounded-2xl bg-card p-1 shadow-soft">
          <button
            onClick={() => { setScope("equipe"); setSelected(null); }}
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

      {isManagerView && scope === "individual" && (
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {ranking.map(r => (
            <button
              key={r.name}
              onClick={() => setSelected(r.name)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                (selected === r.name || (!selected && r.me))
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground"
              )}
            >
              {r.name.split(" ")[0]}
            </button>
          ))}
        </div>
      )}

      <p className="mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">
        Visualizando: <strong className="text-foreground">{showing.label}</strong>
      </p>

      <section className="grid grid-cols-2 gap-3">
        <StatCard label="Faturamento" value={formatBRL(showing.sold)} hint="Mês corrente" />
        <StatCard label="Ticket médio" value={formatBRL(showing.ticket)} />
        <StatCard label="Margem média" value={formatPct(showing.margin)} tone={showing.margin >= 8 ? "success" : "warning"} />
        <StatCard label="Comissão prev." value={formatBRL(showing.commission)} tone="success" />
      </section>

      {(role !== "vendedor") && (
        <section className="mt-5">
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
            <Trophy className="h-4 w-4 text-warning" /> Ranking de vendedores
          </h2>
          <div className="space-y-2">
            {ranking.map((r, i) => (
              <button
                key={r.name}
                onClick={() => { setScope("individual"); setSelected(r.name); }}
                className={cn(
                  "flex w-full items-center justify-between rounded-2xl p-3 shadow-soft text-left transition",
                  r.me ? "bg-primary/5 ring-1 ring-primary/20" : "bg-card",
                  selected === r.name && "ring-2 ring-primary"
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
                    <p className="truncate text-sm font-semibold">
                      {r.name}{r.me && <span className="ml-1 text-[10px] text-primary">(você)</span>}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{r.deals} pedidos · margem {formatPct(r.margin)}</p>
                  </div>
                </div>
                <p className="text-sm font-bold num">{formatBRL(r.sold)}</p>
              </button>
            ))}
          </div>
        </section>
      )}

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
        <p className="mt-3 text-[11px] text-muted-foreground">
          {role === "vendedor"
            ? `Sua margem (${formatPct(salesperson.avgMargin)}) está acima da média da equipe (${formatPct(teamMargin)}). Continue assim!`
            : `Margem média da equipe: ${formatPct(teamMargin)}. Top vendedor: ${ranking[0].name}.`}
        </p>
      </section>
    </MobileShell>
  );
};

export default Painel;
