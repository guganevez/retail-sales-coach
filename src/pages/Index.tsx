import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, AlertTriangle, AlertCircle, Info, Sparkles, TrendingUp, FileEdit, X, Truck, Radio, CalendarDays, Zap, Eye } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { StatCard } from "@/components/StatCard";
import { DailyGoalCard, RealizedSource } from "@/components/DailyGoalCard";
import { clients, formatBRL, formatPct, products, salesperson, smartAlerts, recentOrders } from "@/lib/mock";
import { useDraft } from "@/lib/draft";
import { computeTotals } from "@/lib/calc";
import { useProfile } from "@/lib/profile";
import { ordersForRep, ordersForSupervisor, ordersForManager } from "@/lib/tracking";
import { useHolidays } from "@/lib/holidays";
import { useAgenda, todayISO } from "@/lib/agenda";
import { computeDailyPace } from "@/lib/workdays";
import { useDailyGoalView } from "@/lib/dailyGoalView";

const productMap = Object.fromEntries(products.map(p => [p.id, p]));
const clientMap = Object.fromEntries(clients.map(c => [c.id, c]));

const Index = () => {
  const inactives = clients.filter(c => c.lastPurchaseDays > 30 && c.status !== "potencial");
  const topAlerts = smartAlerts.slice(0, 3);
  const { draft, hasDraft, clearDraft } = useDraft();
  const { role, profile } = useProfile();
  const { holidays } = useHolidays();
  const { visits } = useAgenda();
  const { mode: goalMode, setMode: setGoalMode } = useDailyGoalView();
  const holidaySet = useMemo(() => new Set(holidays.map(h => h.date)), [holidays]);
  const draftClient = draft?.clientId ? clients.find(c => c.id === draft.clientId) : null;
  const draftTotals = draft ? computeTotals(draft.items, productMap) : null;

  // Pedidos em rastreio (filtrados por papel)
  const allTracked = role === "vendedor"
    ? ordersForRep(profile.id)
    : role === "supervisor"
      ? ordersForSupervisor(profile.id)
      : ordersForManager();
  const liveOrders = allTracked.filter(o => ["separacao","carga","em_rota"].includes(o.status));

  // Breakdown do realizado de hoje
  const today = todayISO();
  const sourcesFromVisits: RealizedSource[] = visits
    .filter(v => v.date === today && v.status === "concluida" && v.realized && v.realized > 0)
    .map(v => {
      const c = clientMap[v.clientId];
      return {
        label: c?.fantasy ?? v.clientId,
        value: v.realized!,
        hint: c ? `${c.city} · ${c.segment}` : undefined,
      };
    });
  const sources: RealizedSource[] = sourcesFromVisits.length > 0
    ? sourcesFromVisits
    : recentOrders.slice(0, 3).map((o, i) => {
        const c = clientMap[o.clientId];
        const weight = [0.55, 0.3, 0.15][i] ?? 0;
        return {
          label: c?.fantasy ?? o.clientId,
          value: Math.round(salesperson.achievedToday * weight),
          hint: c ? `${c.city} · ${c.segment}` : undefined,
        };
      });

  // Risco de meta
  const pace = computeDailyPace(salesperson.goalMonth, salesperson.achievedMonth, new Date(), holidaySet);
  const todayPctActual = pace.dailyGoal > 0 ? (salesperson.achievedToday / pace.dailyGoal) * 100 : 0;
  const isAtRisk = pace.isWorkdayToday && todayPctActual < 80;
  const todaysVisits = visits.filter(v => v.date === today);

  return (
    <MobileShell
      subtitle="Resumo de hoje"
      title={`${formatBRL(salesperson.achievedToday)}`}
      rightSlot={
        <div className="mt-4">
          <DailyGoalCard
            monthlyGoal={salesperson.goalMonth}
            achievedMonth={salesperson.achievedMonth}
            achievedToday={salesperson.achievedToday}
            holidays={holidaySet}
            sources={sources}
            compact
          />
        </div>
      }
    >
      {/* Alerta de risco de meta */}
      {isAtRisk && role === "vendedor" && (
        <Link
          to="/agenda"
          className="mb-3 flex items-start gap-3 rounded-2xl border border-warning/40 bg-warning-soft p-3 shadow-soft transition active:scale-[0.99]"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-warning text-warning-foreground">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wide text-warning">Risco de meta diária</p>
            <p className="text-sm font-semibold text-foreground">
              {todayPctActual.toFixed(0)}% do esperado · faltam {formatBRL(Math.max(0, pace.dailyGoal - salesperson.achievedToday))}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Toque para ver sugestões priorizadas na Agenda.
            </p>
          </div>
          <Zap className="h-5 w-5 text-warning" />
        </Link>
      )}

      {/* KPIs */}
      <section className="grid grid-cols-2 gap-3">
        <StatCard label="Semana" value={formatBRL(salesperson.achievedWeek)} hint="+12% vs anterior" />
        <StatCard label="Comissão prev." value={formatBRL(salesperson.estimatedCommission)} tone="success" hint="Mês corrente" />
        <StatCard label="Margem média" value={formatPct(salesperson.avgMargin)} tone={salesperson.avgMargin >= 8 ? "success" : "warning"} hint="Saudável" />
        <StatCard label="Pedidos hoje" value="4" hint="Ticket médio R$ 2.467" />
      </section>

      {/* Atalho Agenda */}
      <Link
        to="/agenda"
        className="mt-3 flex items-center gap-3 rounded-2xl bg-card p-3 shadow-soft transition active:scale-[0.99]"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent">
          <CalendarDays className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wide text-accent">Agenda do dia</p>
          <p className="text-sm font-semibold">
            {todaysVisits.length === 0
              ? "Nenhuma visita programada"
              : `${todaysVisits.filter(v => v.status === "pendente").length} pendentes · ${todaysVisits.filter(v => v.status === "concluida").length} concluídas`}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {pace.elapsedWorkdays}/{pace.totalWorkdays} dias úteis · meta {formatBRL(pace.dailyGoal)}/dia
          </p>
        </div>
        <ArrowRight className="h-5 w-5 text-muted-foreground" />
      </Link>

      {/* Continuar rascunho */}
      {hasDraft && draft && (
        <Link
          to="/pedido/novo?retomar=1"
          className="mt-5 flex items-center gap-3 rounded-2xl border border-warning/30 bg-warning-soft p-3 shadow-soft transition active:scale-[0.99]"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-warning text-warning-foreground">
            <FileEdit className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wide text-warning">Rascunho em andamento</p>
            <p className="truncate text-sm font-semibold text-foreground">
              {draftClient ? draftClient.fantasy : "Sem cliente"} · {draft.items.length} {draft.items.length === 1 ? "item" : "itens"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {draftTotals ? formatBRL(draftTotals.gross) : "R$ 0,00"} · atualizado {timeAgo(draft.updatedAt)}
            </p>
          </div>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); clearDraft(); }}
            className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-card"
            aria-label="Descartar rascunho"
          >
            <X className="h-4 w-4" />
          </button>
          <ArrowRight className="h-5 w-5 text-warning" />
        </Link>
      )}

      {/* Quick CTA */}
      <Link
        to="/pedido/novo"
        className="mt-3 flex items-center justify-between rounded-2xl bg-primary p-4 text-primary-foreground shadow-glow transition active:scale-[0.99]"
      >
        <div>
          <p className="text-xs uppercase tracking-wide opacity-80">Copiloto de vendas</p>
          <p className="text-base font-semibold">{hasDraft ? "Iniciar outro pedido" : "Iniciar novo pedido"}</p>
          <p className="mt-0.5 text-xs opacity-80">Sugestões inteligentes ativadas</p>
        </div>
        <ArrowRight className="h-6 w-6" />
      </Link>

      {/* Pedidos em rastreio ao vivo */}
      {liveOrders.length > 0 && (
        <Link
          to="/pedidos"
          className="mt-3 flex items-center gap-3 rounded-2xl bg-card p-3 shadow-soft transition active:scale-[0.99]"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <Truck className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-primary">
              <Radio className="h-3 w-3 animate-pulse-soft" /> Pedidos ao vivo
            </p>
            <p className="text-sm font-semibold">{liveOrders.length} pedido(s) em andamento</p>
            <p className="text-[11px] text-muted-foreground">
              {liveOrders.filter(o => o.status === "em_rota").length} em rota ·{" "}
              {liveOrders.filter(o => o.status === "carga").length} em carga ·{" "}
              {liveOrders.filter(o => o.status === "separacao").length} em separação
            </p>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground" />
        </Link>
      )}

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

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.floor(h / 24)}d`;
}

export default Index;
