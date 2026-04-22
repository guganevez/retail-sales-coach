// Cálculo de meta diária baseada em dias úteis (seg-sex), ignorando fins de semana.
// Mantém-se simples e determinístico — sem feriados, para evitar dependência externa.

export interface DailyPace {
  /** Total de dias úteis no mês corrente */
  totalWorkdays: number;
  /** Dias úteis já decorridos (incluindo hoje, se for útil) */
  elapsedWorkdays: number;
  /** Dias úteis restantes (excluindo hoje) */
  remainingWorkdays: number;
  /** Meta diária = meta mensal / dias úteis */
  dailyGoal: number;
  /** Quanto deveria ter sido vendido até hoje (proporcional aos dias úteis decorridos) */
  expectedToDate: number;
  /** Diferença: realizado - esperado (negativo = atrasado) */
  delta: number;
  /** Pace: 1.0 = no ritmo da meta. >1 acima, <1 abaixo */
  pace: number;
  /** Meta diária ajustada para os dias restantes (se quiser bater 100%) */
  requiredPerRemainingDay: number;
  /** Hoje é dia útil? */
  isWorkdayToday: boolean;
}

const isWorkday = (d: Date) => {
  const day = d.getDay();
  return day !== 0 && day !== 6;
};

export function computeDailyPace(
  monthlyGoal: number,
  achievedMonth: number,
  ref: Date = new Date(),
): DailyPace {
  const year = ref.getFullYear();
  const month = ref.getMonth();
  const today = ref.getDate();
  const lastDay = new Date(year, month + 1, 0).getDate();

  let totalWorkdays = 0;
  let elapsedWorkdays = 0;
  for (let d = 1; d <= lastDay; d++) {
    const dt = new Date(year, month, d);
    if (isWorkday(dt)) {
      totalWorkdays++;
      if (d <= today) elapsedWorkdays++;
    }
  }

  const isWorkdayToday = isWorkday(ref);
  const remainingWorkdays = Math.max(0, totalWorkdays - elapsedWorkdays);
  const dailyGoal = totalWorkdays > 0 ? monthlyGoal / totalWorkdays : 0;
  const expectedToDate = dailyGoal * elapsedWorkdays;
  const delta = achievedMonth - expectedToDate;
  const pace = expectedToDate > 0 ? achievedMonth / expectedToDate : 0;
  const remainingGoal = Math.max(0, monthlyGoal - achievedMonth);
  const requiredPerRemainingDay = remainingWorkdays > 0
    ? remainingGoal / remainingWorkdays
    : remainingGoal;

  return {
    totalWorkdays,
    elapsedWorkdays,
    remainingWorkdays,
    dailyGoal,
    expectedToDate,
    delta,
    pace,
    requiredPerRemainingDay,
    isWorkdayToday,
  };
}
