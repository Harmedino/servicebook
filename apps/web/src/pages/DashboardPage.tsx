import { useState } from "react";
import { Link } from "react-router-dom";
import { formatInTimeZone } from "date-fns-tz";
import {
  CalendarClock,
  Copy,
  ExternalLink,
  Plus,
  Scissors,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { BookingStatus } from "@servicebook/types";
import { useDashboardSummary } from "../lib/dashboard";
import { useAuth } from "../lib/auth-context";
import { useMyBusiness } from "../lib/business";
import { useBusinessHours } from "../lib/businessHours";
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
import { BookingStatusBadge } from "../components/ui/Badge";
import { Button, buttonClassName } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Skeleton } from "../components/ui/Skeleton";
import { addDaysToKey, dayOfWeekFromKey } from "../lib/calendarDates";
import { DAY_LABELS } from "../lib/weekDays";

const STATUS_ACCENT: Record<BookingStatus, string> = {
  PENDING: "bg-amber-400",
  CONFIRMED: "bg-green-500",
  CANCELLED: "bg-stone-300",
  COMPLETED: "bg-blue-400",
  NO_SHOW: "bg-red-400",
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function DashboardSkeleton() {
  return (
    <div className="mt-6 space-y-6">
      <Skeleton className="h-16 rounded-xl" />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Skeleton className="h-96 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
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
  const { data: businessHoursData } = useBusinessHours();

  const createBooking = useCreateBooking();
  const createCustomer = useCreateCustomer();
  const createService = useCreateService();
  const createStaff = useCreateStaff();

  const [openModal, setOpenModal] = useState<"booking" | "customer" | "service" | "staff" | null>(null);
  const [quickActionError, setQuickActionError] = useState<string | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);

  const summary = data?.summary;
  const selectedBooking = summary
    ? [...summary.todayAppointments, ...summary.upcomingAppointments].find((booking) => booking.id === selectedBookingId) ?? null
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
    if (dateKey < addDaysToKey(todayKey, 7)) return DAY_LABELS[dayOfWeekFromKey(dateKey)];
    return formatInTimeZone(new Date(iso), timezone, "MMM d");
  }

  const bookingUrl = businessData?.business ? `${window.location.origin}/book/${businessData.business.slug}` : "";

  async function handleCopyLink() {
    if (!bookingUrl) return;
    try {
      await navigator.clipboard.writeText(bookingUrl);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch {
      // Clipboard access can be denied by the browser — the link stays visible/selectable.
    }
  }

  const todayLabel = formatInTimeZone(new Date(), timezone, "EEEE, MMMM d");

  const todayHoursLabel = (() => {
    const hours = businessHoursData?.hours ?? [];
    const entry = hours.find((h) => h.dayOfWeek === new Date().getDay());
    if (!entry || entry.isClosed) return "Closed today";
    return `Open · ${entry.openTime} – ${entry.closeTime}`;
  })();

  if (isError) {
    return (
      <DashboardLayout>
        <Card className="p-8 text-center">
          <p className="text-sm text-stone-600">Unable to load dashboard.</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={() => refetch()}>
            Try again
          </Button>
        </Card>
      </DashboardLayout>
    );
  }

  const setupItems = summary
    ? [
        { done: summary.setupStatus.businessInfoComplete, label: "Business profile" },
        { done: summary.setupStatus.hasActiveService, label: "Add your first service" },
        { done: summary.setupStatus.hasActiveStaff, label: "Add your first staff member" },
        { done: summary.setupStatus.hasStaffAvailability, label: "Set staff availability" },
        { done: summary.setupStatus.publicBookingEnabled, label: "Share your booking page" },
      ]
    : [];
  const setupDoneCount = setupItems.filter((item) => item.done).length;
  const setupIncomplete = setupDoneCount < setupItems.length;
  const setupPercent = setupItems.length > 0 ? Math.round((setupDoneCount / setupItems.length) * 100) : 0;

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

  const isBrandNewBusiness = Boolean(
    summary &&
      summary.todayAppointmentCount === 0 &&
      summary.upcomingAppointmentCount === 0 &&
      summary.customerCount === 0 &&
      setupIncomplete,
  );

  const todayConfirmed = summary?.todayAppointments.filter((b) => b.status === "CONFIRMED").length ?? 0;
  const todayPending = summary?.todayAppointments.filter((b) => b.status === "PENDING").length ?? 0;
  const todayCancelled = summary?.todayAppointments.filter((b) => b.status === "CANCELLED").length ?? 0;

  const QUICK_ACTIONS: { key: "booking" | "customer" | "service" | "staff"; label: string; icon: LucideIcon }[] = [
    { key: "booking", label: "New booking", icon: CalendarClock },
    { key: "customer", label: "Add customer", icon: UserPlus },
    { key: "service", label: "Add service", icon: Scissors },
    { key: "staff", label: "Add staff", icon: Users },
  ];

  return (
    <DashboardLayout>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-stone-900">
            {getGreeting()}
            {user ? `, ${user.name.split(" ")[0]}` : ""}
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Here&apos;s what&apos;s happening with {summary?.businessName ?? "your business"} today.
          </p>
          <p className="mt-1 text-xs font-medium text-stone-400">{todayLabel}</p>
        </div>
        {summary && (
          <Button onClick={() => setOpenModal("booking")}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            New booking
          </Button>
        )}
      </div>

      {isPending && <DashboardSkeleton />}

      {!isPending && summary && isBrandNewBusiness && (
        <div className="mt-10 max-w-lg">
          <p className="section-label">Get your business ready</p>
          <h2 className="mt-1.5 text-2xl font-semibold tracking-tight text-stone-900">
            Complete your setup to start accepting bookings.
          </h2>
          <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-stone-200">
            <div
              className="h-full rounded-full bg-brand-600 transition-all duration-500"
              style={{ width: `${setupPercent}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-stone-500">
            {setupDoneCount} of {setupItems.length} steps complete
          </p>
          <ul className="mt-6 space-y-3">
            {setupItems.map((item) => (
              <li key={item.label} className="flex items-center gap-3 text-sm">
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                    item.done ? "bg-green-600 text-white" : "border border-stone-300 text-transparent"
                  }`}
                >
                  {item.done ? "✓" : ""}
                </span>
                <span className={item.done ? "text-stone-400 line-through" : "text-stone-700"}>{item.label}</span>
              </li>
            ))}
          </ul>
          <Button className="mt-7" onClick={() => setOpenModal("service")}>
            Continue setup
          </Button>
        </div>
      )}

      {!isPending && summary && !isBrandNewBusiness && (
        <div className="mt-6 space-y-6">
          {(setupIncomplete || alerts.length > 0) && (
            <div className="space-y-2">
              {setupIncomplete && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-r-lg border-l-2 border-brand-400 bg-brand-50/70 px-4 py-2.5 text-sm">
                  <span className="text-stone-700">
                    Your setup is {setupPercent}% complete — {setupItems.length - setupDoneCount} step
                    {setupItems.length - setupDoneCount === 1 ? "" : "s"} left.
                  </span>
                  <Link to="/settings" className="font-medium text-brand-700 hover:text-brand-800">
                    Finish setup
                  </Link>
                </div>
              )}
              {alerts.map((alert) => (
                <div
                  key={alert.message}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-r-lg border-l-2 border-amber-400 bg-amber-50/70 px-4 py-2.5 text-sm"
                >
                  <span className="text-stone-700">{alert.message}</span>
                  <Link to={alert.to} className="font-medium text-brand-700 hover:text-brand-800">
                    {alert.linkLabel}
                  </Link>
                </div>
              ))}
            </div>
          )}

          {/* Today summary strip */}
          <div className="border-y border-stone-200 py-4">
            <p className="section-label">Today</p>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-8 gap-y-2">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-semibold tracking-tight text-stone-900">
                  {summary.todayAppointmentCount}
                </span>
                <span className="text-sm text-stone-500">appointment{summary.todayAppointmentCount === 1 ? "" : "s"}</span>
              </div>
              <div className="flex items-baseline gap-1.5 text-sm text-stone-600">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" aria-hidden="true" />
                {todayConfirmed} confirmed
              </div>
              <div className="flex items-baseline gap-1.5 text-sm text-stone-600">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" aria-hidden="true" />
                {todayPending} pending
              </div>
              <div className="flex items-baseline gap-1.5 text-sm text-stone-600">
                <span className="h-1.5 w-1.5 rounded-full bg-stone-300" aria-hidden="true" />
                {todayCancelled} cancelled
              </div>
              <div className="flex items-baseline gap-1.5 text-sm text-stone-600">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-500" aria-hidden="true" />
                {summary.upcomingAppointmentCount} upcoming
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
            {/* Left: today's schedule timeline */}
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-stone-900">Today&apos;s schedule</h2>
                <Link to="/calendar" className="text-sm font-medium text-brand-700 hover:text-brand-800">
                  View calendar
                </Link>
              </div>

              {summary.todayAppointments.length === 0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-stone-300 px-6 py-14 text-center">
                  <p className="text-sm font-semibold text-stone-900">Your schedule is clear</p>
                  <p className="mt-1 text-sm text-stone-500">
                    Create an appointment or share your booking page with customers.
                  </p>
                  <Button size="sm" className="mt-4" onClick={() => setOpenModal("booking")}>
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    New booking
                  </Button>
                </div>
              ) : (
                <ol className="mt-2">
                  {summary.todayAppointments.map((booking) => (
                    <li key={booking.id} className="flex gap-4 border-t border-stone-100 py-1 first:border-t-0">
                      <div className="w-16 shrink-0 pt-3 text-sm font-medium text-stone-500">
                        {formatTime(booking.startTime)}
                      </div>
                      <span className={`w-0.5 shrink-0 self-stretch rounded-full ${STATUS_ACCENT[booking.status]}`} aria-hidden="true" />
                      <button
                        type="button"
                        onClick={() => setSelectedBookingId(booking.id)}
                        className="flex flex-1 items-center justify-between gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-stone-50"
                      >
                        <div>
                          <p className="text-sm font-semibold text-stone-900">{booking.customerName}</p>
                          <p className="text-xs text-stone-500">
                            {booking.serviceName} · {booking.staffName}
                          </p>
                        </div>
                        <BookingStatusBadge status={booking.status} />
                      </button>
                    </li>
                  ))}
                </ol>
              )}

              {summary.upcomingAppointments.length > 0 && (
                <div className="mt-8">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-stone-900">Upcoming</h2>
                    <Link to="/bookings" className="text-sm font-medium text-brand-700 hover:text-brand-800">
                      View all
                    </Link>
                  </div>
                  <ul className="mt-2">
                    {summary.upcomingAppointments.map((booking) => (
                      <li key={booking.id} className="border-t border-stone-100 first:border-t-0">
                        <button
                          type="button"
                          onClick={() => setSelectedBookingId(booking.id)}
                          className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-stone-50"
                        >
                          <p className="text-sm text-stone-700">
                            <span className="font-medium text-stone-900">{relativeDayLabel(booking.startTime)}</span>,{" "}
                            {formatTime(booking.startTime)} — {booking.customerName}
                          </p>
                          <span className="shrink-0 text-xs text-stone-400">{booking.serviceName}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Right: business snapshot */}
            <div className="lg:sticky lg:top-8 lg:self-start">
              <Card className="divide-y divide-stone-200">
                <div className="p-5">
                  <p className="section-label">Business today</p>
                  <p className="mt-2 text-sm font-medium text-stone-900">{todayHoursLabel}</p>
                  <p className="mt-1 text-sm text-stone-500">
                    {summary.customerCount} customer{summary.customerCount === 1 ? "" : "s"} ·{" "}
                    {summary.activeServiceCount} active service{summary.activeServiceCount === 1 ? "" : "s"}
                  </p>
                </div>

                <div className="p-5">
                  <p className="section-label">Quick actions</p>
                  <div className="mt-3 space-y-0.5">
                    {QUICK_ACTIONS.map((action) => (
                      <button
                        key={action.key}
                        type="button"
                        onClick={() => setOpenModal(action.key)}
                        className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100"
                      >
                        <action.icon className="h-4 w-4 shrink-0 text-stone-400" aria-hidden="true" />
                        {action.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-5">
                  <p className="section-label">Booking page</p>
                  <p className="mt-2 text-sm text-stone-600">
                    {summary.isPublicBookingEnabled ? "Your booking page is live." : "Online booking is disabled."}
                  </p>
                  <div className="mt-3 flex flex-col gap-2">
                    <a href={bookingUrl} target="_blank" rel="noreferrer" className={buttonClassName("secondary", "sm", "justify-center")}>
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      Open booking page
                    </a>
                    <button type="button" onClick={handleCopyLink} className={buttonClassName("ghost", "sm", "justify-center")}>
                      <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                      {copyFeedback ? "Copied!" : "Copy link"}
                    </button>
                  </div>
                </div>
              </Card>
            </div>
          </div>
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
