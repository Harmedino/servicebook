import { useEffect, useMemo, useState } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { Plus } from "lucide-react";
import type { BookingStatus } from "@servicebook/types";
import { useBookings, useCreateBooking } from "../lib/bookings";
import { useStaffList } from "../lib/staff";
import { useMyBusiness } from "../lib/business";
import { ApiError } from "../lib/apiClient";
import { BookingFormModal, type BookingFormSubmitValues } from "../components/BookingFormModal";
import { BookingDetailModal } from "../components/BookingDetailModal";
import { DashboardLayout } from "../components/DashboardLayout";
import { STATUS_LABELS } from "../lib/bookingStatus";
import { addDaysToKey, startOfWeekKey } from "../lib/calendarDates";
import { Button, buttonClassName } from "../components/ui/Button";
import { BookingStatusBadge } from "../components/ui/Badge";
import { PageHeader } from "../components/ui/PageHeader";
import { EmptyState } from "../components/ui/EmptyState";
import { CardListSkeleton } from "../components/ui/Skeleton";

type DateScope = "today" | "tomorrow" | "week" | "upcoming" | "past" | "all" | "custom";

const DATE_SCOPE_OPTIONS: { value: DateScope; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "tomorrow", label: "Tomorrow" },
  { value: "week", label: "This week" },
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past" },
  { value: "all", label: "All" },
  { value: "custom", label: "Custom date…" },
];

export function BookingsPage() {
  const { data: businessData } = useMyBusiness();
  const timezone = businessData?.business?.timezone ?? "UTC";
  const bookingUrl = businessData?.business ? `${window.location.origin}/book/${businessData.business.slug}` : "";

  const { data: staffData } = useStaffList();
  const activeStaff = staffData?.staff ?? [];

  const [dateScope, setDateScope] = useState<DateScope>("upcoming");
  const todayKey = formatInTimeZone(new Date(), timezone, "yyyy-MM-dd");
  const [customDate, setCustomDate] = useState(todayKey);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [staffFilter, setStaffFilter] = useState<string>("all");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  // Maps the selected scope to a server-side date range — bookings are
  // always fetched pre-scoped, never downloaded in bulk and filtered here.
  const { startDate, endDate } = useMemo(() => {
    switch (dateScope) {
      case "today":
        return { startDate: todayKey, endDate: todayKey };
      case "tomorrow": {
        const tomorrow = addDaysToKey(todayKey, 1);
        return { startDate: tomorrow, endDate: tomorrow };
      }
      case "week": {
        const start = startOfWeekKey(todayKey);
        return { startDate: start, endDate: addDaysToKey(start, 6) };
      }
      case "upcoming":
        return { startDate: todayKey, endDate: undefined };
      case "past":
        return { startDate: undefined, endDate: addDaysToKey(todayKey, -1) };
      case "custom":
        return { startDate: customDate, endDate: customDate };
      case "all":
      default:
        return { startDate: undefined, endDate: undefined };
    }
  }, [dateScope, todayKey, customDate]);

  const { data, isPending, isError } = useBookings({
    startDate,
    endDate,
    status: statusFilter !== "all" ? (statusFilter as BookingStatus) : undefined,
    staffId: staffFilter !== "all" ? staffFilter : undefined,
    q: debouncedSearch || undefined,
  });
  const createBooking = useCreateBooking();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  const bookings = useMemo(() => data?.bookings ?? [], [data?.bookings]);
  const selectedBooking = bookings.find((booking) => booking.id === selectedBookingId) ?? null;

  function openForm() {
    setFormError(null);
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

  function formatDateTime(iso: string): string {
    return formatInTimeZone(new Date(iso), timezone, "MMM d, h:mm a");
  }

  // "Upcoming" and "All" are the two neutral/default views — narrowing to
  // any other scope, or adding a status/staff/search filter, is what makes
  // an empty result read as "no matches" rather than "no bookings yet."
  const hasActiveFilters =
    (dateScope !== "all" && dateScope !== "upcoming") ||
    statusFilter !== "all" ||
    staffFilter !== "all" ||
    debouncedSearch.length > 0;

  return (
    <DashboardLayout>
      <PageHeader
        title="Bookings"
        description="Manage your appointments."
        actions={
          <Button onClick={openForm}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            New booking
          </Button>
        }
      />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search customer name, phone, or email…"
          className="w-full max-w-xs rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
        />
        <select
          value={dateScope}
          onChange={(event) => setDateScope(event.target.value as DateScope)}
          className="rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-sm text-stone-700 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
        >
          {DATE_SCOPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {dateScope === "custom" && (
          <input
            type="date"
            value={customDate}
            onChange={(event) => setCustomDate(event.target.value)}
            className="rounded-lg border border-stone-300 px-2.5 py-1.5 text-sm text-stone-700 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          />
        )}
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
      </div>

      <div className="mt-6">
        {isPending && <CardListSkeleton />}

        {isError && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Couldn&apos;t load bookings. Please refresh the page.
          </p>
        )}

        {!isPending && !isError && bookings.length === 0 && !hasActiveFilters && (
          <EmptyState
            title="No bookings yet"
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
          <p className="rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-8 text-center text-sm text-stone-500">
            No bookings match this view.
          </p>
        )}

        {!isPending && !isError && bookings.length > 0 && (
          <>
            <table className="hidden w-full overflow-hidden rounded-2xl border border-stone-200 bg-white text-sm shadow-sm md:table">
              <thead className="bg-stone-50 text-left text-xs font-medium uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Service</th>
                  <th className="px-4 py-3">Staff</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {bookings.map((booking) => (
                  <tr
                    key={booking.id}
                    onClick={() => setSelectedBookingId(booking.id)}
                    className="cursor-pointer transition-colors hover:bg-stone-50"
                  >
                    <td className="px-4 py-3 font-medium text-stone-900">{booking.customerName}</td>
                    <td className="px-4 py-3 text-stone-600">{booking.serviceName}</td>
                    <td className="px-4 py-3 text-stone-600">{booking.staffName}</td>
                    <td className="px-4 py-3 text-stone-600">{formatDateTime(booking.startTime)}</td>
                    <td className="px-4 py-3">
                      <BookingStatusBadge status={booking.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <ul className="space-y-3 md:hidden">
              {bookings.map((booking) => (
                <li key={booking.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedBookingId(booking.id)}
                    className="w-full rounded-2xl border border-stone-200 bg-white p-4 text-left shadow-sm transition-colors hover:border-brand-300"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-stone-900">{booking.customerName}</p>
                        <p className="mt-0.5 text-sm text-stone-500">
                          {booking.serviceName} · {booking.staffName}
                        </p>
                        <p className="text-sm text-stone-500">{formatDateTime(booking.startTime)}</p>
                      </div>
                      <BookingStatusBadge status={booking.status} />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {isFormOpen && (
        <BookingFormModal
          isSubmitting={createBooking.isPending}
          serverError={formError}
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
