import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { formatInTimeZone } from "date-fns-tz";
import type { BookingStatus } from "@servicebook/types";
import { useServices, useUpdateService } from "../lib/services";
import { useStaffList } from "../lib/staff";
import { useBookings } from "../lib/bookings";
import { useMyBusiness } from "../lib/business";
import { ServiceFormModal, type ServiceFormSubmitValues } from "../components/ServiceFormModal";
import { BookingDetailModal } from "../components/BookingDetailModal";
import { formatDuration, formatPrice } from "../lib/format";
import { ApiError } from "../lib/apiClient";
import { DashboardLayout } from "../components/DashboardLayout";
import { ActiveBadge, BookingStatusBadge } from "../components/ui/Badge";
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
            <h1 className="text-2xl font-semibold tracking-tight text-stone-900">{service.name}</h1>
            <ActiveBadge isActive={service.isActive} />
          </div>
          <p className="mt-1 text-sm text-stone-500">
            {formatDuration(service.durationMinutes)} · {formatPrice(service.price)}
          </p>
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
          <Button variant={service.isActive ? "danger" : "primary"} onClick={handleToggleActive} isLoading={updateService.isPending}>
            {service.isActive ? "Deactivate" : "Activate"}
          </Button>
        </div>
      </div>

      {actionError && (
        <p role="alert" className="animate-fade-in-up mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionError}
        </p>
      )}

      <Card className="mt-6 p-6">
        <h2 className="text-lg font-semibold text-stone-900">Description</h2>
        <p className="mt-1 whitespace-pre-wrap text-sm text-stone-700">{service.description || "No description yet."}</p>
      </Card>

      <Card className="mt-6 p-6">
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
      </Card>

      <div className="mt-6">
        <h2 className="text-base font-semibold text-stone-900">Upcoming appointments</h2>

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
              Couldn&apos;t load appointments. Please refresh the page.
            </p>
          )}

          {!isBookingsPending && !isBookingsError && upcoming.length === 0 && (
            <p className="rounded-lg border border-dashed border-stone-300 px-6 py-8 text-center text-sm text-stone-500">
              No upcoming appointments use this service.
            </p>
          )}

          {!isBookingsPending && !isBookingsError && upcoming.length > 0 && (
            <ol>
              {upcoming.map((booking) => (
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
                    <div className="flex items-center gap-2.5">
                      <Avatar name={booking.customerName} size="xs" />
                      <p className="text-sm font-semibold text-stone-900">
                        {booking.customerName} <span className="font-normal text-stone-400">·</span> {booking.staffName}
                      </p>
                    </div>
                    <BookingStatusBadge status={booking.status} />
                  </button>
                </li>
              ))}
            </ol>
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
