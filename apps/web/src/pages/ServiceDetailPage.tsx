import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { formatInTimeZone } from "date-fns-tz";
import { useServices, useUpdateService } from "../lib/services";
import { useStaffList } from "../lib/staff";
import { useBookings } from "../lib/bookings";
import { useMyBusiness } from "../lib/business";
import { ServiceFormModal, type ServiceFormSubmitValues } from "../components/ServiceFormModal";
import { BookingDetailModal } from "../components/BookingDetailModal";
import { STATUS_BADGE_STYLES, STATUS_LABELS } from "../lib/bookingStatus";
import { formatDuration, formatPrice } from "../lib/format";
import { ApiError } from "../lib/apiClient";
import { DashboardLayout } from "../components/DashboardLayout";

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isActive ? "bg-green-100 text-green-700" : "bg-stone-100 text-stone-600"
      }`}
    >
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

export function ServiceDetailPage() {
  const { serviceId } = useParams<{ serviceId: string }>();
  const { data: servicesData, isPending, isError } = useServices();
  const { data: staffData } = useStaffList();
  const updateService = useUpdateService();

  const { data: businessData } = useMyBusiness();
  const timezone = businessData?.business?.timezone ?? "UTC";

  const service = servicesData?.services.find((entry) => entry.id === serviceId);
  const allStaff = staffData?.staff ?? [];
  const assignedStaff = allStaff.filter((staff) => service?.staffIds.includes(staff.id));

  const { data: bookingsData, isPending: isBookingsPending, isError: isBookingsError } = useBookings({
    serviceId: serviceId ?? undefined,
  });

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  const allBookings = useMemo(() => bookingsData?.bookings ?? [], [bookingsData?.bookings]);
  const selectedBooking = allBookings.find((booking) => booking.id === selectedBookingId) ?? null;

  const upcoming = useMemo(() => {
    const now = Date.now();
    return allBookings
      .filter((booking) => new Date(booking.startTime).getTime() >= now && booking.status !== "CANCELLED")
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [allBookings]);

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

  if (isError || !service) {
    return (
      <DashboardLayout>
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Couldn&apos;t find that service.
        </p>
        <Link to="/services" className="mt-4 inline-block text-sm font-medium text-brand-700 hover:text-brand-800">
          ← Back to services
        </Link>
      </DashboardLayout>
    );
  }

  async function handleSubmit(values: ServiceFormSubmitValues) {
    setFormError(null);
    try {
      await updateService.mutateAsync({ id: service!.id, ...values });
      setIsEditOpen(false);
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : "Something went wrong. Please try again.");
    }
  }

  async function handleToggleActive() {
    if (service!.isActive && !window.confirm(`Deactivate "${service!.name}"? Customers won't be able to book it anymore.`)) {
      return;
    }
    setActionError(null);
    try {
      await updateService.mutateAsync({ id: service!.id, isActive: !service!.isActive });
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <DashboardLayout>
      <Link to="/services" className="text-sm font-medium text-brand-700 hover:text-brand-800">
        ← Back to services
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-stone-900">{service.name}</h1>
            <StatusBadge isActive={service.isActive} />
          </div>
          <p className="mt-1 text-sm text-stone-500">
            {formatDuration(service.durationMinutes)} · {formatPrice(service.price)}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              setFormError(null);
              setIsEditOpen(true);
            }}
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={handleToggleActive}
            disabled={updateService.isPending}
            className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed ${
              service.isActive
                ? "border-stone-300 text-stone-500 hover:bg-stone-100 hover:text-red-600"
                : "border-brand-200 text-brand-700 hover:bg-brand-50"
            }`}
          >
            {service.isActive ? "Deactivate" : "Activate"}
          </button>
        </div>
      </div>

      {actionError && (
        <p role="alert" className="animate-fade-in-up mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionError}
        </p>
      )}

      <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-900">Description</h2>
        <p className="mt-1 whitespace-pre-wrap text-sm text-stone-700">{service.description || "No description yet."}</p>
      </div>

      <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-900">Assigned staff</h2>
        {assignedStaff.length === 0 ? (
          <p className="mt-1 text-sm text-stone-500">No staff assigned yet — edit this service to assign staff.</p>
        ) : (
          <ul className="mt-2 flex flex-wrap gap-2">
            {assignedStaff.map((staff) => (
              <li key={staff.id} className="rounded-full bg-stone-100 px-3 py-1 text-sm text-stone-700">
                {staff.name}
                {!staff.isActive && <span className="ml-1 text-xs text-stone-400">(inactive)</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6">
        <h2 className="text-base font-semibold text-stone-900">Upcoming appointments</h2>

        <div className="mt-3">
          {isBookingsPending && (
            <div className="space-y-3">
              {[0, 1].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-2xl border border-stone-200 bg-white" />
              ))}
            </div>
          )}

          {isBookingsError && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Couldn&apos;t load appointments. Please refresh the page.
            </p>
          )}

          {!isBookingsPending && !isBookingsError && upcoming.length === 0 && (
            <p className="rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-8 text-center text-sm text-stone-500">
              No upcoming appointments use this service.
            </p>
          )}

          {!isBookingsPending && !isBookingsError && upcoming.length > 0 && (
            <ul className="space-y-3">
              {upcoming.map((booking) => (
                <li key={booking.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedBookingId(booking.id)}
                    className="w-full rounded-2xl border border-stone-200 bg-white p-4 text-left shadow-sm transition-colors hover:border-brand-300"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-stone-900">
                          {booking.customerName} · {booking.staffName}
                        </p>
                        <p className="mt-0.5 text-sm text-stone-500">{formatDateTime(booking.startTime)}</p>
                      </div>
                      <span
                        className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE_STYLES[booking.status]}`}
                      >
                        {STATUS_LABELS[booking.status]}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {isEditOpen && (
        <ServiceFormModal
          service={service}
          availableStaff={allStaff}
          isSubmitting={updateService.isPending}
          serverError={formError}
          onSubmit={handleSubmit}
          onClose={() => setIsEditOpen(false)}
        />
      )}

      {selectedBooking && (
        <BookingDetailModal booking={selectedBooking} timezone={timezone} onClose={() => setSelectedBookingId(null)} />
      )}
    </DashboardLayout>
  );
}
