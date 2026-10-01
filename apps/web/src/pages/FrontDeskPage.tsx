import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { formatInTimeZone } from "date-fns-tz";
import { ChevronLeft, ChevronRight, Expand, Plus, X } from "lucide-react";
import type { BookingProfile } from "@servicebook/types";
import { useBookings, useOpenBooking } from "../lib/bookings";
import { useMyBusiness } from "../lib/business";
import { useBusinessHours } from "../lib/businessHours";
import { useStaffList } from "../lib/staff";
import { blocksForDay, useTimeOff } from "../lib/timeOff";
import { addDaysToKey, dayOfWeekFromKey } from "../lib/calendarDates";
import { timeToMinutes } from "../lib/timeMath";
import { TimeGridView, type GridColumn } from "../components/TimeGridView";
import { BookingStatusBadge } from "../components/ui/Badge";
import { Avatar } from "../components/ui/Avatar";

/** Re-render every 30 seconds so the clock and "Up next" stay current. */
function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

/**
 * /front-desk — the day's calendar, big and full screen, for a tablet or
 * screen at reception. Refreshes itself, so new online bookings appear.
 */
export function FrontDeskPage() {
  const now = useNow();
  const navigate = useNavigate();
  const openBooking = useOpenBooking();
  const { data: businessData } = useMyBusiness();
  const { data: hoursData } = useBusinessHours();
  const { data: staffData } = useStaffList();
  const { data: timeOffData } = useTimeOff();
  const timezone = businessData?.business?.timezone ?? "UTC";
  const todayKey = formatInTimeZone(now, timezone, "yyyy-MM-dd");
  const [dateKey, setDateKey] = useState(todayKey);
  const { data } = useBookings({ startDate: dateKey, endDate: dateKey }, { refetchInterval: 30_000 });

  const bookings = useMemo(() => (data?.bookings ?? []).filter((booking) => booking.status !== "CANCELLED"), [data]);
  const staff = (staffData?.staff ?? []).filter((member) => member.isActive);
  const timeOff = timeOffData?.timeOff ?? [];

  const columns: GridColumn[] = staff.map((member) => ({
    key: member.id,
    label: member.name.split(" ")[0],
    dateKey,
    bookings: bookings.filter((booking) => booking.staffId === member.id),
    blocks: blocksForDay(timeOff, dateKey, timezone, member.id),
  }));

  const hours = hoursData?.hours.find((entry) => entry.dayOfWeek === dayOfWeekFromKey(dateKey));
  const windowStart = hours && !hours.isClosed ? timeToMinutes(hours.openTime) : 8 * 60;
  const windowEnd = hours && !hours.isClosed ? timeToMinutes(hours.closeTime) : 20 * 60;

  const isToday = dateKey === todayKey;
  const inProgress = isToday ? bookings.filter((booking) => new Date(booking.startTime) <= now && new Date(booking.endTime) > now) : [];
  const upNext = bookings.filter((booking) => (isToday ? new Date(booking.startTime) > now : true)).slice(0, 8);

  useEffect(() => {
    document.title = "Front desk";
  }, []);

  function goFullScreen() {
    void document.documentElement.requestFullscreen?.().catch(() => undefined);
  }

  const row = (booking: BookingProfile, live = false) => (
    <li key={booking.id}>
      <button
        type="button"
        onClick={() => openBooking(booking.id)}
        className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-colors hover:bg-white/10 ${live ? "bg-highlight/15" : ""}`}
      >
        <span className="w-16 shrink-0 font-display text-xl font-semibold tabular-nums">{formatInTimeZone(new Date(booking.startTime), timezone, "h:mm")}</span>
        <Avatar name={booking.customerName} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{booking.customerName}</span>
          <span className="block truncate text-sm text-white/60">
            {booking.serviceName} · {booking.staffName.split(" ")[0]}
          </span>
        </span>
        <BookingStatusBadge status={booking.status} />
      </button>
    </li>
  );

  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <header className="flex flex-wrap items-center gap-x-6 gap-y-3 bg-ink px-5 py-4 text-white">
        <div className="min-w-0">
          <p className="truncate text-sm text-white/60">{businessData?.business?.name}</p>
          <p className="font-display text-4xl font-semibold tabular-nums leading-none">{formatInTimeZone(now, timezone, "h:mm")}</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setDateKey(addDaysToKey(dateKey, -1))} aria-label="Previous day" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setDateKey(todayKey)}
            className={`h-11 rounded-full px-5 text-base font-semibold ${isToday ? "bg-highlight text-ink" : "bg-white/10 hover:bg-white/20"}`}
          >
            {isToday ? "Today" : formatInTimeZone(new Date(`${dateKey}T12:00:00Z`), "UTC", "EEE d MMM")}
          </button>
          <button type="button" onClick={() => setDateKey(addDaysToKey(dateKey, 1))} aria-label="Next day" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <p className="text-lg text-white/80">
          {formatInTimeZone(new Date(`${dateKey}T12:00:00Z`), "UTC", "EEEE d MMMM")} · {bookings.length} appointment{bookings.length === 1 ? "" : "s"}
        </p>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(`/bookings/new?date=${dateKey}`, { state: { from: "/front-desk" } })}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-highlight px-5 font-semibold text-ink"
          >
            <Plus className="h-5 w-5" aria-hidden="true" /> New booking
          </button>
          <button type="button" onClick={goFullScreen} aria-label="Full screen" className="hidden h-11 w-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 sm:flex">
            <Expand className="h-5 w-5" aria-hidden="true" />
          </button>
          <Link to="/calendar" aria-label="Exit front desk view" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
            <X className="h-5 w-5" aria-hidden="true" />
          </Link>
        </div>
      </header>

      <div className="grid flex-1 grid-cols-[minmax(0,1fr)] gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 overflow-x-auto">
          {hours?.isClosed && bookings.length === 0 ? (
            <div className="flex h-full min-h-[300px] items-center justify-center rounded-2xl border border-stone-200 bg-surface text-xl text-stone-500">Closed today</div>
          ) : (
            <div className="min-w-[640px]">
              <TimeGridView
                large
                columns={columns}
                windowStartMinutes={windowStart}
                windowEndMinutes={windowEnd}
                timezone={timezone}
                onSlotClick={(day, time) => navigate(`/bookings/new?date=${day}`, { state: { from: "/front-desk", time } })}
                onBookingClick={(booking) => openBooking(booking.id)}
              />
            </div>
          )}
        </div>

        <aside className="rounded-3xl bg-ink p-4 text-white lg:sticky lg:top-4 lg:self-start">
          {inProgress.length > 0 && (
            <>
              <p className="px-2 text-xs font-semibold uppercase tracking-wider text-highlight">In the chair now</p>
              <ul className="mt-1">{inProgress.map((booking) => row(booking, true))}</ul>
            </>
          )}
          <p className={`px-2 text-xs font-semibold uppercase tracking-wider text-white/50 ${inProgress.length ? "mt-4" : ""}`}>{isToday ? "Up next" : "That day"}</p>
          {upNext.length === 0 ? (
            <p className="px-2 py-6 text-white/60">{isToday ? "No one else booked today." : "No appointments."}</p>
          ) : (
            <ul className="mt-1">{upNext.map((booking) => row(booking))}</ul>
          )}
        </aside>
      </div>
    </div>
  );
}
