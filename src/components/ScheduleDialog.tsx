import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Sun, Sunset, Moon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { VisitShift } from "@/lib/agenda";

const SHIFTS: { value: VisitShift; label: string; icon: typeof Sun }[] = [
  { value: "manha", label: "Manhã", icon: Sun },
  { value: "tarde", label: "Tarde", icon: Sunset },
  { value: "noite", label: "Noite", icon: Moon },
];

const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const fromISO = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

interface ScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Título exibido (ex.: "Agendar visita" ou "Reagendar visita") */
  title: string;
  description?: string;
  /** Nome do cliente para mostrar no contexto */
  clientName?: string;
  /** Data inicial (YYYY-MM-DD) */
  defaultDate: string;
  /** Turno inicial */
  defaultShift: VisitShift;
  /** Texto do botão de confirmação */
  confirmLabel?: string;
  /** Bloquear datas anteriores a hoje */
  disablePast?: boolean;
  onConfirm: (date: string, shift: VisitShift) => void;
}

export function ScheduleDialog({
  open,
  onOpenChange,
  title,
  description,
  clientName,
  defaultDate,
  defaultShift,
  confirmLabel = "Confirmar",
  disablePast = true,
  onConfirm,
}: ScheduleDialogProps) {
  const [date, setDate] = useState<Date>(() => fromISO(defaultDate));
  const [shift, setShift] = useState<VisitShift>(defaultShift);
  const [popoverOpen, setPopoverOpen] = useState(false);

  // Reset ao reabrir
  useEffect(() => {
    if (open) {
      setDate(fromISO(defaultDate));
      setShift(defaultShift);
    }
  }, [open, defaultDate, defaultShift]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="space-y-4">
          {clientName && (
            <div className="rounded-xl bg-muted/40 p-3">
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Cliente</p>
              <p className="text-sm font-semibold truncate">{clientName}</p>
            </div>
          )}

          <div>
            <p className="mb-1.5 text-[11px] font-bold uppercase text-muted-foreground">Data</p>
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date
                    ? format(date, "EEE, dd 'de' MMM 'de' yyyy", { locale: ptBR })
                    : "Escolher data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => {
                    if (d) {
                      setDate(d);
                      setPopoverOpen(false);
                    }
                  }}
                  disabled={disablePast ? (d) => d < today : undefined}
                  initialFocus
                  locale={ptBR}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <p className="mb-1.5 text-[11px] font-bold uppercase text-muted-foreground">Turno</p>
            <div className="flex items-center gap-1 rounded-2xl bg-muted/40 p-1">
              {SHIFTS.map(s => {
                const Icon = s.icon;
                const active = shift === s.value;
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setShift(s.value)}
                    className={cn(
                      "flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition",
                      active ? "bg-primary text-primary-foreground shadow-glow" : "text-muted-foreground hover:bg-card",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              onConfirm(toISO(date), shift);
              onOpenChange(false);
            }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
