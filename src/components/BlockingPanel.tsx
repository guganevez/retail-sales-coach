import { ShieldAlert, Wrench, Sparkles, ArrowRight } from "lucide-react";
import { Client, OrderItem, Product } from "@/lib/types";
import { itemMarginPct, priceHealth } from "@/lib/calc";
import { formatBRL, formatPct } from "@/lib/mock";
import { cn } from "@/lib/utils";

export interface BlockingIssue {
  kind: "margin-item" | "margin-order" | "credit" | "logistics" | "client-blocked";
  severity: "danger" | "warning";
  title: string;
  detail: string;
  productId?: string;
  fix?: { label: string; onFix: () => void };
}

interface Props {
  client: Client | null;
  items: OrderItem[];
  productMap: Record<string, Product>;
  totals: { gross: number; marginPct: number; weightKg: number; blocked: boolean };
  capacityRemaining: number;
  capacityWarning: boolean;
  orderType: string;
  onFixItemPrice: (productId: string, newPrice: number) => void;
  onSuggestSubstitute: (productId: string) => void;
  onRemoveItem: (productId: string) => void;
}

export function BlockingPanel({
  client, items, productMap, totals, capacityRemaining, capacityWarning,
  orderType, onFixItemPrice, onSuggestSubstitute, onRemoveItem,
}: Props) {
  const issues: BlockingIssue[] = [];

  // 1) Cliente bloqueado
  if (client?.status === "bloqueado") {
    issues.push({
      kind: "client-blocked",
      severity: "danger",
      title: "Cliente bloqueado",
      detail: "Pedido não poderá ser faturado enquanto o cliente estiver bloqueado.",
    });
  }

  // 2) Itens com margem ruim (preço < PMV ou margem item < 0)
  for (const it of items) {
    const p = productMap[it.productId];
    if (!p) continue;
    const m = itemMarginPct(it.price, p.cost);
    const ph = priceHealth(it.price, p);
    if (m < 0 || ph === "bad") {
      issues.push({
        kind: "margin-item",
        severity: "danger",
        title: `${p.name} — preço abaixo do mínimo`,
        detail: `Preço atual ${formatBRL(it.price)} · margem ${formatPct(m)}. PMV permitido: ${formatBRL(p.pmv)}.`,
        productId: it.productId,
        fix: { label: `Ajustar p/ PMV ${formatBRL(p.pmv)}`, onFix: () => onFixItemPrice(it.productId, p.pmv) },
      });
    }
  }

  // 3) Margem do pedido bloqueada (< -3%) ou baixa
  if (totals.blocked) {
    issues.push({
      kind: "margin-order",
      severity: "danger",
      title: "Margem total abaixo do permitido",
      detail: `Margem do pedido ${formatPct(totals.marginPct)} · política mínima −3%. Ajuste preços ou adicione itens de maior margem.`,
    });
  } else if (totals.marginPct < 2 && items.length > 0) {
    issues.push({
      kind: "margin-order",
      severity: "warning",
      title: "Margem do pedido baixa",
      detail: `Margem ${formatPct(totals.marginPct)} — abaixo do recomendado (2%). Sugira itens de recuperação de margem.`,
    });
  }

  // 4) Crédito
  if (client && client.creditLimit > 0 && (client.creditUsed + totals.gross) > client.creditLimit) {
    const excedente = (client.creditUsed + totals.gross) - client.creditLimit;
    issues.push({
      kind: "credit",
      severity: "warning",
      title: "Limite de crédito excedido",
      detail: `Cliente usaria ${formatBRL(client.creditUsed + totals.gross)} de ${formatBRL(client.creditLimit)}. Excedente: ${formatBRL(excedente)}.`,
    });
  }
  if (client && client.overdueAmount > 0) {
    issues.push({
      kind: "credit",
      severity: "warning",
      title: "Cliente com títulos vencidos",
      detail: `${formatBRL(client.overdueAmount)} em atraso — risco financeiro elevado.`,
    });
  }

  // 5) Logística
  if (capacityWarning && orderType === "entrega") {
    issues.push({
      kind: "logistics",
      severity: "warning",
      title: "Capacidade logística excedida",
      detail: `Pedido ${totals.weightKg.toFixed(0)}kg · disponível ${capacityRemaining}kg. Considere dividir em 2 entregas ou trocar o turno.`,
    });
  }

  if (issues.length === 0) return null;

  // Quais itens individuais com problema (para sugerir substituto/remover)
  const problemItemIds = new Set(
    issues.filter(i => i.kind === "margin-item" && i.productId).map(i => i.productId!)
  );

  return (
    <section className="mt-4 rounded-2xl border border-danger/30 bg-danger-soft/40 p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-danger text-danger-foreground">
          <ShieldAlert className="h-4 w-4" />
        </span>
        <div className="flex-1">
          <p className="text-sm font-bold text-danger">Pedido com bloqueios</p>
          <p className="text-[11px] text-danger/80">
            {issues.length} {issues.length === 1 ? "ocorrência detectada" : "ocorrências detectadas"} — corrija antes de enviar.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {issues.map((iss, i) => (
          <div
            key={i}
            className={cn(
              "rounded-xl bg-card p-3 shadow-soft border-l-4",
              iss.severity === "danger" ? "border-danger" : "border-warning"
            )}
          >
            <p className={cn(
              "text-xs font-bold",
              iss.severity === "danger" ? "text-danger" : "text-warning"
            )}>
              {iss.title}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">{iss.detail}</p>

            {iss.fix && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                <button
                  onClick={iss.fix.onFix}
                  className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground"
                >
                  <Wrench className="h-3 w-3" /> {iss.fix.label}
                </button>
                {iss.productId && (
                  <>
                    <button
                      onClick={() => onSuggestSubstitute(iss.productId!)}
                      className="inline-flex items-center gap-1 rounded-lg bg-accent/15 px-2.5 py-1 text-[11px] font-bold text-accent"
                    >
                      <Sparkles className="h-3 w-3" /> Sugerir substituto
                    </button>
                    <button
                      onClick={() => onRemoveItem(iss.productId!)}
                      className="inline-flex items-center gap-1 rounded-lg bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground"
                    >
                      Remover item
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Atalho: ajustar todos itens com problema */}
      {problemItemIds.size > 1 && (
        <button
          onClick={() => {
            problemItemIds.forEach(pid => {
              const p = productMap[pid];
              if (p) onFixItemPrice(pid, p.pmv);
            });
          }}
          className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary py-2 text-xs font-bold text-primary-foreground shadow-glow"
        >
          <Wrench className="h-3.5 w-3.5" /> Ajustar todos para o PMV
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      )}
    </section>
  );
}
