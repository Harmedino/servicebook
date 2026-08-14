import { useMemo, type MouseEvent } from "react";
import { formatInTimeZone } from "date-fns-tz";
import type { BookingProfile, BookingStatus } from "@servicebook/types";
import { minutesToTime, timeToMinutes } from "../lib/timeMath";

export interface GridColumn {
  key: string;
  label: string;
  dateKey: string;
  bookings: BookingProfile[];
}

interface PositionedBooking {
  booking: BookingProfile;
  startMinutes: number;
  endMinutes: number;
  column: number;
  columnCount: number;
}

const STATUS_BLOCK_STYLES: Record<BookingStatus, string> = {
  PENDING: "border-l-amber-400 bg-amber-50 text-amber-900",
  CONFIRMED: "border-l-green-500 bg-green-50 text-green-900",
  CANCELLED: "border-l-stone-300 bg-stone-100 text-stone-400 line-through",
  COMPLETED: "border-l-blue-400 bg-blue-50 text-blue-900",
  NO_SHOW: "border-l-red-400 bg-red-50 text-red-900",
};

/** Assigns each booking a sub-column so overlapping bookings render side by side instead of on top of each other. */
function layoutColumnBookings(bookings: BookingProfile[], timezone: string): PositionedBooking[] {
  const withMinutes = bookings.map((booking) => ({
    booking,
    startMinutes: timeToMinutes(formatInTimeZone(new Date(booking.startTime), timezone, "HH:mm")),
    endMinutes: timeToMinutes(formatInTimeZone(new Date(booking.endTime), timezone, "HH:mm")),
  }));
  withMinutes.sort((a, b) => a.startMinutes - b.startMinutes);

  const columnEnds: number[] = [];
  const positioned = withMinutes.map((entry) => {
    let column = columnEnds.findIndex((end) => end <= entry.startMinutes);
    if (column === -1) {
      column = columnEnds.length;
      columnEnds.push(entry.endMinutes);
    } else {
      columnEnds[column] = entry.endMinutes;
    }
    return { ...entry, column };
  });

  const columnCount = Math.max(1, columnEnds.length);
  return positioned.map((entry) => ({ ...entry, columnCount }));
}

interface TimeGridViewProps {
  columns: GridColumn[];
  windowStartMinutes: number;
  windowEndMinutes: number;
  timezone: string;
  onSlotClick: (dateKey: string, time: string) => void;
  onBookingClick: (booking: BookingProfile) => void;
}

export function TimeGridView({
  columns,
  windowStartMinutes,
  windowEndMinutes,
  timezone,
  onSlotClick,
  onBookingClick,
}: TimeGridViewProps) {
  const windowRange = Math.max(1, windowEndMinutes - windowStartMinutes);

  const hourMarks = useMemo(() => {
    const marks: number[] = [];
    const first = Math.ceil(windowStartMinutes / 60) * 60;
    for (let minute = first; minute <= windowEndMinutes; minute += 60) {
      marks.push(minute);
    }
    return marks;
  }, [windowStartMinutes, windowEndMinutes]);

  // A static snapshot is fine here — this isn't a live-ticking clock, just a
  // "roughly where are we right now" reference line.
  const now = useMemo(() => {
    const instant = new Date();
    return {
      dateKey: formatInTimeZone(instant, timezone, "yyyy-MM-dd"),
      minutes: timeToMinutes(formatInTimeZone(instant, timezone, "HH:mm")),
    };
  }, [timezone]);

  function handleColumnClick(event: MouseEvent<HTMLDivElement>, column: GridColumn) {
    if ((event.target as HTMLElement).closest("[data-booking-card]")) {
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const fraction = (event.clientY - rect.top) / rect.height;
    const clickedMinutes = windowStartMinutes + fraction * windowRange;
    const snapped = Math.max(windowStartMinutes, Math.floor(clickedMinutes / 30) * 30);
    onSlotClick(column.dateKey, minutesToTime(snapped));
  }

  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
      <div className="flex border-b border-stone-200 text-xs font-medium uppercase tracking-wide text-stone-500">
        <div className="w-14 shrink-0 py-2" />
        {columns.map((column) => (
          <div
            key={column.key}
            className={`flex-1 border-l border-stone-100 px-2 py-2 text-center ${
              column.dateKey === now.dateKey ? "text-brand-700" : ""
            }`}
          >
            {column.label}
          </div>
        ))}
      </div>

      <div className="relative flex" style={{ height: `${Math.max(360, windowRange * 1.2)}px` }}>
        <div className="relative w-14 shrink-0">
          {hourMarks.map((minute) => (
            <span
              key={minute}
              className="absolute right-0 -translate-y-1/2 pr-2 text-right text-xs text-stone-400"
              style={{ top: `${((minute - windowStartMinutes) / windowRange) * 100}%` }}
            >
              {minutesToTime(minute)}
            </span>
          ))}
        </div>

        {columns.map((column) => {
          const positioned = layoutColumnBookings(column.bookings, timezone);
          const showNowLine =
            column.dateKey === now.dateKey && now.minutes >= windowStartMinutes && now.minutes <= windowEndMinutes;

          return (
            <div
              key={column.key}
              onClick={(event) => handleColumnClick(event, column)}
              className="relative flex-1 cursor-pointer border-l border-stone-100 transition-colors hover:bg-stone-50/60"
            >
              {hourMarks.map((minute) => (
                <div
                  key={minute}
                  className="absolute inset-x-0 border-t border-stone-100"
                  style={{ top: `${((minute - windowStartMinutes) / windowRange) * 100}%` }}
                />
              ))}

              {showNowLine && (
                <div
                  className="pointer-events-none absolute inset-x-0 z-10 flex items-center"
                  style={{ top: `${((now.minutes - windowStartMinutes) / windowRange) * 100}%` }}
                  aria-hidden="true"
                >
                  <span className="-ml-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                  <span className="h-px flex-1 bg-red-400" />
                </div>
              )}

              {positioned.map(({ booking, startMinutes, endMinutes, column: col, columnCount }) => {
                const clampedStart = Math.max(startMinutes, windowStartMinutes);
                const clampedEnd = Math.min(endMinutes, windowEndMinutes);
                const top = ((clampedStart - windowStartMinutes) / windowRange) * 100;
                const height = Math.max(3, ((clampedEnd - clampedStart) / windowRange) * 100);

                return (
                  <button
                    key={booking.id}
                    type="button"
                    data-booking-card
                    onClick={(event) => {
                      event.stopPropagation();
                      onBookingClick(booking);
                    }}
                    className={`absolute overflow-hidden rounded-r-md border-l-2 px-1.5 py-1 text-left text-xs leading-tight transition-opacity hover:opacity-80 ${STATUS_BLOCK_STYLES[booking.status]}`}
                    style={{
                      top: `${top}%`,
                      height: `${height}%`,
                      left: `${(col / columnCount) * 100}%`,
                      width: `${100 / columnCount}%`,
                    }}
                  >
                    <span className="block truncate font-medium">{booking.customerName}</span>
                    <span className="block truncate opacity-80">{booking.serviceName}</span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
