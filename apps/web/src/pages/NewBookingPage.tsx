import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { formatInTimeZone } from "date-fns-tz";
import { CalendarDays, Check, Moon, Search, Sun, Sunrise, UserPlus, X } from "lucide-react";
import { useCreateCustomer, useCustomers } from "../lib/customers";
import { useServices } from "../lib/services";
import { useStaffList } from "../lib/staff";
import { useAvailableSlots, useCreateBooking } from "../lib/bookings";
import { useMyBusiness } from "../lib/business";
import { ApiError } from "../lib/apiClient";
import { formatDuration, formatPrice } from "../lib/format";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";
import { BackLink } from "../components/ui/BackLink";
import { DashboardLayout } from "../components/DashboardLayout";

interface BookingFormSubmitValues {
  customerId: string;
  serviceId: string;
  staffId: string;
  startTime: string;
  notes?: string;
}

interface NewBookingFormProps {
  isSubmitting: boolean;
  serverError: string | null;
  /** From ?date=, e.g. when an empty calendar slot was tapped. */
  initialDate?: string;
  /** From ?customer=, when started from a customer's page. */
  initialCustomerId?: string;
  onSubmit: (values: BookingFormSubmitValues) => void;
}

const DAY_STRIP_LENGTH = 14;

const PERIODS = [
  { label: "Morning", icon: Sunrise, test: (hour: number) => hour < 12 },
  { label: "Afternoon", icon: Sun, test: (hour: number) => hour >= 12 && hour < 17 },
  { label: "Evening", icon: Moon, test: (hour: number) => hour >= 17 },
] as const;

/** yyyy-MM-dd plus n days, done on the calendar date so time zones can't shift it. */
function addDays(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

function dayParts(key: string) {
  const date = new Date(`${key}T12:00:00Z`);
  return {
    weekday: date.toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" }),
    day: date.getUTCDate(),
    month: date.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" }),
  };
}

function Step({ index, title, done, children, aside }: { index: number; title: string; done: boolean; children: ReactNode; aside?: ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2.5 text-sm font-semibold text-stone-900">
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-colors ${
              done ? "bg-brand-600 text-white" : "bg-stone-100 text-stone-500"
            }`}
          >
            {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" /> : index}
          </span>
          {title}
        </h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** Add a customer without leaving the booking: just a name and a number. */
function QuickAddCustomer({
  initialName,
  initialPhone,
  onCreated,
  onCancel,
}: {
  initialName: string;
  initialPhone: string;
  onCreated: (id: string) => void;
  onCancel: () => void;
}) {
  const create = useCreateCustomer();
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!name.trim()) return setError("Add their name");
    if (phone.replace(/[^\d]/g, "").length < 7) return setError("Add a phone number");
    setError(null);
    try {
      const result = await create.mutateAsync({ name: name.trim(), phone: phone.trim(), email: email.trim() || undefined });
      onCreated(result.customer.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't add them. Please try again.");
    }
  }

  const input =
    "w-full rounded-xl border border-stone-300 bg-surface px-3.5 py-2.5 text-base text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 sm:text-sm";
  return (
    <div className="space-y-2.5 rounded-2xl border border-stone-200 bg-stone-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">New customer</p>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" aria-label="Full name" autoComplete="off" className={input} autoFocus />
      <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" aria-label="Phone number" type="tel" inputMode="tel" className={input} />
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (optional)" aria-label="Email" type="email" inputMode="email" className={input} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" size="sm" onClick={() => void save()} isLoading={create.isPending}>
          Add and select
        </Button>
      </div>
    </div>
  );
}

const chip = (active: boolean) =>
  `rounded-2xl border text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
    active ? "border-brand-600 bg-brand-50 ring-1 ring-brand-600 dark:bg-brand-500/10" : "border-stone-200 hover:border-stone-300"
  }`;

function NewBookingForm({ isSubmitting, serverError, initialDate, initialCustomerId, onSubmit }: NewBookingFormProps) {
  const { data: businessData } = useMyBusiness();
  const timezone = businessData?.business?.timezone ?? "UTC";

  // limit=200 is the endpoint's ceiling; search filters this list in the browser.
  const { data: customersData } = useCustomers({ limit: 200 });
  const { data: servicesData } = useServices();
  const { data: staffData } = useStaffList();

  const customers = customersData?.customers ?? [];
  const activeServices = (servicesData?.services ?? []).filter((service) => service.isActive);
  const allStaff = staffData?.staff ?? [];

  const today = formatInTimeZone(new Date(), timezone, "yyyy-MM-dd");
  const [customerId, setCustomerId] = useState(initialCustomerId ?? "");
  const [query, setQuery] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [date, setDate] = useState(initialDate ?? today);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [isNewCustomerOpen, setIsNewCustomerOpen] = useState(false);

  const customer = customers.find((entry) => entry.id === customerId);
  const service = activeServices.find((entry) => entry.id === serviceId);
  const eligibleStaff = allStaff.filter((member) => member.isActive && Boolean(serviceId) && member.serviceIds.includes(serviceId));
  const staffMember = eligibleStaff.find((member) => member.id === staffId);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const digits = needle.replace(/[^\d]/g, "");
    const list = needle
      ? customers.filter(
          (entry) => entry.name.toLowerCase().includes(needle) || (digits.length >= 3 && entry.phone?.replace(/[^\d]/g, "").includes(digits)),
        )
      : customers;
    return list.slice(0, 6);
  }, [customers, query]);

  const days = useMemo(() => Array.from({ length: DAY_STRIP_LENGTH }, (_, index) => addDays(today, index)), [today]);
  const dateOutsideStrip = date && !days.includes(date);

  const { data: slotsData, isFetching: isLoadingSlots } = useAvailableSlots(serviceId || undefined, staffId || undefined, date || undefined);
  const slots = slotsData?.slots ?? [];
  const groupedSlots = PERIODS.map((period) => ({
    ...period,
    slots: slots.filter((slot) => period.test(Number(formatInTimeZone(new Date(slot), timezone, "H")))),
  })).filter((period) => period.slots.length > 0);

  // Choosing a service resets who and when; with one possible person, pick them.
  const isFirstServiceEffect = useRef(true);
  useEffect(() => {
    if (isFirstServiceEffect.current) {
      isFirstServiceEffect.current = false;
      return;
    }
    setStaffId("");
    setSelectedSlot(null);
  }, [serviceId]);

  useEffect(() => {
    if (serviceId && !staffId && eligibleStaff.length === 1) setStaffId(eligibleStaff[0].id);
  }, [serviceId, staffId, eligibleStaff]);

  useEffect(() => {
    setSelectedSlot(null);
  }, [staffId, date]);

  function handleSubmit(event?: FormEvent) {
    event?.preventDefault();
    setFieldError(null);
    if (!customerId) return setFieldError("Pick a customer");
    if (!serviceId) return setFieldError("Pick a service");
    if (!staffId) return setFieldError("Pick who's doing it");
    if (!selectedSlot) return setFieldError("Pick a time");
    onSubmit({ customerId, serviceId, staffId, startTime: selectedSlot, notes: notes.trim() || undefined });
  }

  const summary = [
    service?.name,
    staffMember?.name.split(" ")[0],
    selectedSlot ? formatInTimeZone(new Date(selectedSlot), timezone, "EEE d MMM, h:mm a") : undefined,
  ].filter(Boolean);
  const error = fieldError ?? serverError;

  return (
    <>
      <BackLink to="/bookings" label="All bookings" />
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">New booking</h1>
      <p className="mt-1 text-sm text-stone-500">Book someone in by hand, for a call, a walk-in or a WhatsApp message.</p>

        <form onSubmit={handleSubmit} noValidate className="mt-5 max-w-2xl space-y-8 rounded-3xl border border-stone-200 bg-surface p-5 sm:p-7">
          <Step
            index={1}
            title="Customer"
            done={Boolean(customer)}
            aside={
              <button
                type="button"
                onClick={() => setIsNewCustomerOpen(true)}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:text-brand-800"
              >
                <UserPlus className="h-3.5 w-3.5" aria-hidden="true" /> New customer
              </button>
            }
          >
            {isNewCustomerOpen && !customer ? (
              <QuickAddCustomer
                initialName={/\d/.test(query) ? "" : query}
                initialPhone={/\d/.test(query) ? query : ""}
                onCreated={(id) => {
                  setCustomerId(id);
                  setQuery("");
                  setIsNewCustomerOpen(false);
                }}
                onCancel={() => setIsNewCustomerOpen(false)}
              />
            ) : customer ? (
              <div className="flex items-center gap-3 rounded-2xl border border-brand-600 bg-brand-50 p-3 ring-1 ring-brand-600 dark:bg-brand-500/10">
                <Avatar name={customer.name} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-stone-900">{customer.name}</span>
                  {customer.phone && <span className="block truncate text-xs text-stone-500">{customer.phone}</span>}
                </span>
                <button
                  type="button"
                  onClick={() => setCustomerId("")}
                  disabled={isSubmitting}
                  aria-label="Change customer"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-stone-500 hover:bg-white/70 hover:text-stone-900"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <div className="rounded-2xl border border-stone-200">
                <label className="flex items-center gap-2 border-b border-stone-100 px-3">
                  <Search className="h-4 w-4 shrink-0 text-stone-400" aria-hidden="true" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search by name or phone"
                    aria-label="Search customers"
                    className="h-11 w-full bg-transparent text-base text-stone-900 placeholder:text-stone-400 focus:outline-none sm:text-sm"
                  />
                </label>
                {matches.length === 0 ? (
                  <p className="px-4 py-4 text-sm text-stone-500">
                    No one called &ldquo;{query}&rdquo;.{" "}
                    <button type="button" onClick={() => setIsNewCustomerOpen(true)} className="font-semibold text-brand-700">
                      Add them
                    </button>
                  </p>
                ) : (
                  <ul className="max-h-60 overflow-y-auto p-1">
                    {matches.map((entry) => (
                      <li key={entry.id}>
                        <button
                          type="button"
                          onClick={() => setCustomerId(entry.id)}
                          className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left hover:bg-stone-50"
                        >
                          <Avatar name={entry.name} size="sm" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-stone-900">{entry.name}</span>
                            {entry.phone && <span className="block truncate text-xs text-stone-500">{entry.phone}</span>}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </Step>

          <Step index={2} title="Service" done={Boolean(service)}>
            <div className="grid gap-2 sm:grid-cols-2">
              {activeServices.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setServiceId(entry.id)}
                  disabled={isSubmitting}
                  aria-pressed={entry.id === serviceId}
                  className={`${chip(entry.id === serviceId)} px-3.5 py-3`}
                >
                  <span className="block truncate text-sm font-semibold text-stone-900">{entry.name}</span>
                  <span className="mt-0.5 flex justify-between text-xs text-stone-500">
                    {formatDuration(entry.durationMinutes)}
                    <span className="font-medium text-stone-700">{formatPrice(entry.price)}</span>
                  </span>
                </button>
              ))}
            </div>
          </Step>

          <Step index={3} title="With" done={Boolean(staffMember)}>
            {!serviceId ? (
              <p className="text-sm text-stone-400">Pick a service to see who does it.</p>
            ) : eligibleStaff.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-stone-300 px-4 py-3 text-sm text-stone-500">Nobody is set up to do this service yet. Add it to someone on the Staff page.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {eligibleStaff.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => setStaffId(member.id)}
                    disabled={isSubmitting}
                    aria-pressed={member.id === staffId}
                    className={`${chip(member.id === staffId)} inline-flex items-center gap-2 py-1.5 pl-1.5 pr-3.5 !rounded-full`}
                  >
                    <Avatar name={member.name} src={member.avatarUrl} size="sm" />
                    <span className="text-sm font-medium text-stone-900">{member.name.split(" ")[0]}</span>
                  </button>
                ))}
              </div>
            )}
          </Step>

          <Step
            index={4}
            title="Day and time"
            done={Boolean(selectedSlot)}
            aside={
              <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-brand-700 hover:text-brand-800">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                {dateOutsideStrip ? `${dayParts(date).day} ${dayParts(date).month}` : "Other date"}
                <input type="date" min={today} value={date} onChange={(event) => event.target.value && setDate(event.target.value)} className="sr-only" />
              </label>
            }
          >
            <div className="no-scrollbar -mx-5 flex gap-1.5 overflow-x-auto px-5 pb-1 sm:-mx-7 sm:px-7">
              {days.map((key, index) => {
                const parts = dayParts(key);
                const active = key === date;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setDate(key)}
                    aria-pressed={active}
                    className={`flex w-14 shrink-0 flex-col items-center rounded-2xl border py-2 transition-colors ${
                      active ? "border-ink bg-ink text-white dark:border-highlight dark:bg-highlight dark:text-ink" : "border-stone-200 text-stone-700 hover:border-stone-300"
                    }`}
                  >
                    <span className={`text-[11px] font-medium ${active ? "opacity-70" : "text-stone-400"}`}>{index === 0 ? "Today" : parts.weekday}</span>
                    <span className="text-lg font-semibold leading-tight">{parts.day}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4">
              {!serviceId || !staffId ? (
                <p className="text-sm text-stone-400">Free times show once you&apos;ve picked a service and a person.</p>
              ) : isLoadingSlots ? (
                <div className="grid grid-cols-4 gap-2">
                  {Array.from({ length: 8 }, (_, index) => (
                    <div key={index} className="skeleton-shimmer h-10 rounded-xl bg-stone-100" />
                  ))}
                </div>
              ) : slots.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-stone-300 px-4 py-4 text-sm text-stone-500">
                  {staffMember?.name.split(" ")[0]} has no free time that day. Try another day.
                </p>
              ) : (
                <div className="space-y-4">
                  {groupedSlots.map((period) => (
                    <div key={period.label}>
                      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-stone-500">
                        <period.icon className="h-3.5 w-3.5" aria-hidden="true" /> {period.label}
                      </p>
                      <div className="grid grid-cols-4 gap-2">
                        {period.slots.map((slot) => (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => setSelectedSlot(slot)}
                            disabled={isSubmitting}
                            aria-pressed={selectedSlot === slot}
                            className={`h-10 rounded-xl border text-sm font-medium tabular-nums transition-colors ${
                              selectedSlot === slot ? "border-brand-600 bg-brand-600 text-white" : "border-stone-200 text-stone-700 hover:border-brand-400"
                            }`}
                          >
                            {formatInTimeZone(new Date(slot), timezone, "h:mm")}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Step>

          <section>
            <label htmlFor="new-booking-notes" className="text-sm font-semibold text-stone-900">
              Notes <span className="font-normal text-stone-400">· optional</span>
            </label>
            <textarea
              id="new-booking-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              disabled={isSubmitting}
              rows={2}
              placeholder="Anything to remember for this visit"
              className="mt-2 w-full resize-none rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            />
          </section>
        </form>

      {/* Stays in view while scrolling, just above the phone tab bar. */}
      <div className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 mt-4 max-w-2xl rounded-2xl border border-stone-200 bg-surface/95 p-3 shadow-[0_12px_32px_-16px_rgb(0_0_0/0.35)] backdrop-blur lg:bottom-4">
          <div className="space-y-2">
          {error && (
            <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-stone-900">{summary.length ? summary.join(" · ") : "Nothing picked yet"}</p>
              <p className="truncate text-xs text-stone-500">
                {customer ? `For ${customer.name}` : "Choose a customer"}
                {service ? ` · ${formatPrice(service.price)}` : ""}
              </p>
            </div>
            <Button onClick={() => handleSubmit()} isLoading={isSubmitting} className="shrink-0">
              {isSubmitting ? "Booking…" : "Book it"}
            </Button>
          </div>
        </div>
      </div>

    </>
  );
}

/** /bookings/new — book a customer in by hand. ?date= and ?customer= pre-fill it. */
export function NewBookingPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const createBooking = useCreateBooking();
  const [serverError, setServerError] = useState<string | null>(null);
  const date = params.get("date");

  async function handleSubmit(values: BookingFormSubmitValues) {
    setServerError(null);
    try {
      const { booking } = await createBooking.mutateAsync(values);
      // Land on the new booking; its back button returns to where you started.
      navigate(`/bookings/${booking.id}`, { replace: true, state: { from: from ?? "/bookings" } });
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <DashboardLayout>
      <NewBookingForm
        isSubmitting={createBooking.isPending}
        serverError={serverError}
        initialDate={date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined}
        initialCustomerId={params.get("customer") ?? undefined}
        onSubmit={handleSubmit}
      />
    </DashboardLayout>
  );
}
