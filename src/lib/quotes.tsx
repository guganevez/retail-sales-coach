import { createContext, useContext, useMemo, useState, ReactNode } from "react";
import { OrderItem, OrderType, Shift } from "./types";

export type QuoteStatus = "rascunho" | "enviado" | "aceito" | "expirado";

export interface Quote {
  id: string;
  clientId: string;
  items: OrderItem[];
  type: OrderType;
  shift: Shift;
  paymentTerm: string;
  totalGross: number;
  marginPct: number;
  commissionValue: number;
  createdAt: string; // ISO
  validUntil: string; // ISO
  status: QuoteStatus;
  signatureDataUrl?: string;
  signedBy?: string;
  /** Pedidos comuns também ficam aqui marcados como enviados (não-orçamento). */
  isOrder?: boolean;
}

interface QuotesCtx {
  quotes: Quote[];
  addQuote: (q: Omit<Quote, "id" | "createdAt"> & { createdAt?: string }) => Quote;
  updateStatus: (id: string, status: QuoteStatus) => void;
  remove: (id: string) => void;
}

const Ctx = createContext<QuotesCtx | null>(null);

const seed: Quote[] = [
  {
    id: "q-seed-1",
    clientId: "c2",
    items: [
      { productId: "p2", qty: 12, price: 138.0 },
      { productId: "p7", qty: 4, price: 208.0 },
    ],
    type: "orcamento",
    shift: "tarde",
    paymentTerm: "30 dias",
    totalGross: 12 * 138 + 4 * 208,
    marginPct: 11.4,
    commissionValue: 58.4,
    createdAt: "2026-04-15T10:00:00Z",
    validUntil: "2026-04-30T23:59:59Z",
    status: "enviado",
  },
  {
    id: "q-seed-2",
    clientId: "c4",
    items: [
      { productId: "p1", qty: 24, price: 39.2 },
      { productId: "p3", qty: 12, price: 51.0 },
    ],
    type: "orcamento",
    shift: "manha",
    paymentTerm: "21 dias",
    totalGross: 24 * 39.2 + 12 * 51,
    marginPct: 7.2,
    commissionValue: 41.5,
    createdAt: "2026-04-10T15:00:00Z",
    validUntil: "2026-04-24T23:59:59Z",
    status: "rascunho",
  },
];

export function QuotesProvider({ children }: { children: ReactNode }) {
  const [quotes, setQuotes] = useState<Quote[]>(seed);

  const value = useMemo<QuotesCtx>(() => ({
    quotes,
    addQuote: (q) => {
      const created: Quote = {
        ...q,
        id: `q-${Date.now()}`,
        createdAt: q.createdAt || new Date().toISOString(),
      };
      setQuotes((prev) => [created, ...prev]);
      return created;
    },
    updateStatus: (id, status) =>
      setQuotes((prev) => prev.map((q) => (q.id === id ? { ...q, status } : q))),
    remove: (id) => setQuotes((prev) => prev.filter((q) => q.id !== id)),
  }), [quotes]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useQuotes() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useQuotes must be used within QuotesProvider");
  return ctx;
}

export const STATUS_LABEL: Record<QuoteStatus, string> = {
  rascunho: "Rascunho",
  enviado: "Enviado",
  aceito: "Aceito",
  expirado: "Expirado",
};

export const STATUS_TONE: Record<QuoteStatus, string> = {
  rascunho: "bg-muted text-muted-foreground",
  enviado: "bg-accent/15 text-accent",
  aceito: "bg-success-soft text-success",
  expirado: "bg-danger-soft text-danger",
};
