import { useMemo, useState } from "react";
import { formatInTimeZone } from "date-fns-tz";
import type { BookingProfile, BookingStatus } from "@servicebook/types";
import { useBookings, useCreateBooking } from "../lib/bookings";
import { useStaffList } from "../lib/staff";
import { useBusinessHours } from "../lib/businessHours";
import { useMyBusiness } from "../lib/business";
import { ApiError } from "../lib/apiClient";
import { DashboardLayout } from "../components/DashboardLayout";
import { BookingFormModal, type BookingFormSubmitValues } from "../components/BookingFormModal";
import { BookingDetailModal } from "../components/BookingDetailModal";
import { TimeGridView, type GridColumn } from "../components/TimeGridView";
import { MonthGridView } from "../components/MonthGridView";
import {
  addDaysToKey,
  addMonthsToKey,
  dayOfWeekFromKey,
  daysInMonth as countDaysInMonth,
  startOfMonthKey,
  startOfWeekKey,
} from "../lib/calendarDates";
import { timeToMinutes } from "../lib/timeMath";
import { STATUS_LABELS } from "../lib/bookingStatus";

type ViewMode = "day" | "week" | "month";

const DEFAULT_WINDOW_START = 9 * 60;
const DEFAULT_WINDOW_END = 17 * 60;

/** Formats a pure calendar-date key without any timezone shift risk, by anchoring at UTC noon. */
function formatDateKey(dateKey: string, pattern: string): string {
  return formatInTimeZone(new Date(`${dateKey}T12:00:00Z`), "UTC", pattern);
}

export function CalendarPage() {
  const { data: businessData } = useMyBusiness();
  const timezone = businessData?.business?.timezone ?? "UTC";
  const todayKey = formatInTimeZone(new Date(), timezone, "yyyy-MM-dd");

  const [view, setView] = useState<ViewMode>("week");
  const [anchorDate, setAnchorDate] = useState(todayKey);
  const [staffFilter, setStaffFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [slotDate, setSlotDate] = useState<string | undefined>(undefined);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  const { data: staffData } = useStaffList();
  const { data: businessHoursData } = useBusinessHours();
  const activeStaff = useMemo(() => (staffData?.staff ?? []).filter((staff) => staff.isActive), [staffData?.staff]);
  const businessHours = businessHoursData?.hours ?? [];

  const { startDate, endDate } = useMemo(() => {
    if (view === "day") {
      return { startDate: anchorDate, endDate: anchorDate };
    }
    if (view === "week") {
      const start = startOfWeekKey(anchorDate);
      return { startDate: start, endDate: addDaysToKey(start, 6) };
    }
    const start = startOfMonthKey(anchorDate);
    return { startDate: start, endDate: addDaysToKey(start, countDaysInMonth(start) - 1) };
  }, [view, anchorDate]);

  const createBooking = useCreateBooking();

  const { data, isPending, isError, refetch } = useBookings({
    startDate,
    endDate,
    staffId: staffFilter !== "all" ? staffFilter : undefined,
    status: statusFilter !== "all" ? (statusFilter as BookingStatus) : undefined,
  });

  const bookings = useMemo(() => data?.bookings ?? [], [data?.bookings]);
  const selectedBooking = bookings.find((booking) => booking.id === selectedBookingId) ?? null;

  function navigate(direction: -1 | 1) {
    if (view === "day") {
      setAnchorDate((current) => addDaysToKey(current, direction));
    } else if (view === "week") {
      setAnchorDate((current) => addDaysToKey(current, direction * 7));
    } else {
      setAnchorDate((current) => addMonthsToKey(current, direction));
    }
  }

  function openSlotForm(dateKey: string) {
    setFormError(null);
    setSlotDate(dateKey);
    setIsFormOpen(true);
  }

  function openBlankForm() {
    setFormError(null);
    setSlotDate(undefined);
    setIsFormOpen(true);
  }

  async function handleCreate(values: BookingFormSubmitValues) {
    setFormError(null);
    try {
      await createBooking.mutateAsync(values);
      setIsFormOpen(false);
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : "Something went wrong. Please try again.");
    }
  }

  const dayKeys = useMemo(() => {
    if (view === "day") {
      return [anchorDate];
    }
    if (view === "week") {
      const start = startOfWeekKey(anchorDate);
      return Array.from({ length: 7 }, (_, i) => addDaysToKey(start, i));
    }
    return [];
  }, [view, anchorDate]);

  // Respects business hours visually, but expands to include any booking
  // that falls outside them rather than clipping/hiding real data.
  const displayWindow = useMemo(() => {
    let start = Infinity;
    let end = -Infinity;

    for (const dateKey of dayKeys) {
      const dow = dayOfWeekFromKey(dateKey);
      const hours = businessHours.find((entry) => entry.dayOfWeek === dow);
      if (hours && !hours.isClosed) {
        start = Math.min(start, timeToMinutes(hours.openTime));
        end = Math.max(end, timeToMinutes(hours.closeTime));
      }
    }

    for (const booking of bookings) {
      if (booking.status === "CANCELLED") {
        continue;
      }
      const localStart = formatInTimeZone(new Date(booking.startTime), timezone, "HH:mm");
      const localEnd = formatInTimeZone(new Date(booking.endTime), timezone, "HH:mm");
      start = Math.min(start, timeToMinutes(localStart));
      end = Math.max(end, timeToMinutes(localEnd));
    }

    if (start === Infinity) {
      return { start: DEFAULT_WINDOW_START, end: DEFAULT_WINDOW_END };
    }
    return { start, end: Math.max(end, start + 60) };
  }, [dayKeys, businessHours, bookings, timezone]);

  const bookingsByLocalDate = useMemo(() => {
    const map = new Map<string, BookingProfile[]>();
    for (const booking of bookings) {
      const dateKey = formatInTimeZone(new Date(booking.startTime), timezone, "yyyy-MM-dd");
      const list = map.get(dateKey) ?? [];
      list.push(booking);
      map.set(dateKey, list);
    }
    return map;
  }, [bookings, timezone]);

  const weekColumns: GridColumn[] = useMemo(
    () =>
      dayKeys.map((dateKey) => ({
        key: dateKey,
        label: formatDateKey(dateKey, "EEE d"),
        dateKey,
        bookings: bookingsByLocalDate.get(dateKey) ?? [],
      })),
    [dayKeys, bookingsByLocalDate],
  );

  const dayColumns: GridColumn[] = useMemo(() => {
    const staffToShow = staffFilter === "all" ? activeStaff : activeStaff.filter((staff) => staff.id === staffFilter);
    const dayBookings = bookingsByLocalDate.get(anchorDate) ?? [];
    return staffToShow.map((staff) => ({
      key: staff.id,
      label: staff.name,
      dateKey: anchorDate,
      bookings: dayBookings.filter((booking) => booking.staffId === staff.id),
    }));
  }, [staffFilter, activeStaff, bookingsByLocalDate, anchorDate]);

  const rangeLabel = useMemo(() => {
    if (view === "day") {
      return formatDateKey(anchorDate, "EEEE, MMMM d, yyyy");
    }
    if (view === "week") {
      const start = startOfWeekKey(anchorDate);
      const end = addDaysToKey(start, 6);
      return `${formatDateKey(start, "MMM d")} – ${formatDateKey(end, "MMM d, yyyy")}`;
    }
    return formatDateKey(startOfMonthKey(anchorDate), "MMMM yyyy");
  }, [view, anchorDate]);

  return (
    <DashboardLayout>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Calendar</h1>
          <p className="mt-1 text-sm text-stone-500">Your appointment schedule.</p>
        </div>
        <button
          type="button"
          onClick={openBlankForm}
          className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
        >
          + New booking
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Previous"
            className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => setAnchorDate(todayKey)}
            className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => navigate(1)}
            aria-label="Next"
            className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100"
          >
            →
          </button>
          <span className="ml-2 text-sm font-medium text-stone-900">{rangeLabel}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg bg-stone-100 p-1">
            {(["day", "week", "month"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setView(value)}
                className={`rounded-md px-3 py-1 text-sm font-medium capitalize transition-colors ${
                  view === value ? "bg-white text-stone-900 shadow-sm" : "text-stone-600 hover:text-stone-900"
                }`}
              >
                {value}
              </button>
            ))}
          </div>

          <select
            value={staffFilter}
            onChange={(event) => setStaffFilter(event.target.value)}
            className="rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-sm text-stone-700 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          >
            <option value="all">All staff</option>
            {activeStaff.map((staff) => (
              <option key={staff.id} value={staff.id}>
                {staff.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-sm text-stone-700 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          >
            <option value="all">All statuses</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-6">
        {isPending && <div className="h-96 animate-pulse rounded-2xl border border-stone-200 bg-white" />}

        {isError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-8 text-center">
            <p className="text-sm text-red-700">We couldn&apos;t load your appointments.</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-3 rounded-lg border border-red-300 px-4 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-100"
            >
              Try again
            </button>
          </div>
        )}

        {!isPending && !isError && bookings.length === 0 && (
          <div className="animate-fade-in-up rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-12 text-center">
            <h2 className="text-base font-semibold text-stone-900">No appointments</h2>
            <p className="mt-1 text-sm text-stone-500">There are no bookings scheduled for this period.</p>
            <button
              type="button"
              onClick={openBlankForm}
              className="mt-4 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
            >
              + New booking
            </button>
          </div>
        )}

        {!isPending && !isError && bookings.length > 0 && (
          <>
            {view !== "month" && (
              <div className="hidden md:block">
                <TimeGridView
                  columns={view === "day" ? dayColumns : weekColumns}
                  windowStartMinutes={displayWindow.start}
                  windowEndMinutes={displayWindow.end}
                  timezone={timezone}
                  onSlotClick={openSlotForm}
                  onBookingClick={(booking) => setSelectedBookingId(booking.id)}
                />
              </div>
            )}

            {view === "month" && (
              <MonthGridView
                monthStartKey={startOfMonthKey(anchorDate)}
                daysInMonth={countDaysInMonth(startOfMonthKey(anchorDate))}
                bookingsByDate={bookingsByLocalDate}
                todayKey={todayKey}
                onDayClick={(dateKey) => {
                  setAnchorDate(dateKey);
                  setView("day");
                }}
              />
            )}

            {/* Mobile: a stacked agenda list regardless of the selected view — a 7-column grid doesn't fit a phone. */}
            <div className="space-y-4 md:hidden">
              {[...bookingsByLocalDate.entries()]
                .sort(([a], [b]) => (a < b ? -1 : 1))
                .map(([dateKey, dayBookings]) => (
                  <div key={dateKey}>
                    <h3 className="text-sm font-semibold text-stone-900">{formatDateKey(dateKey, "EEEE, MMMM d")}</h3>
                    <ul className="mt-2 space-y-2">
                      {[...dayBookings]
                        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                        .map((booking) => (
                          <li key={booking.id}>
                            <button
                              type="button"
                              onClick={() => setSelectedBookingId(booking.id)}
                              className={`w-full rounded-2xl border p-3 text-left shadow-sm transition-colors ${
                                booking.status === "CANCELLED"
                                  ? "border-stone-200 bg-stone-50 text-stone-400"
                                  : "border-stone-200 bg-white hover:border-brand-300"
                              }`}
                            >
                              <p className="text-sm font-medium">
                                {formatInTimeZone(new Date(booking.startTime), timezone, "h:mm a")}
                              </p>
                              <p className={`text-sm ${booking.status === "CANCELLED" ? "line-through" : "text-stone-900"}`}>
                                {booking.customerName}
                              </p>
                              <p className="text-xs text-stone-500">
                                {booking.serviceName} · {booking.staffName}
                              </p>
                            </button>
                          </li>
                        ))}
                    </ul>
                  </div>
                ))}
            </div>
          </>
        )}
      </div>

      {isFormOpen && (
        <BookingFormModal
          isSubmitting={createBooking.isPending}
          serverError={formError}
          initialDate={slotDate}
          onSubmit={handleCreate}
          onClose={() => setIsFormOpen(false)}
        />
      )}

      {selectedBooking && (
        <BookingDetailModal booking={selectedBooking} timezone={timezone} onClose={() => setSelectedBookingId(null)} />
      )}
    </DashboardLayout>
  );
}
