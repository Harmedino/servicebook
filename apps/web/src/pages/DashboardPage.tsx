import { useState } from "react";
import { Link } from "react-router-dom";
import { formatInTimeZone } from "date-fns-tz";
import { useDashboardSummary } from "../lib/dashboard";
import { useAuth } from "../lib/auth-context";
import { useMyBusiness } from "../lib/business";
import { useCreateService, useServices } from "../lib/services";
import { useCreateStaff, useStaffList } from "../lib/staff";
import { useCreateBooking } from "../lib/bookings";
import { useCreateCustomer } from "../lib/customers";
import { ApiError } from "../lib/apiClient";
import { DashboardLayout } from "../components/DashboardLayout";
import { BookingFormModal, type BookingFormSubmitValues } from "../components/BookingFormModal";
import { BookingDetailModal } from "../components/BookingDetailModal";
import { CustomerFormModal, type CustomerFormSubmitValues } from "../components/CustomerFormModal";
import { ServiceFormModal, type ServiceFormSubmitValues } from "../components/ServiceFormModal";
import { StaffFormModal, type StaffFormSubmitValues } from "../components/StaffFormModal";
import { STATUS_BADGE_STYLES, STATUS_LABELS } from "../lib/bookingStatus";
import { addDaysToKey, dayOfWeekFromKey } from "../lib/calendarDates";
import { DAY_LABELS } from "../lib/weekDays";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function DashboardSkeleton() {
  return (
    <div className="mt-6 space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-2xl border border-stone-200 bg-white" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-2xl border border-stone-200 bg-white" />
      <div className="h-40 animate-pulse rounded-2xl border border-stone-200 bg-white" />
    </div>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const { data: businessData } = useMyBusiness();
  const timezone = businessData?.business?.timezone ?? "UTC";

  const { data, isPending, isError, refetch } = useDashboardSummary();
  const { data: servicesData } = useServices();
  const { data: staffData } = useStaffList();

  const createBooking = useCreateBooking();
  const createCustomer = useCreateCustomer();
  const createService = useCreateService();
  const createStaff = useCreateStaff();

  const [openModal, setOpenModal] = useState<"booking" | "customer" | "service" | "staff" | null>(null);
  const [quickActionError, setQuickActionError] = useState<string | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);

  const summaryForSelection = data?.summary;
  const selectedBooking = summaryForSelection
    ? [...summaryForSelection.todayAppointments, ...summaryForSelection.upcomingAppointments].find(
        (booking) => booking.id === selectedBookingId,
      ) ?? null
    : null;

  function closeQuickAction() {
    setOpenModal(null);
    setQuickActionError(null);
  }

  async function handleCreateBooking(values: BookingFormSubmitValues) {
    setQuickActionError(null);
    try {
      await createBooking.mutateAsync(values);
      closeQuickAction();
    } catch (error) {
      setQuickActionError(error instanceof ApiError ? error.message : "Something went wrong. Please try again.");
    }
  }

  async function handleCreateCustomer(values: CustomerFormSubmitValues) {
    setQuickActionError(null);
    try {
      await createCustomer.mutateAsync(values);
      closeQuickAction();
    } catch (error) {
      setQuickActionError(error instanceof ApiError ? error.message : "Something went wrong. Please try again.");
    }
  }

  async function handleCreateService(values: ServiceFormSubmitValues) {
    setQuickActionError(null);
    try {
      await createService.mutateAsync(values);
      closeQuickAction();
    } catch (error) {
      setQuickActionError(error instanceof ApiError ? error.message : "Something went wrong. Please try again.");
    }
  }

  async function handleCreateStaff(values: StaffFormSubmitValues) {
    setQuickActionError(null);
    try {
      await createStaff.mutateAsync(values);
      closeQuickAction();
    } catch (error) {
      setQuickActionError(error instanceof ApiError ? error.message : "Something went wrong. Please try again.");
    }
  }

  function formatTime(iso: string): string {
    return formatInTimeZone(new Date(iso), timezone, "h:mm a");
  }

  function relativeDayLabel(iso: string): string {
    const dateKey = formatInTimeZone(new Date(iso), timezone, "yyyy-MM-dd");
    const todayKey = formatInTimeZone(new Date(), timezone, "yyyy-MM-dd");
    if (dateKey === todayKey) return "Today";
    if (dateKey === addDaysToKey(todayKey, 1)) return "Tomorrow";
    const withinAWeek = dateKey < addDaysToKey(todayKey, 7);
    if (withinAWeek) return DAY_LABELS[dayOfWeekFromKey(dateKey)];
    return formatInTimeZone(new Date(iso), timezone, "MMM d");
  }

  function relativeAddedLabel(iso: string): string {
    const dateKey = formatInTimeZone(new Date(iso), timezone, "yyyy-MM-dd");
    const todayKey = formatInTimeZone(new Date(), timezone, "yyyy-MM-dd");
    if (dateKey === todayKey) return "Added today";
    if (dateKey === addDaysToKey(todayKey, -1)) return "Added yesterday";
    return `Added ${formatInTimeZone(new Date(iso), timezone, "MMM d")}`;
  }

  const bookingUrl = businessData?.business ? `${window.location.origin}/book/${businessData.business.slug}` : "";

  async function handleCopyLink() {
    if (!bookingUrl) return;
    try {
      await navigator.clipboard.writeText(bookingUrl);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch {
      // Clipboard access can be denied by the browser — the link is still
      // visible and selectable, so this fails silently rather than erroring.
    }
  }

  if (isError) {
    return (
      <DashboardLayout>
        <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-8 text-center">
          <p className="text-sm text-red-700">Unable to load dashboard.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-3 rounded-lg border border-red-300 px-4 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-100"
          >
            Try again
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const summary = data?.summary;

  const setupItems = summary
    ? [
        { done: summary.setupStatus.businessInfoComplete, label: "Business information" },
        { done: summary.setupStatus.hasActiveService, label: "Add a service" },
        { done: summary.setupStatus.hasActiveStaff, label: "Add staff" },
        { done: summary.setupStatus.hasStaffAvailability, label: "Set availability" },
        { done: summary.setupStatus.publicBookingEnabled, label: "Enable online booking" },
      ]
    : [];
  const setupIncomplete = setupItems.some((item) => !item.done);

  const alerts: { message: string; to: string; linkLabel: string }[] = [];
  if (summary) {
    if (summary.activeServiceCount === 0) {
      alerts.push({ message: "Your business has no active services.", to: "/services", linkLabel: "Add a service" });
    }
    if (summary.staffMissingAvailabilityCount > 0) {
      alerts.push({
        message: `${summary.staffMissingAvailabilityCount} staff member${summary.staffMissingAvailabilityCount === 1 ? "" : "s"} ${summary.staffMissingAvailabilityCount === 1 ? "has" : "have"} no availability configured.`,
        to: "/staff",
        linkLabel: "Review staff",
      });
    }
    if (!summary.isPublicBookingEnabled) {
      alerts.push({ message: "Online booking is disabled.", to: "/settings", linkLabel: "Review settings" });
    }
    if (summary.pendingBookingCount > 0) {
      alerts.push({
        message: `${summary.pendingBookingCount} booking${summary.pendingBookingCount === 1 ? "" : "s"} awaiting confirmation.`,
        to: "/bookings",
        linkLabel: "Review bookings",
      });
    }
  }

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-semibold text-stone-900">
        {getGreeting()}
        {user ? `, ${user.name}` : ""}
      </h1>
      <p className="mt-1 text-sm text-stone-500">{summary?.businessName ?? "Loading your business…"}</p>

      {isPending && <DashboardSkeleton />}

      {!isPending && summary && (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Metrics strip */}
          <div className="grid grid-cols-2 gap-4 lg:order-1 lg:col-span-3 lg:grid-cols-4">
            {[
              { label: "Today's appointments", value: summary.todayAppointmentCount },
              { label: "Upcoming", value: summary.upcomingAppointmentCount },
              { label: "Customers", value: summary.customerCount },
              { label: "Active services", value: summary.activeServiceCount },
            ].map((metric) => (
              <div key={metric.label} className="animate-fade-in-up rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-stone-500">{metric.label}</p>
                <p className="mt-1 text-2xl font-semibold text-stone-900">{metric.value}</p>
              </div>
            ))}
          </div>

          {/* Today's appointments */}
          <div className="animate-fade-in-up rounded-2xl border border-stone-200 bg-white p-5 shadow-sm lg:order-2 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-stone-900">Today&apos;s appointments</h2>
              <Link to="/calendar" className="text-sm font-medium text-brand-700 hover:text-brand-800">
                View calendar
              </Link>
            </div>
            {summary.todayAppointments.length === 0 ? (
              <p className="mt-3 text-sm text-stone-500">No appointments scheduled for today.</p>
            ) : (
              <ul className="mt-3 divide-y divide-stone-100">
                {summary.todayAppointments.map((booking) => (
                  <li key={booking.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedBookingId(booking.id)}
                      className="flex w-full items-center justify-between gap-3 py-2.5 text-left transition-colors hover:bg-stone-50"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-20 shrink-0 text-sm font-medium text-stone-700">{formatTime(booking.startTime)}</span>
                        <div>
                          <p className="text-sm font-medium text-stone-900">{booking.customerName}</p>
                          <p className="text-xs text-stone-500">
                            {booking.serviceName} · {booking.staffName}
                          </p>
                        </div>
                      </div>
                      <span className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE_STYLES[booking.status]}`}>
                        {STATUS_LABELS[booking.status]}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Quick actions */}
          <div className="animate-fade-in-up rounded-2xl border border-stone-200 bg-white p-5 shadow-sm lg:order-3">
            <h2 className="text-sm font-semibold text-stone-900">Quick actions</h2>
            <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-1">
              <button
                type="button"
                onClick={() => setOpenModal("booking")}
                className="rounded-lg border border-stone-300 px-3 py-2 text-left text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100"
              >
                + New booking
              </button>
              <button
                type="button"
                onClick={() => setOpenModal("customer")}
                className="rounded-lg border border-stone-300 px-3 py-2 text-left text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100"
              >
                + Add customer
              </button>
              <button
                type="button"
                onClick={() => setOpenModal("service")}
                className="rounded-lg border border-stone-300 px-3 py-2 text-left text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100"
              >
                + Add service
              </button>
              <button
                type="button"
                onClick={() => setOpenModal("staff")}
                className="rounded-lg border border-stone-300 px-3 py-2 text-left text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100"
              >
                + Add staff
              </button>
            </div>
          </div>

          {/* Upcoming appointments */}
          <div className="animate-fade-in-up rounded-2xl border border-stone-200 bg-white p-5 shadow-sm lg:order-4 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-stone-900">Upcoming</h2>
              <Link to="/bookings" className="text-sm font-medium text-brand-700 hover:text-brand-800">
                View all appointments
              </Link>
            </div>
            {summary.upcomingAppointments.length === 0 ? (
              <p className="mt-3 text-sm text-stone-500">Nothing else on the schedule yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-stone-100">
                {summary.upcomingAppointments.map((booking) => (
                  <li key={booking.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedBookingId(booking.id)}
                      className="flex w-full items-center justify-between gap-3 py-2.5 text-left transition-colors hover:bg-stone-50"
                    >
                      <div>
                        <p className="text-sm font-medium text-stone-900">
                          {relativeDayLabel(booking.startTime)}, {formatTime(booking.startTime)} — {booking.customerName}
                        </p>
                        <p className="text-xs text-stone-500">{booking.serviceName}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Public booking link */}
          <div className="animate-fade-in-up rounded-2xl border border-stone-200 bg-white p-5 shadow-sm lg:order-5">
            <h2 className="text-sm font-semibold text-stone-900">Your booking page</h2>
            <p className="mt-1 truncate text-xs text-stone-500">{bookingUrl}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleCopyLink}
                className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100"
              >
                {copyFeedback ? "Copied!" : "Copy booking link"}
              </button>
              <a
                href={bookingUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
              >
                Open booking page
              </a>
            </div>
          </div>

          {/* Setup checklist + alerts */}
          {(setupIncomplete || alerts.length > 0) && (
            <div className="animate-fade-in-up rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm lg:order-6 lg:col-span-3">
              <h2 className="text-sm font-semibold text-stone-900">Needs attention</h2>
              <div className="mt-3 space-y-3">
                {setupIncomplete && (
                  <ul className="space-y-1.5 text-sm text-stone-700">
                    {setupItems.map((item) => (
                      <li key={item.label} className="flex items-center gap-2">
                        <span className={item.done ? "text-green-600" : "text-stone-400"}>{item.done ? "✓" : "○"}</span>
                        <span className={item.done ? "text-stone-500 line-through" : ""}>{item.label}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {alerts.map((alert) => (
                  <div key={alert.message} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="text-stone-700">{alert.message}</span>
                    <Link to={alert.to} className="font-medium text-brand-700 hover:text-brand-800">
                      {alert.linkLabel}
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Team overview */}
          {summary.staffToday.length > 0 && (
            <div className="animate-fade-in-up rounded-2xl border border-stone-200 bg-white p-5 shadow-sm lg:order-7">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-stone-900">Team</h2>
                <Link to="/staff" className="text-sm font-medium text-brand-700 hover:text-brand-800">
                  Manage staff
                </Link>
              </div>
              <ul className="mt-3 space-y-1.5 text-sm text-stone-700">
                {summary.staffToday.map((staff) => (
                  <li key={staff.staffId}>
                    {staff.staffName} — {staff.todayAppointmentCount} appointment{staff.todayAppointmentCount === 1 ? "" : "s"} today
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Services overview */}
          <div className="animate-fade-in-up rounded-2xl border border-stone-200 bg-white p-5 shadow-sm lg:order-8">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-stone-900">Services</h2>
              <Link to="/services" className="text-sm font-medium text-brand-700 hover:text-brand-800">
                Manage services
              </Link>
            </div>
            <p className="mt-3 text-sm text-stone-700">
              {summary.activeServiceCount} active · {summary.inactiveServiceCount} inactive
            </p>
          </div>

          {/* Recent customers */}
          {summary.recentCustomers.length > 0 && (
            <div className="animate-fade-in-up rounded-2xl border border-stone-200 bg-white p-5 shadow-sm lg:order-9">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-stone-900">Recent customers</h2>
                <Link to="/customers" className="text-sm font-medium text-brand-700 hover:text-brand-800">
                  View customers
                </Link>
              </div>
              <ul className="mt-3 space-y-2">
                {summary.recentCustomers.map((customer) => (
                  <li key={customer.id}>
                    <Link to={`/customers/${customer.id}`} className="flex items-center justify-between text-sm hover:text-brand-700">
                      <span className="font-medium text-stone-900">{customer.name}</span>
                      <span className="text-xs text-stone-500">{relativeAddedLabel(customer.createdAt)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {openModal === "booking" && (
        <BookingFormModal
          isSubmitting={createBooking.isPending}
          serverError={quickActionError}
          onSubmit={handleCreateBooking}
          onClose={closeQuickAction}
        />
      )}
      {openModal === "customer" && (
        <CustomerFormModal
          customer={null}
          isSubmitting={createCustomer.isPending}
          serverError={quickActionError}
          onSubmit={handleCreateCustomer}
          onClose={closeQuickAction}
        />
      )}
      {openModal === "service" && (
        <ServiceFormModal
          service={null}
          availableStaff={staffData?.staff ?? []}
          isSubmitting={createService.isPending}
          serverError={quickActionError}
          onSubmit={handleCreateService}
          onClose={closeQuickAction}
        />
      )}
      {openModal === "staff" && (
        <StaffFormModal
          staff={null}
          availableServices={(servicesData?.services ?? []).filter((service) => service.isActive)}
          isSubmitting={createStaff.isPending}
          serverError={quickActionError}
          onSubmit={handleCreateStaff}
          onClose={closeQuickAction}
        />
      )}

      {selectedBooking && (
        <BookingDetailModal booking={selectedBooking} timezone={timezone} onClose={() => setSelectedBookingId(null)} />
      )}
    </DashboardLayout>
  );
}
