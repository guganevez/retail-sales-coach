import { useMemo, useState } from "react";
import { ClipboardList, Plus, Check, X, Clock, User, CalendarClock, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { useActionPlans, ActionPlan, ActionPlanStatus, isOverdue } from "@/lib/actionPlans";
import { salesperson } from "@/lib/mock";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const STATUS_META: Record<ActionPlanStatus, { label: string; cls: string }> = {
  aberto:        { label: "Aberto",       cls: "bg-muted text-muted-foreground" },
  em_andamento:  { label: "Em andamento", cls: "bg-primary/15 text-primary" },
  concluido:     { label: "Concluído",    cls: "bg-success-soft text-success" },
  cancelado:     { label: "Cancelado",    cls: "bg-danger-soft text-danger" },
};

const todayPlus = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

interface PlanDialogProps {
  open: boolean;
  reason: string;
  onClose: () => void;
}

function PlanDialog({ open, reason, onClose }: PlanDialogProps) {
  const { add } = useActionPlans();
  const [title, setTitle] = useState("");
  const [owner, setOwner] = useState(salesperson?.name ?? "");
  const [dueDate, setDueDate] = useState(todayPlus(2));
  const [notes, setNotes] = useState("");

  const reset = () => {
    setTitle(""); setOwner(salesperson?.name ?? ""); setDueDate(todayPlus(2)); setNotes("");
  };

  const submit = () => {
    if (!title.trim() || !owner.trim() || !dueDate) return;
    add({ reason, title: title.trim(), owner: owner.trim(), dueDate, notes: notes.trim() || undefined });
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Plano de ação</DialogTitle>
          <DialogDescription>
            Motivo: <span className="font-semibold text-foreground">{reason}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold text-muted-foreground">O que será feito</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex.: Confirmar visita por WhatsApp" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-bold text-muted-foreground">Responsável</label>
              <Input value={owner} onChange={e => setOwner(e.target.value)} placeholder="Nome" />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground">Prazo</label>
              <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground">Notas (opcional)</label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Detalhes ou contexto" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => { reset(); onClose(); }} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted">
              Cancelar
            </button>
            <button onClick={submit} disabled={!title.trim() || !owner.trim() || !dueDate}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-50">
              Salvar plano
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function NewPlanButton({ reason, compact }: { reason: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className={cn(
          "inline-flex items-center gap-1 rounded-md font-bold text-primary hover:bg-primary/10",
          compact ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-1 text-[10px]"
        )}
        title={`Criar plano para "${reason}"`}
      >
        <Plus className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} /> Plano
      </button>
      <PlanDialog open={open} reason={reason} onClose={() => setOpen(false)} />
    </>
  );
}

interface PanelProps {
  /** Mostrar apenas planos vinculados a estes motivos. Se vazio, mostra todos. */
  reasons?: string[];
}

export function ActionPlansPanel({ reasons }: PanelProps) {
  const { plans, update, remove } = useActionPlans();
  const [expanded, setExpanded] = useState(true);
  const [showDone, setShowDone] = useState(false);
  const now = new Date();

  const filtered = useMemo(() => {
    let list = plans;
    if (reasons && reasons.length > 0) {
      const set = new Set(reasons);
      list = list.filter(p => set.has(p.reason));
    }
    if (!showDone) list = list.filter(p => p.status !== "concluido" && p.status !== "cancelado");
    return list.sort((a, b) => {
      const ao = isOverdue(a, now) ? 0 : 1;
      const bo = isOverdue(b, now) ? 0 : 1;
      if (ao !== bo) return ao - bo;
      return a.dueDate.localeCompare(b.dueDate);
    });
  }, [plans, reasons, showDone, now]);

  const counts = useMemo(() => {
    const open = plans.filter(p => p.status === "aberto" || p.status === "em_andamento").length;
    const overdue = plans.filter(p => isOverdue(p, now)).length;
    const done = plans.filter(p => p.status === "concluido").length;
    return { open, overdue, done };
  }, [plans, now]);

  return (
    <div className="rounded-xl bg-muted/30 p-2.5">
      <div className="flex items-center justify-between">
        <p className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-primary">
          <ClipboardList className="h-3 w-3" /> Planos de ação ({counts.open})
          {counts.overdue > 0 && (
            <span className="ml-1 rounded-full bg-danger-soft px-1.5 text-[9px] font-bold text-danger num">
              {counts.overdue} atrasado{counts.overdue > 1 ? "s" : ""}
            </span>
          )}
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowDone(s => !s)}
            className="rounded-md bg-background/60 px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground hover:bg-background"
          >
            {showDone ? "Ocultar concluídos" : `Ver concluídos (${counts.done})`}
          </button>
          <button
            onClick={() => setExpanded(e => !e)}
            className="rounded-md bg-background/60 p-0.5 text-muted-foreground hover:bg-background"
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        </div>
      </div>

      {expanded && (
        <ul className="mt-2 space-y-1.5">
          {filtered.length === 0 ? (
            <li className="rounded-lg bg-background/40 p-2 text-center text-[11px] text-muted-foreground">
              Nenhum plano de ação ativo. Crie um a partir de um motivo no painel acima.
            </li>
          ) : filtered.map(p => {
            const overdue = isOverdue(p, now);
            return (
              <li key={p.id} className="rounded-lg bg-background/60 p-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-semibold">{p.title}</p>
                    <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                      Motivo: <span className="font-semibold">{p.reason}</span>
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                      <span className="inline-flex items-center gap-0.5"><User className="h-2.5 w-2.5" /> {p.owner}</span>
                      <span className={cn("inline-flex items-center gap-0.5 num", overdue && "font-bold text-danger")}>
                        <CalendarClock className="h-2.5 w-2.5" /> {p.dueDate.split("-").reverse().join("/")}
                        {overdue && " · atrasado"}
                      </span>
                    </div>
                    {p.notes && <p className="mt-1 text-[10px] text-muted-foreground">{p.notes}</p>}
                  </div>
                  <span className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold", STATUS_META[p.status].cls)}>
                    {STATUS_META[p.status].label}
                  </span>
                </div>

                <div className="mt-1.5 flex items-center justify-end gap-1">
                  {p.status !== "em_andamento" && p.status !== "concluido" && (
                    <button
                      onClick={() => update(p.id, { status: "em_andamento" })}
                      className="inline-flex items-center gap-0.5 rounded-md bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary hover:bg-primary/20"
                    >
                      <Clock className="h-2.5 w-2.5" /> Iniciar
                    </button>
                  )}
                  {p.status !== "concluido" && (
                    <button
                      onClick={() => update(p.id, { status: "concluido" })}
                      className="inline-flex items-center gap-0.5 rounded-md bg-success-soft px-1.5 py-0.5 text-[9px] font-bold text-success hover:bg-success/20"
                    >
                      <Check className="h-2.5 w-2.5" /> Concluir
                    </button>
                  )}
                  {p.status !== "cancelado" && p.status !== "concluido" && (
                    <button
                      onClick={() => update(p.id, { status: "cancelado" })}
                      className="inline-flex items-center gap-0.5 rounded-md bg-muted px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground hover:bg-muted/80"
                    >
                      <X className="h-2.5 w-2.5" /> Cancelar
                    </button>
                  )}
                  <button
                    onClick={() => remove(p.id)}
                    className="inline-flex items-center rounded-md p-0.5 text-muted-foreground hover:bg-danger-soft hover:text-danger"
                    title="Remover"
                  >
                    <Trash2 className="h-2.5 w-2.5" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
