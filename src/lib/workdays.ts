// Cálculo de meta diária baseada em dias úteis (seg-sex), com suporte opcional a feriados.

export interface DailyPace {
  totalWorkdays: number;
  elapsedWorkdays: number;
  remainingWorkdays: number;
  dailyGoal: number;
  expectedToDate: number;
  delta: number;
  pace: number;
  requiredPerRemainingDay: number;
  isWorkdayToday: boolean;
}

const isWeekday = (d: Date) => {
  const day = d.getDay();
  return day !== 0 && day !== 6;
};

/** Set de ISO dates (YYYY-MM-DD) considerados feriados — não-úteis. */
export type HolidaySet = Set<string>;

const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function isWorkday(d: Date, holidays?: HolidaySet): boolean {
  if (!isWeekday(d)) return false;
  if (holidays && holidays.has(toISO(d))) return false;
  return true;
}

export function computeDailyPace(
  monthlyGoal: number,
  achievedMonth: number,
  ref: Date = new Date(),
  holidays?: HolidaySet,
): DailyPace {
  const year = ref.getFullYear();
  const month = ref.getMonth();
  const today = ref.getDate();
  const lastDay = new Date(year, month + 1, 0).getDate();

  let totalWorkdays = 0;
  let elapsedWorkdays = 0;
  for (let d = 1; d <= lastDay; d++) {
    const dt = new Date(year, month, d);
    if (isWorkday(dt, holidays)) {
      totalWorkdays++;
      if (d <= today) elapsedWorkdays++;
    }
  }

  const isWorkdayToday = isWorkday(ref, holidays);
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

/** Próximos N dias úteis a partir de "from" (incluindo from se for útil). */
export function nextWorkdays(from: Date, count: number, holidays?: HolidaySet): Date[] {
  const out: Date[] = [];
  const d = new Date(from);
  while (out.length < count) {
    if (isWorkday(d, holidays)) out.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

export { toISO };
