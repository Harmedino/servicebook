import { useEffect, useMemo, useState } from "react";
import { formatInTimeZone } from "date-fns-tz";
import type { BookingStatus } from "@servicebook/types";
import { useBookings, useCreateBooking } from "../lib/bookings";
import { useStaffList } from "../lib/staff";
import { useMyBusiness } from "../lib/business";
import { ApiError } from "../lib/apiClient";
import { BookingFormModal, type BookingFormSubmitValues } from "../components/BookingFormModal";
import { BookingDetailModal } from "../components/BookingDetailModal";
import { DashboardLayout } from "../components/DashboardLayout";
import { STATUS_BADGE_STYLES, STATUS_LABELS } from "../lib/bookingStatus";

type Tab = "today" | "upcoming" | "all";

function StatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

function BookingsLoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-16 animate-pulse rounded-2xl border border-stone-200 bg-white" />
      ))}
    </div>
  );
}

export function BookingsPage() {
  const { data: businessData } = useMyBusiness();
  const timezone = businessData?.business?.timezone ?? "UTC";

  const { data: staffData } = useStaffList();
  const activeStaff = staffData?.staff ?? [];

  const [tab, setTab] = useState<Tab>("upcoming");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [staffFilter, setStaffFilter] = useState<string>("all");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const { data, isPending, isError } = useBookings({
    status: statusFilter !== "all" ? (statusFilter as BookingStatus) : undefined,
    staffId: staffFilter !== "all" ? staffFilter : undefined,
    q: debouncedSearch || undefined,
  });
  const createBooking = useCreateBooking();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  const allBookings = useMemo(() => data?.bookings ?? [], [data?.bookings]);
  const selectedBooking = allBookings.find((booking) => booking.id === selectedBookingId) ?? null;

  const todayKey = formatInTimeZone(new Date(), timezone, "yyyy-MM-dd");
  const now = Date.now();

  const filteredBookings = useMemo(() => {
    if (tab === "today") {
      return allBookings.filter(
        (booking) => formatInTimeZone(new Date(booking.startTime), timezone, "yyyy-MM-dd") === todayKey,
      );
    }
    if (tab === "upcoming") {
      return allBookings.filter(
        (booking) => new Date(booking.startTime).getTime() >= now && booking.status !== "CANCELLED",
      );
    }
    return allBookings;
  }, [allBookings, tab, timezone, todayKey, now]);

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

  const hasActiveFilters = statusFilter !== "all" || staffFilter !== "all" || debouncedSearch.length > 0;

  return (
    <DashboardLayout>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Bookings</h1>
          <p className="mt-1 text-sm text-stone-500">Manage your appointments.</p>
        </div>
        <button
          type="button"
          onClick={openForm}
          className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
        >
          + New booking
        </button>
      </div>

      <div className="mt-4 flex gap-2">
        {(["today", "upcoming", "all"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === value ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            {value.charAt(0).toUpperCase() + value.slice(1)}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search customer name, phone, or email…"
          className="w-full max-w-xs rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
        />
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
        {isPending && <BookingsLoadingSkeleton />}

        {isError && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Couldn&apos;t load bookings. Please refresh the page.
          </p>
        )}

        {!isPending && !isError && allBookings.length === 0 && !hasActiveFilters && (
          <div className="animate-fade-in-up rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-12 text-center">
            <h2 className="text-base font-semibold text-stone-900">No bookings yet</h2>
            <p className="mt-1 text-sm text-stone-500">Create your first appointment to start managing your schedule.</p>
            <button
              type="button"
              onClick={openForm}
              className="mt-4 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
            >
              + New booking
            </button>
          </div>
        )}

        {!isPending && !isError && allBookings.length === 0 && hasActiveFilters && (
          <p className="rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-8 text-center text-sm text-stone-500">
            No bookings match these filters.
          </p>
        )}

        {!isPending && !isError && allBookings.length > 0 && filteredBookings.length === 0 && (
          <p className="rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-8 text-center text-sm text-stone-500">
            No bookings in this view.
          </p>
        )}

        {!isPending && !isError && filteredBookings.length > 0 && (
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
                {filteredBookings.map((booking) => (
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
                      <StatusBadge status={booking.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <ul className="space-y-3 md:hidden">
              {filteredBookings.map((booking) => (
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
                      <StatusBadge status={booking.status} />
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
