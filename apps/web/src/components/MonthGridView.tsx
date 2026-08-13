import type { BookingProfile } from "@servicebook/types";
import { addDaysToKey, startOfWeekKey } from "../lib/calendarDates";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface MonthGridViewProps {
  monthStartKey: string;
  daysInMonth: number;
  bookingsByDate: Map<string, BookingProfile[]>;
  todayKey: string;
  onDayClick: (dateKey: string) => void;
}

export function MonthGridView({ monthStartKey, daysInMonth, bookingsByDate, todayKey, onDayClick }: MonthGridViewProps) {
  const gridStart = startOfWeekKey(monthStartKey);
  const [targetYear, targetMonth] = monthStartKey.split("-").map(Number);

  const offset = (new Date(targetYear, targetMonth - 1, 1).getDay() + 6) % 7;
  const totalCells = Math.ceil((offset + daysInMonth) / 7) * 7;
  const cells = Array.from({ length: totalCells }, (_, i) => addDaysToKey(gridStart, i));

  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
      <div className="grid grid-cols-7 border-b border-stone-200 text-xs font-medium uppercase tracking-wide text-stone-500">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="px-2 py-2 text-center">
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((dateKey) => {
          const [year, month] = dateKey.split("-").map(Number);
          const inMonth = year === targetYear && month === targetMonth;
          const dayBookings = (bookingsByDate.get(dateKey) ?? []).filter((booking) => booking.status !== "CANCELLED");
          const isToday = dateKey === todayKey;
          const dayNumber = Number(dateKey.split("-")[2]);

          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => onDayClick(dateKey)}
              className={`flex min-h-20 flex-col items-start gap-1.5 border-b border-l border-stone-100 p-2 text-left transition-colors hover:bg-stone-50 ${
                inMonth ? "" : "bg-stone-50/60"
              }`}
            >
              <span
                className={
                  isToday
                    ? "flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white"
                    : `text-sm font-medium ${inMonth ? "text-stone-700" : "text-stone-400"}`
                }
              >
                {dayNumber}
              </span>
              {dayBookings.length > 0 && (
                <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700">
                  {dayBookings.length} {dayBookings.length === 1 ? "booking" : "bookings"}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
