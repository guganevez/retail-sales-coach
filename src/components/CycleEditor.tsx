import { useState } from "react";
import { Sliders, RotateCcw, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useCycleConfig } from "@/lib/cycleConfig";
import { clients } from "@/lib/mock";
import { getCycleInfo } from "@/lib/cycle";
import { cn } from "@/lib/utils";

export function CycleEditor() {
  const { cycles, defaults, overrides, setCycle, resetSegment, resetAll } = useCycleConfig();
  const [open, setOpen] = useState(false);

  const segments = Object.keys(defaults).sort();

  // Conta clientes que serão afetados por segmento
  const affectedBySegment: Record<string, { count: number; overdue: number; willBecomeOverdue: number }> = {};
  for (const seg of segments) {
    const clientsInSeg = clients.filter(c => c.segment === seg && c.status !== "bloqueado");
    let overdue = 0, willBecomeOverdue = 0;
    for (const c of clientsInSeg) {
      const info = getCycleInfo(c, undefined, overrides);
      if (info.priority === "atrasado") overdue++;
      else if (info.ratio >= 0.8) willBecomeOverdue++;
    }
    affectedBySegment[seg] = { count: clientsInSeg.length, overdue, willBecomeOverdue };
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-xl bg-card p-3 shadow-soft text-left w-full transition active:scale-[0.99]"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="inline-flex items-center gap-1.5 text-sm font-semibold">
              <Sliders className="h-4 w-4 text-primary" />
              Ciclo por segmento
            </p>
            <p className="text-[11px] text-muted-foreground">
              {Object.keys(overrides).length > 0
                ? `${Object.keys(overrides).length} segmento(s) ajustado(s)`
                : "Padrões da indústria — toque para ajustar"}
            </p>
          </div>
          <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary">
            {segments.length} segmentos
          </span>
        </div>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ciclo de venda por segmento</DialogTitle>
            <DialogDescription>
              Define o ciclo padrão (em dias) para clientes sem histórico.
              Clientes com 2+ pedidos usam intervalo médio real.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {segments.map(seg => {
              const current = cycles[seg];
              const def = defaults[seg];
              const isOverridden = current !== def;
              const stat = affectedBySegment[seg];
              return (
                <div
                  key={seg}
                  className={cn(
                    "rounded-2xl border p-3",
                    isOverridden ? "border-primary/40 bg-primary/5" : "border-border bg-card"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold">{seg}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {stat.count} clientes ·{" "}
                        <span className="text-danger">{stat.overdue} atrasado(s)</span> ·{" "}
                        <span className="text-warning">{stat.willBecomeOverdue} no ciclo</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min={1}
                        max={120}
                        value={current}
                        onChange={(e) => setCycle(seg, Number(e.target.value))}
                        className="h-9 w-16 text-center num"
                      />
                      <span className="text-[11px] text-muted-foreground">dias</span>
                      {isOverridden && (
                        <button
                          onClick={() => resetSegment(seg)}
                          className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
                          aria-label="Resetar"
                          title={`Padrão: ${def}d`}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  {isOverridden && (
                    <p className="mt-1 text-[10px] text-primary">
                      Padrão original: {def} dias
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex justify-between gap-2">
            <button
              onClick={resetAll}
              disabled={Object.keys(overrides).length === 0}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Resetar tudo
            </button>
            <button
              onClick={() => setOpen(false)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
            >
              <Check className="h-3.5 w-3.5" /> Concluir
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
