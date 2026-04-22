import { createContext, useContext, useMemo, useState, ReactNode } from "react";
import { OrderItem, OrderType, Shift } from "./types";

export interface OrderDraft {
  clientId: string | null;
  items: OrderItem[];
  orderType: OrderType;
  shift: Shift;
  paymentTerm: string;
  validUntil: string;
  signedBy: string;
  signature?: string;
  updatedAt: string; // ISO
}

interface DraftCtx {
  draft: OrderDraft | null;
  saveDraft: (d: Omit<OrderDraft, "updatedAt">) => void;
  clearDraft: () => void;
  hasDraft: boolean;
}

const Ctx = createContext<DraftCtx | null>(null);

export function DraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<OrderDraft | null>(null);

  const value = useMemo<DraftCtx>(() => ({
    draft,
    saveDraft: (d) => {
      // Só persiste se houver alguma intenção real (cliente OU itens)
      if (!d.clientId && d.items.length === 0) {
        setDraft(null);
        return;
      }
      setDraft({ ...d, updatedAt: new Date().toISOString() });
    },
    clearDraft: () => setDraft(null),
    hasDraft: !!draft && (!!draft.clientId || draft.items.length > 0),
  }), [draft]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDraft() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDraft must be used within DraftProvider");
  return ctx;
}
