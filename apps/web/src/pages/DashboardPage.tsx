import { useState } from "react";
import { Link } from "react-router-dom";
import { formatInTimeZone } from "date-fns-tz";
import {
  CalendarClock,
  CheckCircle2,
  Circle,
  Clock,
  Copy,
  ExternalLink,
  Plus,
  Scissors,
  Users,
  type LucideIcon,
} from "lucide-react";
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
import { PageHeader } from "../components/ui/PageHeader";
import { StatCard } from "../components/ui/StatCard";
import { Skeleton } from "../components/ui/Skeleton";
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
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
      <Skeleton className="h-40 rounded-2xl" />
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
      // Clipboard access can be denied by the browser — the link is still visible/selectable.
    }
  }

  const todayHours = (() => {
    const hours = businessHoursData?.hours ?? [];
    const todayDow = new Date().getDay();
    const entry = hours.find((h) => h.dayOfWeek === todayDow);
    if (!entry || entry.isClosed) return "Closed today";
    return `${entry.openTime} – ${entry.closeTime}`;
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

  // A brand-new business with nothing happening yet: show one clear
  // onboarding card instead of a wall of empty metric cards.
  const isBrandNewBusiness = Boolean(
    summary &&
      summary.todayAppointmentCount === 0 &&
      summary.upcomingAppointmentCount === 0 &&
      summary.customerCount === 0 &&
      setupIncomplete,
  );

  return (
    <DashboardLayout>
      <PageHeader
        title={`${getGreeting()}${user ? `, ${user.name.split(" ")[0]}` : ""}`}
        description={summary ? `Here's what's happening with ${summary.businessName} today.` : "Loading your business…"}
        actions={
          summary && (
            <Button onClick={() => setOpenModal("booking")}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Book appointment
            </Button>
          )
        }
      />

      {isPending && <DashboardSkeleton />}

      {!isPending && summary && isBrandNewBusiness && (
        <Card className="animate-fade-in-up mt-6 p-8">
          <h2 className="text-lg font-semibold text-stone-900">Your business is ready to get started</h2>
          <p className="mt-1 text-sm text-stone-500">Complete these steps to start taking bookings.</p>
          <ul className="mt-4 space-y-2.5">
            {setupItems.map((item) => (
              <li key={item.label} className="flex items-center gap-2.5 text-sm">
                {item.done ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" aria-hidden="true" />
                ) : (
                  <Circle className="h-4 w-4 shrink-0 text-stone-300" aria-hidden="true" />
                )}
                <span className={item.done ? "text-stone-500 line-through" : "text-stone-700"}>{item.label}</span>
              </li>
            ))}
          </ul>
          <Button className="mt-5" onClick={() => setOpenModal("service")}>
            Complete setup
          </Button>
        </Card>
      )}

      {!isPending && summary && !isBrandNewBusiness && (
        <div className="mt-6 space-y-6">
          {(setupIncomplete || alerts.length > 0) && (
            <Card className="border-amber-200 bg-amber-50 p-5">
              <h2 className="text-sm font-semibold text-stone-900">Needs attention</h2>
              <div className="mt-3 space-y-3">
                {setupIncomplete && (
                  <ul className="space-y-1.5 text-sm text-stone-700">
                    {setupItems.map((item) => (
                      <li key={item.label} className="flex items-center gap-2">
                        {item.done ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" aria-hidden="true" />
                        ) : (
                          <Circle className="h-4 w-4 shrink-0 text-stone-400" aria-hidden="true" />
                        )}
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
            </Card>
          )}

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Today's appointments" value={summary.todayAppointmentCount} icon={Clock} />
            <StatCard label="Upcoming" value={summary.upcomingAppointmentCount} icon={CalendarClock} />
            <StatCard label="Customers" value={summary.customerCount} icon={Users} />
            <StatCard label="Active services" value={summary.activeServiceCount} icon={Scissors} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="p-5 lg:order-1 lg:col-span-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-stone-900">Today&apos;s appointments</h2>
                <Link to="/calendar" className="text-sm font-medium text-brand-700 hover:text-brand-800">
                  View all bookings
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
                        <BookingStatusBadge status={booking.status} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="p-5 lg:order-2">
              <h2 className="text-sm font-semibold text-stone-900">Quick actions</h2>
              <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-1">
                {(
                  [
                    { key: "booking", label: "New booking", icon: CalendarClock },
                    { key: "customer", label: "Add customer", icon: Users },
                    { key: "service", label: "Add service", icon: Scissors },
                    { key: "staff", label: "Add staff", icon: Users },
                  ] as { key: "booking" | "customer" | "service" | "staff"; label: string; icon: LucideIcon }[]
                ).map((action) => (
                  <button
                    key={action.key}
                    type="button"
                    onClick={() => setOpenModal(action.key)}
                    className="flex items-center gap-2 rounded-lg border border-stone-300 px-3 py-2 text-left text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100"
                  >
                    <action.icon className="h-4 w-4 shrink-0 text-stone-400" aria-hidden="true" />
                    {action.label}
                  </button>
                ))}
              </div>
            </Card>

            <Card className="p-5 lg:order-3 lg:col-span-2">
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
            </Card>

            <Card className="p-5 lg:order-4">
              <h2 className="text-sm font-semibold text-stone-900">Business hours today</h2>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-stone-900">{todayHours}</p>
              <div className="mt-4 border-t border-stone-100 pt-4">
                <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Your booking page</p>
                <p className="mt-1 truncate text-xs text-stone-500">{bookingUrl}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className={buttonClassName("secondary", "sm")}
                  >
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    {copyFeedback ? "Copied!" : "Copy link"}
                  </button>
                  <a href={bookingUrl} target="_blank" rel="noreferrer" className={buttonClassName("primary", "sm")}>
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    Open page
                  </a>
                </div>
              </div>
            </Card>
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
