import { useNavigate, Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { Plus, Search } from "lucide-react";
import type { BookingStatus } from "@servicebook/types";
import { useBookings, useOpenBooking } from "../lib/bookings";
import { useStaffList } from "../lib/staff";
import { useMyBusiness } from "../lib/business";
import { DashboardLayout } from "../components/DashboardLayout";
import { STATUS_LABELS } from "../lib/bookingStatus";
import { addDaysToKey } from "../lib/calendarDates";
import { Button, buttonClassName } from "../components/ui/Button";
import { BookingStatusBadge } from "../components/ui/Badge";
import { useWaitlist } from "./WaitlistPage";
import { PageHeader } from "../components/ui/PageHeader";
import { EmptyState } from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";
import { useIsStaff } from "../lib/auth-context";
import { Avatar } from "../components/ui/Avatar";

type Tab = "today" | "upcoming" | "past" | "all";

const TABS: { value: Tab; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past" },
  { value: "all", label: "All" },
];

const STATUS_ACCENT: Record<BookingStatus, string> = {
  PENDING: "bg-amber-400",
  CONFIRMED: "bg-green-500",
  CANCELLED: "bg-stone-300",
  COMPLETED: "bg-blue-400",
  NO_SHOW: "bg-red-400",
};

export function BookingsPage() {
  const { data: businessData } = useMyBusiness();
  const timezone = businessData?.business?.timezone ?? "UTC";
  const bookingUrl = businessData?.business ? `${window.location.origin}/book/${businessData.business.slug}` : "";

  const { data: staffData } = useStaffList();
  const activeStaff = staffData?.staff ?? [];

  const [tab, setTab] = useState<Tab>("upcoming");
  const todayKey = formatInTimeZone(new Date(), timezone, "yyyy-MM-dd");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [staffFilter, setStaffFilter] = useState<string>("all");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  // Maps the selected tab to a server-side date range — bookings are always
  // fetched pre-scoped, never downloaded in bulk and filtered here.
  const { startDate, endDate } = useMemo(() => {
    switch (tab) {
      case "today":
        return { startDate: todayKey, endDate: todayKey };
      case "upcoming":
        return { startDate: todayKey, endDate: undefined };
      case "past":
        return { startDate: undefined, endDate: addDaysToKey(todayKey, -1) };
      case "all":
      default:
        return { startDate: undefined, endDate: undefined };
    }
  }, [tab, todayKey]);

  const { data, isPending, isError } = useBookings({
    startDate,
    endDate,
    status: statusFilter !== "all" ? (statusFilter as BookingStatus) : undefined,
    staffId: staffFilter !== "all" ? staffFilter : undefined,
    q: debouncedSearch || undefined,
  });

  const navigate = useNavigate();
  const isStaff = useIsStaff();
  const { data: waitlist } = useWaitlist(!isStaff);
  const openBooking = useOpenBooking();

  const bookings = useMemo(() => data?.bookings ?? [], [data?.bookings]);

  function openForm() {
    navigate("/bookings/new", { state: { from: "/bookings" } });
  }

  function dayLabel(dateKey: string): string {
    if (dateKey === todayKey) return "Today";
    if (dateKey === addDaysToKey(todayKey, 1)) return "Tomorrow";
    if (dateKey === addDaysToKey(todayKey, -1)) return "Yesterday";
    return formatInTimeZone(new Date(`${dateKey}T12:00:00Z`), "UTC", "EEEE, MMMM d");
  }

  const groupedByDate = useMemo(() => {
    const groups = new Map<string, typeof bookings>();
    for (const booking of bookings) {
      const dateKey = formatInTimeZone(new Date(booking.startTime), timezone, "yyyy-MM-dd");
      const list = groups.get(dateKey) ?? [];
      list.push(booking);
      groups.set(dateKey, list);
    }
    return [...groups.entries()];
  }, [bookings, timezone]);

  const hasActiveFilters = statusFilter !== "all" || staffFilter !== "all" || debouncedSearch.length > 0;

  return (
    <DashboardLayout>
      <PageHeader
        title={isStaff ? "My bookings" : "Bookings"}
        description={isStaff ? "Your appointments. Only you and the owner can see these." : "Your appointments, all in one place."}
        actions={
          <>
            {!isStaff && (
            <Link to="/waitlist" className={buttonClassName("secondary", "md")}>
              Waitlist
              {(waitlist?.entries.length ?? 0) > 0 && (
                <span className="rounded-full bg-amber-100 px-1.5 text-xs font-semibold text-amber-800">{waitlist?.entries.length}</span>
              )}
            </Link>
            )}
            <Button onClick={openForm}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              New booking
            </Button>
          </>
        }
      />

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-b border-stone-200">
        <div className="no-scrollbar flex gap-5 overflow-x-auto">
          {TABS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setTab(option.value)}
              className={`-mb-px shrink-0 border-b-2 pb-2.5 text-sm font-medium transition-colors ${
                tab === option.value ? "border-brand-600 text-stone-900" : "border-transparent text-stone-500 hover:text-stone-700"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" aria-hidden="true" />
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search customers…"
            className="w-full rounded-lg border border-stone-300 bg-surface py-2 pl-8 pr-3 text-sm text-stone-900 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-sm text-stone-500 transition-colors hover:border-stone-300 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
        >
          <option value="all">All statuses</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {!isStaff && (
        <select
          value={staffFilter}
          onChange={(event) => setStaffFilter(event.target.value)}
          className="rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-sm text-stone-500 transition-colors hover:border-stone-300 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
        >
          <option value="all">All staff</option>
          {activeStaff.map((staff) => (
            <option key={staff.id} value={staff.id}>
              {staff.name}
            </option>
          ))}
        </select>
        )}
      </div>

      <div className="mt-4">
        {isPending && (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
        )}

        {isError && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Couldn&apos;t load bookings. Please refresh the page.
          </p>
        )}

        {!isPending && !isError && bookings.length === 0 && !hasActiveFilters && (
          <EmptyState
            title="No appointments"
            description="Create a booking manually or share your public booking page with customers."
            action={
              <>
                <Button onClick={openForm}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  New booking
                </Button>
                {bookingUrl && (
                  <a href={bookingUrl} target="_blank" rel="noreferrer" className={buttonClassName("secondary", "md")}>
                    Open booking page
                  </a>
                )}
              </>
            }
          />
        )}

        {!isPending && !isError && bookings.length === 0 && hasActiveFilters && (
          <p className="rounded-lg border border-dashed border-stone-300 px-6 py-8 text-center text-sm text-stone-500">
            No bookings match this view.
          </p>
        )}

        {!isPending &&
          !isError &&
          groupedByDate.map(([dateKey, dayBookings]) => (
            <div key={dateKey} className="mb-6">
              <p className="section-label flex items-center justify-between">
                {dayLabel(dateKey)}
                <span className="font-medium normal-case tracking-normal text-stone-400">
                  {dayBookings.length} booking{dayBookings.length === 1 ? "" : "s"}
                </span>
              </p>
              <ol className="mt-2 overflow-hidden rounded-2xl border border-stone-200 bg-surface px-2 sm:px-3">
                {dayBookings.map((booking) => (
                  <li key={booking.id} className="flex gap-2.5 border-t border-stone-100 py-1 first:border-t-0 sm:gap-4">
                    <div className="w-14 shrink-0 pt-3.5 text-xs font-semibold tabular-nums text-stone-500 sm:w-16 sm:text-sm sm:font-medium">
                      {formatInTimeZone(new Date(booking.startTime), timezone, "h:mm a")}
                    </div>
                    <span className={`w-0.5 shrink-0 self-stretch rounded-full ${STATUS_ACCENT[booking.status]}`} aria-hidden="true" />
                    <button
                      type="button"
                      onClick={() => openBooking(booking.id)}
                      className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-stone-50"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="hidden sm:block">
                          <Avatar name={booking.customerName} size="sm" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-stone-900">{booking.customerName}</p>
                          <p className="truncate text-xs text-stone-500">
                            {booking.serviceName} <span className="text-stone-400">with</span> {booking.staffName}
                          </p>
                        </div>
                      </div>
                      <BookingStatusBadge status={booking.status} />
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          ))}
      </div>
    </DashboardLayout>
  );
}
