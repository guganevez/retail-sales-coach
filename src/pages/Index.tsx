import { Link } from "react-router-dom";
import { ArrowRight, AlertTriangle, AlertCircle, Info, Sparkles, TrendingUp, Trophy } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { StatCard } from "@/components/StatCard";
import { clients, formatBRL, formatPct, salesperson, smartAlerts } from "@/lib/mock";

const Index = () => {
  const goalPct = Math.min(100, (salesperson.achievedMonth / salesperson.goalMonth) * 100);
  const inactives = clients.filter(c => c.lastPurchaseDays > 30 && c.status !== "potencial");
  const topAlerts = smartAlerts.slice(0, 3);

  return (
    <MobileShell
      subtitle="Resumo de hoje"
      title={`${formatBRL(salesperson.achievedToday)}`}
      rightSlot={
        <div className="mt-4 rounded-2xl bg-white/10 p-3 backdrop-blur">
          <div className="flex items-center justify-between text-xs">
            <span className="opacity-90 inline-flex items-center gap-1.5">
              <Trophy className="h-3.5 w-3.5" /> Meta do mês
            </span>
            <span className="font-semibold num">{formatBRL(salesperson.achievedMonth)} / {formatBRL(salesperson.goalMonth)}</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/20">
            <div className="h-full rounded-full bg-gradient-to-r from-accent to-white/90 transition-all" style={{ width: `${goalPct}%` }} />
          </div>
          <p className="mt-1.5 text-[11px] opacity-80">{goalPct.toFixed(0)}% atingido — faltam {formatBRL(salesperson.goalMonth - salesperson.achievedMonth)}</p>
        </div>
      }
    >
      {/* KPIs */}
      <section className="grid grid-cols-2 gap-3">
        <StatCard label="Semana" value={formatBRL(salesperson.achievedWeek)} hint="+12% vs anterior" />
        <StatCard label="Comissão prev." value={formatBRL(salesperson.estimatedCommission)} tone="success" hint="Mês corrente" />
        <StatCard label="Margem média" value={formatPct(salesperson.avgMargin)} tone={salesperson.avgMargin >= 8 ? "success" : "warning"} hint="Saudável" />
        <StatCard label="Pedidos hoje" value="4" hint="Ticket médio R$ 2.467" />
      </section>

      {/* Quick CTA */}
      <Link
        to="/pedido/novo"
        className="mt-5 flex items-center justify-between rounded-2xl bg-primary p-4 text-primary-foreground shadow-glow transition active:scale-[0.99]"
      >
        <div>
          <p className="text-xs uppercase tracking-wide opacity-80">Copiloto de vendas</p>
          <p className="text-base font-semibold">Iniciar novo pedido</p>
          <p className="mt-0.5 text-xs opacity-80">Sugestões inteligentes ativadas</p>
        </div>
        <ArrowRight className="h-6 w-6" />
      </Link>

      {/* Alerts */}
      <section className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Alertas inteligentes</h2>
          <Link to="/alertas" className="text-xs font-medium text-primary">Ver todos</Link>
        </div>
        <div className="space-y-2">
          {topAlerts.map(a => {
            const Icon = a.severity === "danger" ? AlertCircle : a.severity === "warning" ? AlertTriangle : Info;
            const tone =
              a.severity === "danger" ? "bg-danger-soft text-danger" :
              a.severity === "warning" ? "bg-warning-soft text-warning" :
              "bg-accent/10 text-accent";
            return (
              <Link
                key={a.id}
                to={a.clientId ? `/clientes/${a.clientId}` : "/alertas"}
                className="flex items-start gap-3 rounded-2xl bg-card p-3 shadow-soft transition active:scale-[0.99]"
              >
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${tone}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{a.title}</p>
                  <p className="text-xs text-muted-foreground">{a.description}</p>
                </div>
                <ArrowRight className="mt-2 h-4 w-4 text-muted-foreground" />
              </Link>
            );
          })}
        </div>
      </section>

      {/* IA suggestion */}
      <section className="mt-6 rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/5 to-primary/5 p-4">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-accent to-primary text-white">
            <Sparkles className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold">Recomendação de hoje</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              <strong className="text-foreground">Bar do Zé</strong> costuma comprar Guaraná 2L a cada 7 dias — última compra há 9 dias. Ticket médio +R$ 380.
            </p>
            <Link to="/pedido/novo?cliente=c1" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-accent">
              Criar pedido sugerido <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Clientes sem compra */}
      <section className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground inline-flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-warning" /> Clientes sem compra recente
          </h2>
          <Link to="/clientes" className="text-xs font-medium text-primary">Carteira</Link>
        </div>
        <div className="space-y-2">
          {inactives.slice(0, 3).map(c => (
            <Link key={c.id} to={`/clientes/${c.id}`} className="flex items-center justify-between rounded-2xl bg-card p-3 shadow-soft">
              <div>
                <p className="text-sm font-semibold">{c.fantasy}</p>
                <p className="text-xs text-muted-foreground">{c.city} · {c.segment}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-warning num">{c.lastPurchaseDays}d</p>
                <p className="text-[10px] text-muted-foreground">sem comprar</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </MobileShell>
  );
};

export default Index;
