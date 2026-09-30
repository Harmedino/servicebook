import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { formatInTimeZone } from "date-fns-tz";
import type { BookingStatus } from "@servicebook/types";
import { useStaffList, useUpdateStaff } from "../lib/staff";
import { useServices } from "../lib/services";
import { useBookings } from "../lib/bookings";
import { useMyBusiness } from "../lib/business";
import { StaffFormModal, type StaffFormSubmitValues } from "../components/StaffFormModal";
import { StaffAvailabilityEditor } from "../components/StaffAvailabilityEditor";
import { BookingDetailModal } from "../components/BookingDetailModal";
import { ApiError } from "../lib/apiClient";
import { DashboardLayout } from "../components/DashboardLayout";
import { ActiveBadge, BookingStatusBadge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Avatar } from "../components/ui/Avatar";
import { Skeleton } from "../components/ui/Skeleton";

const RECENT_APPOINTMENTS_LIMIT = 10;

const STATUS_ACCENT: Record<BookingStatus, string> = {
  PENDING: "bg-amber-400",
  CONFIRMED: "bg-green-500",
  CANCELLED: "bg-stone-300",
  COMPLETED: "bg-blue-400",
  NO_SHOW: "bg-red-400",
};

function AppointmentList({
  bookings,
  timezone,
  onSelect,
  emptyLabel,
}: {
  bookings: { id: string; customerName: string; serviceName: string; startTime: string; status: BookingStatus }[];
  timezone: string;
  onSelect: (id: string) => void;
  emptyLabel: string;
}) {
  if (bookings.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-stone-300 px-6 py-8 text-center text-sm text-stone-500">
        {emptyLabel}
      </p>
    );
  }

  return (
    <ol>
      {bookings.map((booking) => (
        <li key={booking.id} className="flex gap-4 border-t border-stone-100 py-1 first:border-t-0">
          <div className="w-24 shrink-0 pt-3 text-xs font-medium text-stone-500">
            {formatInTimeZone(new Date(booking.startTime), timezone, "MMM d")}
            <br />
            {formatInTimeZone(new Date(booking.startTime), timezone, "h:mm a")}
          </div>
          <span className={`w-0.5 shrink-0 self-stretch rounded-full ${STATUS_ACCENT[booking.status]}`} aria-hidden="true" />
          <button
            type="button"
            onClick={() => onSelect(booking.id)}
            className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-stone-50"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <Avatar name={booking.customerName} size="xs" />
              <p className="truncate text-sm font-semibold text-stone-900">
                {booking.customerName} <span className="font-normal text-stone-400">·</span> {booking.serviceName}
              </p>
            </div>
            <BookingStatusBadge status={booking.status} />
          </button>
        </li>
      ))}
    </ol>
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

  const recent = useMemo(() => {
    const now = Date.now();
    return allBookings
      .filter((booking) => new Date(booking.startTime).getTime() < now)
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
      .slice(0, RECENT_APPOINTMENTS_LIMIT);
  }, [allBookings]);

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
        <div className="flex items-center gap-3">
          <Avatar name={staff.name} src={staff.avatarUrl} size="lg" />
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-stone-900">{staff.name}</h1>
              <ActiveBadge isActive={staff.isActive} />
            </div>
            <p className="mt-1 text-sm text-stone-500">
              {staff.email ?? "No email"} · {staff.phone ?? "No phone"}
            </p>
          </div>
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
          <Button variant={staff.isActive ? "danger" : "primary"} onClick={handleToggleActive} isLoading={updateStaff.isPending}>
            {staff.isActive ? "Deactivate" : "Activate"}
          </Button>
        </div>
      </div>

      {actionError && (
        <p role="alert" className="animate-fade-in-up mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionError}
        </p>
      )}

      <Card className="mt-6 p-6">
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
      </Card>

      <div className="mt-6">
        <StaffAvailabilityEditor staffId={staff.id} />
      </div>

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
          {!isBookingsPending && !isBookingsError && (
            <AppointmentList
              bookings={upcoming}
              timezone={timezone}
              onSelect={setSelectedBookingId}
              emptyLabel="No upcoming appointments for this staff member."
            />
          )}
        </div>
      </div>

      <div className="mt-6">
        <h2 className="text-base font-semibold text-stone-900">Recent appointments</h2>
        <div className="mt-2">
          {!isBookingsPending && !isBookingsError && (
            <AppointmentList
              bookings={recent}
              timezone={timezone}
              onSelect={setSelectedBookingId}
              emptyLabel="No past appointments yet."
            />
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
