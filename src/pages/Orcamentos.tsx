import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, FileText, Plus, Send, CheckCircle2, Trash2 } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { useQuotes, STATUS_LABEL, STATUS_TONE, QuoteStatus } from "@/lib/quotes";
import { clients, formatBRL, formatPct } from "@/lib/mock";
import { cn } from "@/lib/utils";

const filters: { key: QuoteStatus | "todos"; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "rascunho", label: "Rascunhos" },
  { key: "enviado", label: "Enviados" },
  { key: "aceito", label: "Aceitos" },
  { key: "expirado", label: "Expirados" },
];

export default function Orcamentos() {
  const { quotes, updateStatus, remove } = useQuotes();
  const [filter, setFilter] = useState<QuoteStatus | "todos">("todos");

  const enriched = quotes
    .filter((q) => !q.isOrder)
    .map((q) => ({
      ...q,
      effectiveStatus: (q.status !== "aceito" && new Date(q.validUntil) < new Date()
        ? "expirado"
        : q.status) as QuoteStatus,
    }));

  const list = enriched.filter((q) => filter === "todos" || q.effectiveStatus === filter);

  const counts = {
    rascunho: enriched.filter((q) => q.effectiveStatus === "rascunho").length,
    enviado: enriched.filter((q) => q.effectiveStatus === "enviado").length,
    aceito: enriched.filter((q) => q.effectiveStatus === "aceito").length,
    expirado: enriched.filter((q) => q.effectiveStatus === "expirado").length,
  };

  return (
    <MobileShell title="Orçamentos" subtitle="Propostas em aberto">
      <section className="grid grid-cols-4 gap-2">
        <Stat label="Rascunho" value={counts.rascunho} />
        <Stat label="Enviado" value={counts.enviado} tone="accent" />
        <Stat label="Aceito" value={counts.aceito} tone="success" />
        <Stat label="Expirado" value={counts.expirado} tone="danger" />
      </section>

      <Link
        to="/pedido/novo?tipo=orcamento"
        className="mt-4 flex items-center justify-between rounded-2xl bg-primary p-3.5 text-primary-foreground shadow-glow"
      >
        <div className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          <span className="text-sm font-semibold">Novo orçamento</span>
        </div>
        <ArrowRight className="h-4 w-4" />
      </Link>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {filters.map((f) => (
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

      <div className="mt-3 space-y-2">
        {list.length === 0 && (
          <div className="rounded-2xl bg-card p-8 text-center text-sm text-muted-foreground shadow-soft">
            Nenhum orçamento neste status.
          </div>
        )}
        {list.map((q) => {
          const client = clients.find((c) => c.id === q.clientId);
          const days = Math.ceil(
            (new Date(q.validUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          );
          return (
            <div key={q.id} className="rounded-2xl bg-card p-3 shadow-soft">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <p className="truncate text-sm font-semibold">{client?.fantasy}</p>
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", STATUS_TONE[q.effectiveStatus])}>
                      {STATUS_LABEL[q.effectiveStatus]}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {q.items.length} itens · {q.paymentTerm} · margem {formatPct(q.marginPct)}
                  </p>
                </div>
                <p className="text-sm font-bold num">{formatBRL(q.totalGross)}</p>
              </div>

              <div className="mt-2 flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">
                  Criado em {new Date(q.createdAt).toLocaleDateString("pt-BR")}
                </span>
                <span
                  className={cn(
                    "font-semibold num",
                    q.effectiveStatus === "expirado" ? "text-danger" : days <= 3 ? "text-warning" : "text-muted-foreground"
                  )}
                >
                  {q.effectiveStatus === "expirado"
                    ? "Vencido"
                    : days <= 0
                    ? "Vence hoje"
                    : `Vence em ${days}d`}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {q.effectiveStatus === "rascunho" && (
                  <button
                    onClick={() => updateStatus(q.id, "enviado")}
                    className="inline-flex items-center gap-1 rounded-lg bg-accent px-2.5 py-1.5 text-[11px] font-semibold text-accent-foreground"
                  >
                    <Send className="h-3 w-3" /> Marcar como enviado
                  </button>
                )}
                {q.effectiveStatus === "enviado" && (
                  <button
                    onClick={() => updateStatus(q.id, "aceito")}
                    className="inline-flex items-center gap-1 rounded-lg bg-success px-2.5 py-1.5 text-[11px] font-semibold text-success-foreground"
                  >
                    <CheckCircle2 className="h-3 w-3" /> Marcar como aceito
                  </button>
                )}
                {q.effectiveStatus === "aceito" && (
                  <Link
                    to={`/pedido/novo?cliente=${q.clientId}`}
                    className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-[11px] font-semibold text-primary-foreground"
                  >
                    Converter em pedido <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
                <button
                  onClick={() => remove(q.id)}
                  className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-muted-foreground hover:bg-muted"
                >
                  <Trash2 className="h-3 w-3" /> Excluir
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </MobileShell>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "success" | "danger" | "accent" }) {
  const color =
    tone === "success" ? "text-success" :
    tone === "danger" ? "text-danger" :
    tone === "accent" ? "text-accent" : "text-foreground";
  return (
    <div className="rounded-xl bg-card p-2.5 text-center shadow-soft">
      <p className={cn("text-xl font-bold num", color)}>{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}
