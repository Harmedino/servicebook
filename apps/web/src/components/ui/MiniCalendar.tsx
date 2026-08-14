import { addDaysToKey, daysInMonth as countDaysInMonth, startOfMonthKey, startOfWeekKey } from "../../lib/calendarDates";

const WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

interface MiniCalendarProps {
  /** Any date within the month to display, e.g. today's key. */
  referenceDateKey: string;
  todayKey: string;
  /** Dates that have at least one appointment — rendered with a small dot. */
  markedDateKeys?: Set<string>;
  monthLabel: string;
}

export function MiniCalendar({ referenceDateKey, todayKey, markedDateKeys, monthLabel }: MiniCalendarProps) {
  const monthStartKey = startOfMonthKey(referenceDateKey);
  const [targetYear, targetMonth] = monthStartKey.split("-").map(Number);
  const daysInMonth = countDaysInMonth(monthStartKey);
  const gridStart = startOfWeekKey(monthStartKey);
  const offset = (new Date(targetYear, targetMonth - 1, 1).getDay() + 6) % 7;
  const totalCells = Math.ceil((offset + daysInMonth) / 7) * 7;
  const cells = Array.from({ length: totalCells }, (_, i) => addDaysToKey(gridStart, i));

  return (
    <div>
      <p className="text-xs font-semibold text-stone-500">{monthLabel}</p>
      <div className="mt-2 grid grid-cols-7 gap-y-1 text-center">
        {WEEKDAY_LABELS.map((label, i) => (
          <span key={`${label}-${i}`} className="text-[10px] font-medium text-stone-400">
            {label}
          </span>
        ))}
        {cells.map((dateKey) => {
          const [year, month] = dateKey.split("-").map(Number);
          const inMonth = year === targetYear && month === targetMonth;
          const isToday = dateKey === todayKey;
          const hasMark = markedDateKeys?.has(dateKey) ?? false;
          const dayNumber = Number(dateKey.split("-")[2]);

          return (
            <div key={dateKey} className="flex flex-col items-center">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                  isToday
                    ? "bg-brand-600 font-semibold text-white"
                    : inMonth
                      ? "text-stone-700"
                      : "text-stone-300"
                }`}
              >
                {dayNumber}
              </span>
              <span className={`mt-0.5 h-1 w-1 rounded-full ${hasMark && !isToday ? "bg-brand-400" : "bg-transparent"}`} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
