import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Phone, MapPin, FileText, ShoppingCart, Repeat, AlertTriangle } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { ClientStatusBadge } from "@/components/ClientStatusBadge";
import { StatCard } from "@/components/StatCard";
import { clients, formatBRL, formatPct, frequentByClient, lastPriceMap, products, recentOrders } from "@/lib/mock";

const ClienteDetalhe = () => {
  const { id } = useParams();
  const client = clients.find(c => c.id === id);
  if (!client) return <MobileShell title="Cliente não encontrado"><Link to="/clientes" className="text-primary">Voltar</Link></MobileShell>;

  const orders = recentOrders.filter(o => o.clientId === client.id);
  const freq = (frequentByClient[client.id] || []).map(pid => products.find(p => p.id === pid)!).filter(Boolean);
  const prices = lastPriceMap[client.id] || {};
  const creditPct = client.creditLimit > 0 ? (client.creditUsed / client.creditLimit) * 100 : 0;

  return (
    <MobileShell hideTopBar>
      <div className="-mx-4 gradient-hero px-4 pb-6 pt-5 text-primary-foreground">
        <Link to="/clientes" className="inline-flex items-center gap-1.5 text-sm opacity-90">
          <ArrowLeft className="h-4 w-4" /> Carteira
        </Link>
        <div className="mt-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold">{client.fantasy}</h1>
            <p className="text-xs opacity-80">{client.name}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <ClientStatusBadge status={client.status} />
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[11px] backdrop-blur">
                <MapPin className="h-3 w-3" /> {client.city}
              </span>
              <span className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] backdrop-blur">{client.segment}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <Link to={`/pedido/novo?cliente=${client.id}`} className="flex-1 rounded-xl bg-white px-3 py-2.5 text-center text-sm font-semibold text-primary shadow-md">
            <ShoppingCart className="mr-1 inline h-4 w-4" /> Novo pedido
          </Link>
          <button className="flex-1 rounded-xl bg-white/15 px-3 py-2.5 text-sm font-semibold backdrop-blur">
            <Repeat className="mr-1 inline h-4 w-4" /> Repetir último
          </button>
        </div>
      </div>

      {/* Financeiro */}
      <section className="mt-5 grid grid-cols-2 gap-3">
        <StatCard label="Limite de crédito" value={formatBRL(client.creditLimit)} hint={`${creditPct.toFixed(0)}% usado`} tone={creditPct >= 95 ? "warning" : "default"} />
        <StatCard label="Vencidos" value={formatBRL(client.overdueAmount)} tone={client.overdueAmount > 0 ? "danger" : "success"} hint={client.overdueAmount > 0 ? "Atenção" : "Em dia"} />
        <StatCard label="Ticket médio" value={client.avgTicket > 0 ? formatBRL(client.avgTicket) : "—"} />
        <StatCard label="Margem histórica" value={client.avgMargin > 0 ? formatPct(client.avgMargin) : "—"} tone={client.avgMargin >= 8 ? "success" : "warning"} />
      </section>

      {client.notes && (
        <section className="mt-4 rounded-2xl border border-border bg-card p-3">
          <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <FileText className="h-3.5 w-3.5" /> Observações
          </p>
          <p className="mt-1 text-sm">{client.notes}</p>
        </section>
      )}

      {client.overdueAmount > 0 && (
        <div className="mt-4 flex items-start gap-2 rounded-2xl bg-danger-soft p-3 text-danger">
          <AlertTriangle className="mt-0.5 h-4 w-4" />
          <div className="text-xs">
            <p className="font-semibold">Cliente possui títulos vencidos</p>
            <p className="opacity-80">Avalie a liberação de novo pedido junto à supervisão.</p>
          </div>
        </div>
      )}

      {/* Histórico de pedidos */}
      <section className="mt-6">
        <h2 className="mb-2 text-sm font-semibold">Últimos pedidos</h2>
        <div className="space-y-2">
          {orders.length === 0 && <p className="text-xs text-muted-foreground">Sem pedidos recentes.</p>}
          {orders.map(o => (
            <div key={o.id} className="rounded-2xl bg-card p-3 shadow-soft">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {new Date(o.date).toLocaleDateString("pt-BR")} · {o.items.length} itens
                </p>
                <p className="text-sm font-bold num">{formatBRL(o.totalGross)}</p>
              </div>
              <div className="mt-1 flex items-center gap-3 text-[11px]">
                <span className="text-muted-foreground">Margem <strong className="text-foreground num">{formatPct(o.margin)}</strong></span>
                <span className="text-muted-foreground">Comissão <strong className="text-success num">{formatPct(o.commission)}</strong></span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Produtos mais comprados */}
      {freq.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-semibold">Produtos mais comprados</h2>
          <div className="space-y-2">
            {freq.map(p => (
              <div key={p.id} className="flex items-center justify-between rounded-2xl bg-card p-3 shadow-soft">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{p.name}</p>
                  <p className="text-[11px] text-muted-foreground">{p.brand} · {p.unit}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-muted-foreground">Último preço</p>
                  <p className="text-sm font-bold num">{prices[p.id] ? formatBRL(prices[p.id]) : formatBRL(p.psv)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </MobileShell>
  );
};

export default ClienteDetalhe;
