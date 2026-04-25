import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, ListChecks, Plus, Trash2, RotateCcw } from "lucide-react";
import {
  Visit,
  ChecklistItem,
  buildDefaultChecklist,
} from "@/lib/agenda";
import { cn } from "@/lib/utils";

interface Props {
  visit: Visit;
  onUpdate: (id: string, patch: Partial<Visit>) => void;
  /** Inicia recolhido por padrão para não sobrecarregar o card. */
  defaultOpen?: boolean;
}

export function VisitChecklist({ visit, onUpdate, defaultOpen = false }: Props) {
  const items: ChecklistItem[] = visit.checklist ?? buildDefaultChecklist();
  const [open, setOpen] = useState(defaultOpen);
  const [newLabel, setNewLabel] = useState("");

  const { done, total, pct } = useMemo(() => {
    const total = items.length;
    const done = items.filter(i => i.done).length;
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);
    return { done, total, pct };
  }, [items]);

  const setItems = (next: ChecklistItem[]) => {
    onUpdate(visit.id, { checklist: next });
  };

  const toggle = (id: string) => {
    setItems(items.map(i => i.id === id ? { ...i, done: !i.done } : i));
  };

  const addItem = () => {
    const label = newLabel.trim();
    if (!label) return;
    const item: ChecklistItem = {
      id: `cl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      label,
      done: false,
    };
    setItems([...items, item]);
    setNewLabel("");
  };

  const removeItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const reset = () => {
    setItems(buildDefaultChecklist());
  };

  const allDone = total > 0 && done === total;

  return (
    <div className="mt-2 rounded-xl border border-border/60 bg-background/40 p-2">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between gap-2"
        aria-expanded={open}
      >
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          <ListChecks className={cn("h-3.5 w-3.5", allDone ? "text-success" : "text-primary")} />
          Checklist
          <span className={cn(
            "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
            allDone ? "bg-success-soft text-success"
            : done > 0 ? "bg-primary/10 text-primary"
            : "bg-muted text-muted-foreground"
          )}>
            {done}/{total}
          </span>
        </span>
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
          <span className="num">{pct}%</span>
          {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </span>
      </button>

      {/* Mini barra de progresso (sempre visível) */}
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full transition-all", allDone ? "bg-success" : "bg-primary")}
          style={{ width: `${pct}%` }}
        />
      </div>

      {open && (
        <div className="mt-2 space-y-1.5">
          <ul className="space-y-1">
            {items.map(item => (
              <li
                key={item.id}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-2 py-1.5 transition",
                  item.done ? "bg-success-soft/50" : "bg-muted/30"
                )}
              >
                <button
                  onClick={() => toggle(item.id)}
                  className={cn(
                    "grid h-4 w-4 shrink-0 place-items-center rounded border transition",
                    item.done
                      ? "border-success bg-success text-success-foreground"
                      : "border-border bg-background hover:border-primary"
                  )}
                  aria-label={item.done ? "Desmarcar" : "Marcar"}
                >
                  {item.done && (
                    <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="3 8 7 12 13 4" />
                    </svg>
                  )}
                </button>
                <span className={cn(
                  "flex-1 text-xs",
                  item.done && "line-through text-muted-foreground"
                )}>
                  {item.label}
                </span>
                {!item.builtin && (
                  <button
                    onClick={() => removeItem(item.id)}
                    className="grid h-6 w-6 shrink-0 place-items-center rounded text-muted-foreground transition hover:bg-danger-soft hover:text-danger"
                    aria-label="Remover item"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </li>
            ))}
          </ul>

          {/* Adicionar novo item */}
          <div className="flex gap-1.5">
            <input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addItem(); } }}
              placeholder="Adicionar item…"
              className="flex-1 rounded-lg border border-border bg-card px-2 py-1.5 text-xs outline-none focus:border-primary"
            />
            <button
              onClick={addItem}
              disabled={!newLabel.trim()}
              className="inline-flex items-center gap-1 rounded-lg bg-primary px-2 py-1.5 text-[10px] font-bold text-primary-foreground transition active:scale-95 disabled:opacity-50"
            >
              <Plus className="h-3 w-3" /> Add
            </button>
            <button
              onClick={reset}
              className="inline-flex items-center gap-1 rounded-lg bg-muted px-2 py-1.5 text-[10px] font-bold text-muted-foreground transition active:scale-95 hover:bg-muted/70"
              title="Restaurar checklist padrão"
              aria-label="Restaurar padrão"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
