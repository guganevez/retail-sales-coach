import { useState } from "react";
import { ChevronDown, History, Tag, Plus, Check } from "lucide-react";
import { Client, Order, Product } from "@/lib/types";
import { formatBRL, formatPct } from "@/lib/mock";
import { cn } from "@/lib/utils";

interface Props {
  client: Client;
  orders: Order[];
  prices: Record<string, number>;
  productMap: Record<string, Product>;
  inOrder: Set<string>;
  onAddProduct: (productId: string, atPrice?: number) => void;
}

type Tab = "compras" | "precos";

export function ClientHistoryPanel({ client, orders, prices, productMap, inOrder, onAddProduct }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("compras");

  const clientOrders = orders.filter(o => o.clientId === client.id).slice(0, 5);
  const priceEntries = Object.entries(prices)
    .map(([pid, price]) => ({ product: productMap[pid], price }))
    .filter(e => e.product);

  return (
    <section className="mt-4 rounded-2xl bg-card shadow-soft overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between gap-2 p-3 text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent/15 text-accent shrink-0">
            <History className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">Histórico do cliente</p>
            <p className="text-[11px] text-muted-foreground truncate">
              {clientOrders.length} pedidos · {priceEntries.length} preços praticados
            </p>
          </div>
        </div>
        <ChevronDown className={cn("h-5 w-5 text-muted-foreground shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="border-t border-border">
          {/* Tabs */}
          <div className="flex gap-1 border-b border-border bg-muted/30 p-2">
            <button
              onClick={() => setTab("compras")}
              className={cn(
                "flex-1 rounded-lg py-1.5 text-xs font-semibold transition",
                tab === "compras" ? "bg-card text-foreground shadow-soft" : "text-muted-foreground"
              )}
            >
              Últimas compras
            </button>
            <button
              onClick={() => setTab("precos")}
              className={cn(
                "flex-1 rounded-lg py-1.5 text-xs font-semibold transition",
                tab === "precos" ? "bg-card text-foreground shadow-soft" : "text-muted-foreground"
              )}
            >
              Últimos preços
            </button>
          </div>

          <div className="p-3">
            {tab === "compras" && (
              clientOrders.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  Nenhum pedido recente para este cliente.
                </p>
              ) : (
                <div className="space-y-2">
                  {clientOrders.map(o => (
                    <div key={o.id} className="rounded-xl bg-muted/40 p-2.5">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold">
                          {new Date(o.date).toLocaleDateString("pt-BR")} · {o.type === "entrega" ? "Entrega" : o.type === "retirada" ? "Retirada" : "Orçamento"}
                        </p>
                        <p className="text-sm font-bold num">{formatBRL(o.totalGross)}</p>
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        Margem {formatPct(o.margin)} · Pgto {o.paymentTerm}
                      </p>
                      <div className="mt-2 space-y-1">
                        {o.items.map(it => {
                          const p = productMap[it.productId];
                          if (!p) return null;
                          const already = inOrder.has(it.productId);
                          return (
                            <div key={it.productId} className="flex items-center gap-2 text-[11px]">
                              <span className="flex-1 truncate">
                                {it.qty}× {p.name}
                              </span>
                              <span className="num text-muted-foreground">{formatBRL(it.price)}</span>
                              <button
                                disabled={already}
                                onClick={() => onAddProduct(it.productId, it.price)}
                                className={cn(
                                  "grid h-6 w-6 place-items-center rounded-md shrink-0",
                                  already ? "bg-success/20 text-success" : "bg-primary text-primary-foreground"
                                )}
                                aria-label={already ? "Já no pedido" : "Adicionar"}
                              >
                                {already ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {tab === "precos" && (
              priceEntries.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  Nenhum preço histórico registrado.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {priceEntries.map(({ product, price }) => {
                    const already = inOrder.has(product.id);
                    const vsPsv = ((price - product.psv) / product.psv) * 100;
                    return (
                      <div key={product.id} className="flex items-center gap-2 rounded-xl bg-muted/40 p-2">
                        <Tag className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold">{product.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            PSV {formatBRL(product.psv)} · {vsPsv >= 0 ? "+" : ""}{vsPsv.toFixed(1)}% vs PSV
                          </p>
                        </div>
                        <p className="text-sm font-bold num">{formatBRL(price)}</p>
                        <button
                          disabled={already}
                          onClick={() => onAddProduct(product.id, price)}
                          className={cn(
                            "grid h-7 w-7 place-items-center rounded-lg shrink-0",
                            already ? "bg-success/20 text-success" : "bg-primary text-primary-foreground"
                          )}
                          aria-label={already ? "Já no pedido" : "Adicionar"}
                        >
                          {already ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </div>
        </div>
      )}
    </section>
  );
}
