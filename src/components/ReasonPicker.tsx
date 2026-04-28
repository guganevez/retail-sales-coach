import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const CANCEL_REASONS = [
  "Cliente ausente",
  "Estabelecimento fechado",
  "Sem necessidade de compra",
  "Cliente sem caixa",
  "Problema de logística (trânsito/veículo)",
  "Reagendado pelo cliente",
  "Bloqueio comercial",
];

export const RESCHEDULE_REASONS = [
  "Cliente solicitou outra data",
  "Comprador ausente",
  "Falta de tempo na rota",
  "Estoque do cliente cheio",
  "Pendência financeira",
  "Imprevisto pessoal do vendedor",
  "Condições climáticas",
];

interface Props {
  open: boolean;
  mode: "cancel" | "reschedule";
  clientName?: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

export function ReasonPicker({ open, mode, clientName, onConfirm, onCancel }: Props) {
  const options = mode === "cancel" ? CANCEL_REASONS : RESCHEDULE_REASONS;
  const [selected, setSelected] = useState<string | null>(null);
  const [other, setOther] = useState("");

  useEffect(() => {
    if (open) {
      setSelected(null);
      setOther("");
    }
  }, [open]);

  const finalReason = selected === "__other__" ? other.trim() : (selected ?? "");
  const canConfirm = finalReason.length > 0;

  const title = mode === "cancel" ? "Motivo do cancelamento" : "Motivo do reagendamento";
  const desc = clientName
    ? `Visita: ${clientName}. Selecione o motivo principal.`
    : "Selecione o motivo principal.";

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{desc}</DialogDescription>
        </DialogHeader>

        <div className="max-h-72 space-y-1.5 overflow-y-auto">
          {options.map(o => {
            const active = selected === o;
            return (
              <button
                key={o}
                onClick={() => setSelected(o)}
                className={cn(
                  "block w-full rounded-xl border px-3 py-2 text-left text-sm transition",
                  active
                    ? "border-primary bg-primary/10 font-semibold text-primary"
                    : "border-border bg-card hover:bg-muted/50"
                )}
              >
                {o}
              </button>
            );
          })}
          <button
            onClick={() => setSelected("__other__")}
            className={cn(
              "block w-full rounded-xl border px-3 py-2 text-left text-sm transition",
              selected === "__other__"
                ? "border-primary bg-primary/10 font-semibold text-primary"
                : "border-dashed border-border bg-card hover:bg-muted/50"
            )}
          >
            Outro motivo…
          </button>
          {selected === "__other__" && (
            <Input
              autoFocus
              placeholder="Descreva o motivo"
              value={other}
              onChange={(e) => setOther(e.target.value)}
              className="mt-1"
            />
          )}
        </div>

        <DialogFooter>
          <button
            onClick={onCancel}
            className="rounded-xl border border-border px-3 py-2 text-sm font-semibold"
          >
            Voltar
          </button>
          <button
            onClick={() => canConfirm && onConfirm(finalReason)}
            disabled={!canConfirm}
            className={cn(
              "rounded-xl px-3 py-2 text-sm font-bold text-primary-foreground",
              mode === "cancel" ? "bg-danger" : "bg-primary",
              !canConfirm && "opacity-50"
            )}
          >
            Confirmar
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
