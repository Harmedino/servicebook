import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { formatInTimeZone } from "date-fns-tz";
import { useStaffList, useUpdateStaff } from "../lib/staff";
import { useServices } from "../lib/services";
import { useBookings } from "../lib/bookings";
import { useMyBusiness } from "../lib/business";
import { StaffFormModal, type StaffFormSubmitValues } from "../components/StaffFormModal";
import { StaffAvailabilityEditor } from "../components/StaffAvailabilityEditor";
import { BookingDetailModal } from "../components/BookingDetailModal";
import { STATUS_BADGE_STYLES, STATUS_LABELS } from "../lib/bookingStatus";
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

export function StaffDetailPage() {
  const { staffId } = useParams<{ staffId: string }>();
  const { data: staffData, isPending, isError } = useStaffList();
  const { data: servicesData } = useServices();
  const updateStaff = useUpdateStaff();

  const { data: businessData } = useMyBusiness();
  const timezone = businessData?.business?.timezone ?? "UTC";

  const staff = staffData?.staff.find((member) => member.id === staffId);
  const services = servicesData?.services ?? [];

  const { data: bookingsData, isPending: isBookingsPending, isError: isBookingsError } = useBookings({
    staffId: staffId ?? undefined,
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

  if (isError || !staff) {
    return (
      <DashboardLayout>
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Couldn&apos;t find that staff member.
        </p>
        <Link to="/staff" className="mt-4 inline-block text-sm font-medium text-brand-700 hover:text-brand-800">
          ← Back to staff
        </Link>
      </DashboardLayout>
    );
  }

  const assignedServices = services.filter((service) => staff.serviceIds.includes(service.id));
  const assignableServices = services.filter((service) => service.isActive || staff.serviceIds.includes(service.id));

  async function handleSubmit(values: StaffFormSubmitValues) {
    setFormError(null);
    try {
      await updateStaff.mutateAsync({ id: staff!.id, ...values });
      setIsEditOpen(false);
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : "Something went wrong. Please try again.");
    }
  }

  async function handleToggleActive() {
    if (staff!.isActive && !window.confirm(`Deactivate "${staff!.name}"? They won't be assignable to new bookings.`)) {
      return;
    }
    setActionError(null);
    try {
      await updateStaff.mutateAsync({ id: staff!.id, isActive: !staff!.isActive });
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <DashboardLayout>
      <Link to="/staff" className="text-sm font-medium text-brand-700 hover:text-brand-800">
        ← Back to staff
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-stone-900">{staff.name}</h1>
            <StatusBadge isActive={staff.isActive} />
          </div>
          <p className="mt-1 text-sm text-stone-500">
            {staff.email ?? "No email"} · {staff.phone ?? "No phone"}
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
            disabled={updateStaff.isPending}
            className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed ${
              staff.isActive
                ? "border-stone-300 text-stone-500 hover:bg-stone-100 hover:text-red-600"
                : "border-brand-200 text-brand-700 hover:bg-brand-50"
            }`}
          >
            {staff.isActive ? "Deactivate" : "Activate"}
          </button>
        </div>
      </div>

      {actionError && (
        <p role="alert" className="animate-fade-in-up mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionError}
        </p>
      )}

      <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-900">Services</h2>
        {assignedServices.length === 0 ? (
          <p className="mt-1 text-sm text-stone-500">No services assigned yet.</p>
        ) : (
          <ul className="mt-2 flex flex-wrap gap-2">
            {assignedServices.map((service) => (
              <li key={service.id} className="rounded-full bg-stone-100 px-3 py-1 text-sm text-stone-700">
                {service.name}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6">
        <StaffAvailabilityEditor staffId={staff.id} />
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
              No upcoming appointments for this staff member.
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
                          {booking.customerName} · {booking.serviceName}
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
        <StaffFormModal
          staff={staff}
          availableServices={assignableServices}
          isSubmitting={updateStaff.isPending}
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
