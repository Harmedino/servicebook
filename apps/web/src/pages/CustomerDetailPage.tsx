import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { formatInTimeZone } from "date-fns-tz";
import { Plus } from "lucide-react";
import type { BookingStatus } from "@servicebook/types";
import { useCustomer, useUpdateCustomer } from "../lib/customers";
import { useBookings, useCreateBooking } from "../lib/bookings";
import { useMyBusiness } from "../lib/business";
import { CustomerFormModal, type CustomerFormSubmitValues } from "../components/CustomerFormModal";
import { BookingFormModal, type BookingFormSubmitValues } from "../components/BookingFormModal";
import { BookingDetailModal } from "../components/BookingDetailModal";
import { ApiError } from "../lib/apiClient";
import { DashboardLayout } from "../components/DashboardLayout";
import { BookingStatusBadge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Avatar } from "../components/ui/Avatar";
import { Skeleton } from "../components/ui/Skeleton";

const STATUS_ACCENT: Record<BookingStatus, string> = {
  PENDING: "bg-amber-400",
  CONFIRMED: "bg-green-500",
  CANCELLED: "bg-stone-300",
  COMPLETED: "bg-blue-400",
  NO_SHOW: "bg-red-400",
};

export function CustomerDetailPage() {
  const { customerId } = useParams<{ customerId: string }>();
  const { data, isPending, isError } = useCustomer(customerId ?? "");
  const updateCustomer = useUpdateCustomer();
  const createBooking = useCreateBooking();

  const { data: businessData } = useMyBusiness();
  const timezone = businessData?.business?.timezone ?? "UTC";

  const { data: bookingsData, isPending: isBookingsPending, isError: isBookingsError } = useBookings({
    customerId: customerId ?? undefined,
  });

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isBookingFormOpen, setIsBookingFormOpen] = useState(false);
  const [bookingFormError, setBookingFormError] = useState<string | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [historyFilter, setHistoryFilter] = useState<"all" | "upcoming" | "completed" | "cancelled">("all");

  const allBookings = useMemo(() => bookingsData?.bookings ?? [], [bookingsData?.bookings]);
  const selectedBooking = allBookings.find((booking) => booking.id === selectedBookingId) ?? null;

  const now = Date.now();

  // Total/completed/cancelled/last/next are always derived from this
  // customer's actual bookings, never a stored counter.
  const stats = useMemo(() => {
    const totalCount = allBookings.length;
    const completedCount = allBookings.filter((booking) => booking.status === "COMPLETED").length;
    const cancelledCount = allBookings.filter((booking) => booking.status === "CANCELLED").length;

    const upcoming = allBookings
      .filter((booking) => new Date(booking.startTime).getTime() >= now && booking.status !== "CANCELLED")
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    const past = allBookings
      .filter((booking) => new Date(booking.startTime).getTime() < now)
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

    return {
      totalCount,
      completedCount,
      cancelledCount,
      nextAppointment: upcoming[0] ?? null,
      lastAppointment: past[0] ?? null,
    };
  }, [allBookings, now]);

  const history = useMemo(() => {
    let filtered = allBookings;
    if (historyFilter === "upcoming") {
      filtered = allBookings.filter(
        (booking) => new Date(booking.startTime).getTime() >= now && booking.status !== "CANCELLED",
      );
    } else if (historyFilter === "completed") {
      filtered = allBookings.filter((booking) => booking.status === "COMPLETED");
    } else if (historyFilter === "cancelled") {
      filtered = allBookings.filter((booking) => booking.status === "CANCELLED");
    }

    const sorted = [...filtered].sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    // Upcoming reads more naturally soonest-first rather than newest-first.
    return historyFilter === "upcoming" ? sorted.reverse() : sorted;
  }, [allBookings, historyFilter, now]);

  function formatDateTime(iso: string): string {
    return formatInTimeZone(new Date(iso), timezone, "MMM d, yyyy · h:mm a");
  }

  if (isPending) {
    return (
      <DashboardLayout>
        <p className="text-sm text-stone-500">Loading…</p>
      </DashboardLayout>
    );
  }

  if (isError || !data?.customer) {
    return (
      <DashboardLayout>
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Couldn&apos;t find that customer.
        </p>
        <Link to="/customers" className="mt-4 inline-block text-sm font-medium text-brand-700 hover:text-brand-800">
          ← Back to customers
        </Link>
      </DashboardLayout>
    );
  }

  const customer = data.customer;

  async function handleSubmit(values: CustomerFormSubmitValues) {
    setFormError(null);
    try {
      await updateCustomer.mutateAsync({ id: customer.id, ...values });
      setIsEditOpen(false);
      setSuccessMessage("Customer updated.");
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : "Something went wrong. Please try again.");
    }
  }

  async function handleCreateBooking(values: BookingFormSubmitValues) {
    setBookingFormError(null);
    try {
      await createBooking.mutateAsync(values);
      setIsBookingFormOpen(false);
    } catch (error) {
      setBookingFormError(error instanceof ApiError ? error.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <DashboardLayout>
      <Link to="/customers" className="text-sm font-medium text-brand-700 hover:text-brand-800">
        ← Back to customers
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Avatar name={customer.name} size="lg" />
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">{customer.name}</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            onClick={() => {
              setFormError(null);
              setIsEditOpen(true);
            }}
          >
            Edit
          </Button>
          <Button
            onClick={() => {
              setBookingFormError(null);
              setIsBookingFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            New booking
          </Button>
        </div>
      </div>

      {successMessage && (
        <p role="status" className="animate-fade-in-up mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          {successMessage}
        </p>
      )}

      <Card className="mt-6 p-6">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">Phone</dt>
            <dd className="mt-1 text-sm">
              <a href={`tel:${customer.phone}`} className="text-brand-700 hover:text-brand-800">
                {customer.phone}
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">Email</dt>
            <dd className="mt-1 text-sm">
              {customer.email ? (
                <a href={`mailto:${customer.email}`} className="text-brand-700 hover:text-brand-800">
                  {customer.email}
                </a>
              ) : (
                <span className="text-stone-900">—</span>
              )}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">Notes</dt>
            <dd className="mt-1 whitespace-pre-wrap text-sm text-stone-700">{customer.notes || "No notes yet."}</dd>
          </div>
        </dl>
      </Card>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Total appointments</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-stone-900">{stats.totalCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Completed</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-stone-900">{stats.completedCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Cancelled</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-stone-900">{stats.cancelledCount}</p>
        </Card>
      </div>

      <div className="mt-6 rounded-r-lg border-l-2 border-brand-400 bg-brand-50/70 p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-brand-700">Next appointment</p>
        {isBookingsPending ? (
          <p className="mt-2 text-sm text-stone-500">Loading…</p>
        ) : stats.nextAppointment ? (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium text-stone-900">
                {stats.nextAppointment.serviceName} with {stats.nextAppointment.staffName}
              </p>
              <p className="text-sm text-stone-600">{formatDateTime(stats.nextAppointment.startTime)}</p>
            </div>
            <Button size="sm" onClick={() => setSelectedBookingId(stats.nextAppointment!.id)}>
              View appointment
            </Button>
          </div>
        ) : (
          <p className="mt-2 text-sm text-stone-600">No upcoming appointments.</p>
        )}
        {!isBookingsPending && stats.lastAppointment && (
          <p className="mt-3 text-xs text-stone-500">Last appointment: {formatDateTime(stats.lastAppointment.startTime)}</p>
        )}
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-stone-900">Appointment history</h2>
          <select
            value={historyFilter}
            onChange={(event) => setHistoryFilter(event.target.value as typeof historyFilter)}
            className="rounded-lg border border-stone-300 bg-surface px-2.5 py-1.5 text-sm text-stone-700 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          >
            <option value="all">All</option>
            <option value="upcoming">Upcoming</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="mt-2">
          {isBookingsPending && (
            <div className="space-y-2">
              {[0, 1].map((i) => (
                <Skeleton key={i} className="h-14 rounded-lg" />
              ))}
            </div>
          )}

          {isBookingsError && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Couldn&apos;t load appointment history. Please refresh the page.
            </p>
          )}

          {!isBookingsPending && !isBookingsError && history.length === 0 && (
            <p className="rounded-lg border border-dashed border-stone-300 px-6 py-8 text-center text-sm text-stone-500">
              {historyFilter === "all"
                ? "No appointments yet for this customer."
                : "No appointments match this filter."}
            </p>
          )}

          {!isBookingsPending && !isBookingsError && history.length > 0 && (
            <ol>
              {history.map((booking) => (
                <li key={booking.id} className="flex gap-4 border-t border-stone-100 py-1 first:border-t-0">
                  <div className="w-24 shrink-0 pt-3 text-xs font-medium text-stone-500">
                    {formatInTimeZone(new Date(booking.startTime), timezone, "MMM d")}
                    <br />
                    {formatInTimeZone(new Date(booking.startTime), timezone, "h:mm a")}
                  </div>
                  <span className={`w-0.5 shrink-0 self-stretch rounded-full ${STATUS_ACCENT[booking.status]}`} aria-hidden="true" />
                  <button
                    type="button"
                    onClick={() => setSelectedBookingId(booking.id)}
                    className="flex flex-1 items-center justify-between gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-stone-50"
                  >
                    <p className="text-sm font-semibold text-stone-900">
                      {booking.serviceName} <span className="font-normal text-stone-400">with</span> {booking.staffName}
                    </p>
                    <BookingStatusBadge status={booking.status} />
                  </button>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      {isEditOpen && (
        <CustomerFormModal
          customer={customer}
          isSubmitting={updateCustomer.isPending}
          serverError={formError}
          onSubmit={handleSubmit}
          onClose={() => setIsEditOpen(false)}
        />
      )}

      {isBookingFormOpen && (
        <BookingFormModal
          isSubmitting={createBooking.isPending}
          serverError={bookingFormError}
          initialCustomerId={customer.id}
          onSubmit={handleCreateBooking}
          onClose={() => setIsBookingFormOpen(false)}
        />
      )}

      {selectedBooking && (
        <BookingDetailModal booking={selectedBooking} timezone={timezone} onClose={() => setSelectedBookingId(null)} />
      )}
    </DashboardLayout>
  );
}
