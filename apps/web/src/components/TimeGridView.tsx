import { useMemo, type MouseEvent } from "react";
import { formatInTimeZone } from "date-fns-tz";
import type { BookingProfile } from "@servicebook/types";
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
    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
      <div className="flex border-b border-stone-200 text-xs font-medium uppercase tracking-wide text-stone-500">
        <div className="w-14 shrink-0 py-2" />
        {columns.map((column) => (
          <div key={column.key} className="flex-1 border-l border-stone-100 px-2 py-2 text-center">
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

              {positioned.map(({ booking, startMinutes, endMinutes, column: col, columnCount }) => {
                const clampedStart = Math.max(startMinutes, windowStartMinutes);
                const clampedEnd = Math.min(endMinutes, windowEndMinutes);
                const top = ((clampedStart - windowStartMinutes) / windowRange) * 100;
                const height = Math.max(3, ((clampedEnd - clampedStart) / windowRange) * 100);
                const isCancelled = booking.status === "CANCELLED";

                return (
                  <button
                    key={booking.id}
                    type="button"
                    data-booking-card
                    onClick={(event) => {
                      event.stopPropagation();
                      onBookingClick(booking);
                    }}
                    className={`absolute overflow-hidden rounded-md border px-1.5 py-1 text-left text-xs leading-tight shadow-sm transition-opacity hover:opacity-90 ${
                      isCancelled
                        ? "border-stone-200 bg-stone-100 text-stone-400 line-through"
                        : "border-brand-200 bg-brand-50 text-brand-900"
                    }`}
                    style={{
                      top: `${top}%`,
                      height: `${height}%`,
                      left: `${(col / columnCount) * 100}%`,
                      width: `${100 / columnCount}%`,
                    }}
                  >
                    <span className="block truncate font-medium">{booking.customerName}</span>
                    <span className="block truncate">{booking.serviceName}</span>
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
