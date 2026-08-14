import { useState, type FormEvent, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import { formatInTimeZone } from "date-fns-tz";
import { usePublicAvailableSlots, usePublicBusiness, usePublicStaff, useCreatePublicBooking } from "../lib/publicBooking";
import { ApiError } from "../lib/apiClient";
import { formatDuration, formatPrice } from "../lib/format";
import { FormField } from "../components/FormField";

type Step = "service" | "staff" | "datetime" | "details" | "confirmation";

const STEPS: { key: Exclude<Step, "confirmation">; label: string }[] = [
  { key: "service", label: "Service" },
  { key: "staff", label: "Staff" },
  { key: "datetime", label: "Date & Time" },
  { key: "details", label: "Your Details" },
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-50 px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-lg">
        <div className="mb-6 text-center text-sm font-semibold uppercase tracking-wide text-stone-400">ServiceBook</div>
        {children}
      </div>
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="text-sm font-medium text-stone-500 transition-colors hover:text-stone-700">
      ← Back
    </button>
  );
}

export function PublicBookingPage() {
  const { businessSlug } = useParams<{ businessSlug: string }>();
  const slug = businessSlug ?? "";

  const { data: businessData, isPending: isBusinessPending, isError: isBusinessError } = usePublicBusiness(slug);

  const [step, setStep] = useState<Step>("service");
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [date, setDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; phone?: string; email?: string }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { data: staffData, isPending: isStaffPending } = usePublicStaff(slug, serviceId ?? undefined);
  const { data: slotsData, isFetching: isSlotsLoading } = usePublicAvailableSlots(
    slug,
    serviceId ?? undefined,
    staffId ?? undefined,
    date || undefined,
  );
  const createBooking = useCreatePublicBooking(slug);

  const business = businessData?.business;
  const bookingEnabled = businessData?.bookingEnabled ?? true;
  const services = businessData?.services ?? [];
  const staff = staffData?.staff ?? [];
  const slots = slotsData?.slots ?? [];
  const timezone = business?.timezone ?? "UTC";
  const today = business ? formatInTimeZone(new Date(), timezone, "yyyy-MM-dd") : "";

  const selectedService = services.find((service) => service.id === serviceId) ?? null;
  const selectedStaff = staff.find((member) => member.id === staffId) ?? null;

  function selectService(id: string) {
    setServiceId(id);
    setStaffId(null);
    setDate("");
    setSelectedSlot(null);
    setStep("staff");
  }

  function selectStaff(id: string) {
    setStaffId(id);
    setDate("");
    setSelectedSlot(null);
    setStep("datetime");
  }

  function selectSlot(slot: string) {
    setSelectedSlot(slot);
    setStep("details");
  }

  function goBack() {
    if (step === "staff") {
      setStep("service");
    } else if (step === "datetime") {
      setStep("staff");
    } else if (step === "details") {
      setStep("datetime");
    }
  }

  function validateDetails(): boolean {
    const errors: typeof fieldErrors = {};
    if (!name.trim()) {
      errors.name = "Name is required";
    }
    if (!phone.trim()) {
      errors.phone = "Phone number is required";
    }
    if (email.trim() && !EMAIL_PATTERN.test(email)) {
      errors.email = "Enter a valid email address";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitError(null);
    if (!validateDetails() || !serviceId || !staffId || !selectedSlot) {
      return;
    }

    try {
      await createBooking.mutateAsync({
        serviceId,
        staffId,
        startTime: selectedSlot,
        customer: { name: name.trim(), phone: phone.trim(), email: email.trim() || undefined },
        notes: notes.trim() || undefined,
      });
      setStep("confirmation");
    } catch (error) {
      setSubmitError(error instanceof ApiError ? error.message : "We couldn't complete your booking. Please try again.");
    }
  }

  function startOver() {
    setStep("service");
    setServiceId(null);
    setStaffId(null);
    setDate("");
    setSelectedSlot(null);
    setName("");
    setPhone("");
    setEmail("");
    setNotes("");
    setSubmitError(null);
    setFieldErrors({});
    createBooking.reset();
  }

  if (isBusinessPending) {
    return (
      <PublicLayout>
        <p className="text-center text-sm text-stone-500">Loading…</p>
      </PublicLayout>
    );
  }

  if (isBusinessError || !business) {
    return (
      <PublicLayout>
        <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-stone-900">Business not found</h1>
          <p className="mt-2 text-sm text-stone-500">This booking page doesn&apos;t exist or is no longer available.</p>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-stone-900">{business.name}</h1>
        {business.description && <p className="mt-1 text-sm text-stone-500">{business.description}</p>}
        {(business.phone || business.email || business.address || business.website) && (
          <p className="mt-2 text-xs text-stone-400">
            {[business.phone, business.email, business.address, business.website].filter(Boolean).join(" · ")}
          </p>
        )}
        {bookingEnabled && <p className="mt-3 text-sm font-medium text-stone-700">Book an appointment</p>}
      </div>

      {!bookingEnabled && (
        <div className="animate-fade-in-up mt-6 rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-stone-900">Online booking is currently unavailable</h2>
          <p className="mt-2 text-sm text-stone-500">Please contact the business directly to schedule an appointment.</p>
        </div>
      )}

      {bookingEnabled && step !== "confirmation" && (
        <div className="mt-6 flex items-center justify-center gap-1 overflow-x-auto text-xs font-medium text-stone-400 sm:gap-2 sm:text-sm">
          {STEPS.map((entry, index) => {
            const isActive = entry.key === step;
            const isPast = STEPS.findIndex((s) => s.key === step) > index;
            return (
              <span key={entry.key} className="flex shrink-0 items-center gap-1 sm:gap-2">
                <span className={isActive ? "font-semibold text-brand-700" : isPast ? "text-stone-600" : ""}>{entry.label}</span>
                {index < STEPS.length - 1 && <span className="text-stone-300">→</span>}
              </span>
            );
          })}
        </div>
      )}

      {bookingEnabled && (
      <div className="animate-fade-in-up mt-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        {step === "service" && (
          <>
            <h2 className="text-lg font-semibold text-stone-900">Choose a service</h2>
            {services.length === 0 ? (
              <p className="mt-3 text-sm text-stone-500">This business doesn&apos;t have any bookable services yet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {services.map((service) => (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => selectService(service.id)}
                    className="flex w-full items-center justify-between gap-4 rounded-xl border border-stone-200 p-4 text-left transition-colors hover:border-brand-400 hover:bg-brand-50/40"
                  >
                    <div>
                      <p className="font-medium text-stone-900">{service.name}</p>
                      {service.description && <p className="mt-0.5 text-sm text-stone-500">{service.description}</p>}
                      <p className="mt-1 text-sm text-stone-500">{formatDuration(service.durationMinutes)}</p>
                    </div>
                    <span className="whitespace-nowrap text-lg font-semibold text-stone-900">{formatPrice(service.price)}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {step === "staff" && selectedService && (
          <>
            <BackButton onClick={goBack} />
            <h2 className="mt-2 text-lg font-semibold text-stone-900">Choose a staff member</h2>
            {isStaffPending ? (
              <p className="mt-3 text-sm text-stone-500">Loading…</p>
            ) : staff.length === 0 ? (
              <p className="mt-3 text-sm text-stone-500">
                No staff currently provide this service. Please choose a different service.
              </p>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {staff.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => selectStaff(member.id)}
                    className="rounded-xl border border-stone-200 p-4 text-center font-medium text-stone-900 transition-colors hover:border-brand-400 hover:bg-brand-50/40"
                  >
                    {member.name}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {step === "datetime" && selectedService && selectedStaff && (
          <>
            <BackButton onClick={goBack} />
            <h2 className="mt-2 text-lg font-semibold text-stone-900">Choose a date &amp; time</h2>

            <label className="mt-4 block">
              <span className="text-sm font-medium text-stone-700">Date</span>
              <input
                type="date"
                value={date}
                min={today}
                onChange={(event) => {
                  setDate(event.target.value);
                  setSelectedSlot(null);
                }}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm text-stone-900 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              />
            </label>

            {date && (
              <div className="mt-4">
                <span className="text-sm font-medium text-stone-700">Available times</span>
                {isSlotsLoading ? (
                  <p className="mt-2 text-sm text-stone-500">Loading available times…</p>
                ) : slots.length === 0 ? (
                  <div className="mt-2 rounded-lg border border-dashed border-stone-300 bg-stone-50 p-4 text-sm">
                    <p className="font-medium text-stone-700">No available times</p>
                    <p className="mt-0.5 text-stone-500">Please choose a different date.</p>
                  </div>
                ) : (
                  <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {slots.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => selectSlot(slot)}
                        className="rounded-lg border border-stone-300 px-2 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:border-brand-500 hover:bg-brand-50"
                      >
                        {formatInTimeZone(new Date(slot), timezone, "h:mm a")}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {step === "details" && selectedService && selectedStaff && selectedSlot && (
          <>
            <BackButton onClick={goBack} />
            <h2 className="mt-2 text-lg font-semibold text-stone-900">Your details</h2>

            <div className="mt-3 rounded-lg bg-stone-50 px-3 py-2 text-sm text-stone-700">
              <p className="font-medium">
                {selectedService.name} with {selectedStaff.name}
              </p>
              <p>{formatInTimeZone(new Date(selectedSlot), timezone, "EEEE, MMMM d 'at' h:mm a")}</p>
            </div>

            <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4">
              <FormField
                label="Full name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={setName}
                error={fieldErrors.name}
                disabled={createBooking.isPending}
              />
              <FormField
                label="Email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={setEmail}
                error={fieldErrors.email}
                disabled={createBooking.isPending}
              />
              <FormField
                label="Phone"
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={setPhone}
                error={fieldErrors.phone}
                disabled={createBooking.isPending}
              />

              <label className="block">
                <span className="text-sm font-medium text-stone-700">Notes (optional)</span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  disabled={createBooking.isPending}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm text-stone-900 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 disabled:cursor-not-allowed disabled:bg-stone-100"
                />
              </label>

              {submitError && (
                <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {submitError}
                </p>
              )}

              <button
                type="submit"
                disabled={createBooking.isPending}
                className="w-full rounded-lg bg-brand-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {createBooking.isPending ? "Creating booking…" : "Confirm booking"}
              </button>
            </form>
          </>
        )}

        {step === "confirmation" && createBooking.data && (
          <div className="animate-fade-in-up text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-xl text-green-600">
              ✓
            </div>
            <h2 className="mt-4 text-lg font-semibold text-stone-900">Booking confirmed</h2>
            <p className="mt-1 text-sm text-stone-600">
              {createBooking.data.confirmation.serviceName} with {createBooking.data.confirmation.staffName}
            </p>
            <p className="mt-1 text-sm text-stone-600">
              {formatInTimeZone(new Date(createBooking.data.confirmation.startTime), timezone, "EEEE, MMMM d")}
              <br />
              {formatInTimeZone(new Date(createBooking.data.confirmation.startTime), timezone, "h:mm a")} –{" "}
              {formatInTimeZone(new Date(createBooking.data.confirmation.endTime), timezone, "h:mm a")}
            </p>
            <div className="mt-3 rounded-lg bg-stone-50 px-3 py-2 text-sm text-stone-700">
              <p>{createBooking.data.confirmation.customerName}</p>
              {createBooking.data.confirmation.customerEmail && <p>{createBooking.data.confirmation.customerEmail}</p>}
            </div>
            <p className="mt-4 text-sm text-stone-500">Your appointment has been successfully booked.</p>
            <button
              type="button"
              onClick={startOver}
              className="mt-6 rounded-lg border border-stone-300 px-4 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100"
            >
              Book another appointment
            </button>
          </div>
        )}
      </div>
      )}
    </PublicLayout>
  );
}
