import { Visit, VisitShift } from "./agenda";

/** Janela esperada de cada turno (horas locais). Atraso = check-in após o "end". */
export const SHIFT_WINDOW: Record<VisitShift, { start: number; end: number; label: string }> = {
  manha: { start: 8,  end: 12, label: "manhã"  },
  tarde: { start: 13, end: 18, label: "tarde"  },
  noite: { start: 18, end: 22, label: "noite"  },
};

/** Tolerância (minutos) antes de considerar atraso. */
export const LATE_TOLERANCE_MIN = 15;

const hoursOf = (iso: string) => {
  const d = new Date(iso);
  return d.getHours() + d.getMinutes() / 60;
};

/**
 * Calcula minutos de atraso de uma visita, com base em check-in real ou hora atual.
 * - Visita com check-in: atraso = checkIn - shift.end (se positivo)
 * - Visita sem check-in (pendente/em_visita) no dia atual: atraso = agora - shift.end
 * - Outros estados: 0
 */
export function lateMinutes(v: Visit, now: Date = new Date()): number {
  const win = SHIFT_WINDOW[v.shift];
  if (!win) return 0;

  if (v.checkIn?.at) {
    const ci = hoursOf(v.checkIn.at);
    return Math.max(0, Math.round((ci - win.end) * 60));
  }

  if (v.status === "pendente" || v.status === "em_visita") {
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    if (v.date !== todayStr) return 0;
    const cur = now.getHours() + now.getMinutes() / 60;
    return Math.max(0, Math.round((cur - win.end) * 60));
  }

  return 0;
}

/** True se atraso > tolerância. */
export function isLate(v: Visit, now: Date = new Date()): boolean {
  return lateMinutes(v, now) > LATE_TOLERANCE_MIN;
}

/** Progresso do checklist em %. Retorna -1 se a visita não tem checklist. */
export function checklistProgress(v: Visit): number {
  if (!v.checklist || v.checklist.length === 0) return -1;
  const done = v.checklist.filter(i => i.done).length;
  return Math.round((done / v.checklist.length) * 100);
}

/** Itens pendentes do checklist (labels). */
export function pendingChecklist(v: Visit): string[] {
  if (!v.checklist) return [];
  return v.checklist.filter(i => !i.done).map(i => i.label);
}
