import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { Search, AlertTriangle, ArrowRight } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { ClientStatusBadge } from "@/components/ClientStatusBadge";
import { clients, formatBRL } from "@/lib/mock";
import { ClientStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const filters: { key: ClientStatus | "todos"; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "ativo", label: "Ativos" },
  { key: "potencial", label: "Potenciais" },
  { key: "inativo", label: "Inativos" },
  { key: "bloqueado", label: "Bloqueados" },
];

const Clientes = () => {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<ClientStatus | "todos">("todos");

  const list = useMemo(() => {
    return clients.filter(c => {
      const matchQ = (c.fantasy + c.name + c.city).toLowerCase().includes(q.toLowerCase());
      const matchF = filter === "todos" || c.status === filter;
      return matchQ && matchF;
    });
  }, [q, filter]);

  return (
    <MobileShell title="Carteira" subtitle="Meus clientes">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Buscar cliente, cidade ou segmento..."
          className="h-12 w-full rounded-2xl border border-border bg-card pl-10 pr-4 text-sm shadow-soft outline-none focus:border-primary"
        />
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition",
              filter === f.key ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-2">
        {list.map(c => {
          const creditPct = c.creditLimit > 0 ? (c.creditUsed / c.creditLimit) * 100 : 0;
          const hasFinAlert = c.overdueAmount > 0 || creditPct >= 95 || c.status === "bloqueado";
          return (
            <Link
              key={c.id}
              to={`/clientes/${c.id}`}
              className="block rounded-2xl bg-card p-4 shadow-soft transition active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold">{c.fantasy}</p>
                    <ClientStatusBadge status={c.status} />
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{c.city} · {c.segment}</p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                <div>
                  <p className="text-muted-foreground">Ticket médio</p>
                  <p className="font-semibold num">{c.avgTicket > 0 ? formatBRL(c.avgTicket) : "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Última compra</p>
                  <p className="font-semibold num">{c.lastPurchaseDays >= 999 ? "—" : `${c.lastPurchaseDays}d`}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Crédito</p>
                  <p className={cn("font-semibold num", creditPct >= 95 && "text-warning")}>
                    {c.creditLimit > 0 ? `${creditPct.toFixed(0)}%` : "—"}
                  </p>
                </div>
              </div>

              {hasFinAlert && (
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-danger-soft px-2 py-1 text-[11px] font-semibold text-danger">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {c.overdueAmount > 0 ? `${formatBRL(c.overdueAmount)} vencidos` : c.status === "bloqueado" ? "Cliente bloqueado" : "Limite estourado"}
                </div>
              )}
            </Link>
          );
        })}

        {list.length === 0 && (
          <div className="rounded-2xl bg-card p-8 text-center text-sm text-muted-foreground">
            Nenhum cliente encontrado.
          </div>
        )}
      </div>
    </MobileShell>
  );
};

export default Clientes;
