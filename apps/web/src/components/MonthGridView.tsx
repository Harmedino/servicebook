import type { BookingProfile, BookingStatus } from "@servicebook/types";
import { addDaysToKey, startOfWeekKey } from "../lib/calendarDates";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MAX_DOTS = 3;

const STATUS_DOT: Record<BookingStatus, string> = {
  PENDING: "bg-amber-400",
  CONFIRMED: "bg-green-500",
  CANCELLED: "bg-stone-300",
  COMPLETED: "bg-blue-400",
  NO_SHOW: "bg-red-400",
};

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
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-surface">
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
          const dayBookings = bookingsByDate.get(dateKey) ?? [];
          const isToday = dateKey === todayKey;
          const dayNumber = Number(dateKey.split("-")[2]);
          const dotBookings = dayBookings.slice(0, MAX_DOTS);
          const overflow = dayBookings.length - dotBookings.length;

          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => onDayClick(dateKey)}
              className={`flex min-h-20 flex-col items-start gap-1.5 border-b border-l border-stone-100 p-2 text-left transition-colors hover:bg-stone-50 ${
                inMonth ? "" : "bg-stone-50/50"
              }`}
            >
              <span
                className={
                  isToday
                    ? "flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white"
                    : `text-sm font-medium ${inMonth ? "text-stone-700" : "text-stone-300"}`
                }
              >
                {dayNumber}
              </span>
              {dayBookings.length > 0 && (
                <div className="flex items-center gap-1">
                  {dotBookings.map((booking) => (
                    <span key={booking.id} className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[booking.status]}`} />
                  ))}
                  {overflow > 0 && <span className="text-[11px] font-medium text-stone-400">+{overflow}</span>}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
