import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import { formatInTimeZone } from "date-fns-tz";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  CalendarDays,
  CalendarPlus,
  Check,
  Clock,
  Globe,
  Hand,
  Heart,
  MapPin,
  MessageCircle,
  Moon,
  Phone,
  Scissors,
  Sparkles,
  Sun,
  Sunrise,
  UserRound,
  Wand2,
} from "lucide-react";
import type { PublicServiceProfile } from "@servicebook/types";
import { usePublicAvailableSlots, usePublicBusiness, usePublicStaff, useCreatePublicBooking } from "../lib/publicBooking";
import { ApiError } from "../lib/apiClient";
import { formatDuration, formatPrice, setDisplayCurrency } from "../lib/format";
import { FormField } from "../components/FormField";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";

type Step = "service" | "staff" | "datetime" | "details" | "review" | "confirmation";

const STEPS: { key: Exclude<Step, "confirmation">; label: string }[] = [
  { key: "service", label: "Service" },
  { key: "staff", label: "Professional" },
  { key: "datetime", label: "Date & time" },
  { key: "details", label: "Your details" },
  { key: "review", label: "Confirm" },
];

const PERIODS = [
  { label: "Morning", icon: Sunrise, test: (h: number) => h < 12 },
  { label: "Afternoon", icon: Sun, test: (h: number) => h >= 12 && h < 17 },
  { label: "Evening", icon: Moon, test: (h: number) => h >= 17 },
] as const;

function groupSlotsByPeriod(slots: string[], timezone: string) {
  return PERIODS.map((period) => ({
    ...period,
    slots: slots.filter((slot) => period.test(Number(formatInTimeZone(new Date(slot), timezone, "H")))),
  })).filter((group) => group.slots.length > 0);
}

// A friendly icon per service, guessed from its name.
const SERVICE_ICONS: Array<{ match: RegExp; icon: typeof Scissors; tone: string }> = [
  { match: /cut|trim|beard|barb|fade|line/i, icon: Scissors, tone: "from-indigo-500 to-blue-500" },
  { match: /nail|mani|pedi|gel/i, icon: Hand, tone: "from-pink-500 to-rose-500" },
  { match: /makeup|glam|brow|lash|face/i, icon: Wand2, tone: "from-violet-500 to-fuchsia-500" },
  { match: /massage|spa|therapy|body/i, icon: Heart, tone: "from-emerald-500 to-teal-500" },
  { match: /braid|hair|wash|color|colour|style|wig|locs/i, icon: Sparkles, tone: "from-amber-500 to-orange-500" },
];
function serviceIcon(service: PublicServiceProfile) {
  return SERVICE_ICONS.find((entry) => entry.match.test(service.name)) ?? { icon: Sparkles, tone: "from-brand-500 to-violet-500" };
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Next `count` calendar days starting at `today` (YYYY-MM-DD keys). */
function upcomingDays(today: string, count: number): string[] {
  const [y, m, d] = today.split("-").map(Number);
  return Array.from({ length: count }, (_, i) => new Date(Date.UTC(y, m - 1, d + i)).toISOString().slice(0, 10));
}
const dayLabel = (key: string, fmt: string) => formatInTimeZone(new Date(`${key}T12:00:00Z`), "UTC", fmt);

function googleCalendarUrl(title: string, start: string, end: string, details: string, location?: string): string {
  const stamp = (iso: string) => iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const params = new URLSearchParams({ action: "TEMPLATE", text: title, dates: `${stamp(start)}/${stamp(end)}`, details });
  if (location) params.set("location", location);
  return `https://calendar.google.com/calendar/render?${params}`;
}

const slide = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -24 },
  transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const },
};

function Shimmer({ className = "" }: { className?: string }) {
  return <div className={`skeleton-shimmer rounded-xl bg-stone-200/70 ${className}`} />;
}

function StepHeader({ title, subtitle, onBack }: { title: string; subtitle?: string; onBack?: () => void }) {
  return (
    <div className="mb-5">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="-ml-2 mb-3 inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-sm font-medium text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-800"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
        </button>
      )}
      <h2 className="text-xl font-bold text-stone-900 sm:text-2xl">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-stone-500">{subtitle}</p>}
    </div>
  );
}

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        x: (Math.random() - 0.5) * 360,
        y: -120 - Math.random() * 160,
        r: Math.random() * 540,
        color: ["#6366f1", "#8b5cf6", "#10b981", "#f59e0b", "#ec4899"][i % 5],
        delay: Math.random() * 0.15,
      })),
    [],
  );
  return (
    <div className="pointer-events-none absolute inset-x-0 top-10 flex justify-center" aria-hidden="true">
      {pieces.map((p, i) => (
        <motion.span
          key={i}
          className="absolute h-2 w-1.5 rounded-sm"
          style={{ backgroundColor: p.color }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
          animate={{ x: p.x, y: [0, p.y, p.y + 260], opacity: [1, 1, 0], rotate: p.r }}
          transition={{ duration: 1.6, delay: p.delay, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

function SummaryRow({ icon: Icon, label, value, sub }: { icon: typeof Clock; label: string; value?: ReactNode; sub?: ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${value ? "bg-brand-50 text-brand-700" : "bg-stone-100 text-stone-400"}`}>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-stone-400">{label}</p>
        {value ? (
          <>
            <p className="truncate text-sm font-semibold text-stone-900">{value}</p>
            {sub && <p className="text-xs text-stone-500">{sub}</p>}
          </>
        ) : (
          <p className="text-sm text-stone-400">Not selected</p>
        )}
      </div>
    </div>
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
  const {
    data: slotsData,
    isFetching: isSlotsLoading,
    refetch: refetchSlots,
  } = usePublicAvailableSlots(slug, serviceId ?? undefined, staffId ?? undefined, date || undefined);
  const createBooking = useCreatePublicBooking(slug);

  const business = businessData?.business;
  const bookingEnabled = businessData?.bookingEnabled ?? true;
  const services = businessData?.services ?? [];
  const staff = staffData?.staff ?? [];
  const slots = slotsData?.slots ?? [];
  const timezone = business?.timezone ?? "UTC";
  const today = business ? formatInTimeZone(new Date(), timezone, "yyyy-MM-dd") : "";
  const days = useMemo(() => (today ? upcomingDays(today, 21) : []), [today]);

  setDisplayCurrency(business?.currency);

  useEffect(() => {
    if (business) document.title = `Book with ${business.name}`;
  }, [business]);

  const selectedService = services.find((service) => service.id === serviceId) ?? null;
  const selectedStaff = staff.find((member) => member.id === staffId) ?? null;
  const stepIndex = step === "confirmation" ? STEPS.length : STEPS.findIndex((s) => s.key === step);

  function selectService(id: string) {
    setServiceId(id);
    setStaffId(null);
    setDate("");
    setSelectedSlot(null);
    setStep("staff");
  }

  function selectStaff(id: string) {
    setStaffId(id);
    setDate(today);
    setSelectedSlot(null);
    setStep("datetime");
  }

  function selectSlot(slot: string) {
    setSelectedSlot(slot);
    setSubmitError(null);
    setStep("details");
  }

  function goBack() {
    const order: Step[] = ["service", "staff", "datetime", "details", "review"];
    const index = order.indexOf(step);
    if (index > 0) setStep(order[index - 1]);
  }

  function validateDetails(): boolean {
    const errors: typeof fieldErrors = {};
    if (!name.trim()) errors.name = "Name is required";
    if (!phone.trim()) errors.phone = "Phone number is required";
    if (email.trim() && !EMAIL_PATTERN.test(email)) errors.email = "Enter a valid email address";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleContinueToReview(event: FormEvent) {
    event.preventDefault();
    setSubmitError(null);
    if (validateDetails()) setStep("review");
  }

  async function handleConfirm() {
    setSubmitError(null);
    if (!serviceId || !staffId || !selectedSlot) return;

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
      if (error instanceof ApiError && error.status === 409) {
        setSubmitError("That time was just taken. Please pick another one.");
        setSelectedSlot(null);
        setStep("datetime");
        void refetchSlots();
      } else {
        setSubmitError(error instanceof ApiError ? error.message : "We couldn't complete your booking. Please try again.");
      }
    }
  }

  function startOver() {
    setStep("service");
    setServiceId(null);
    setStaffId(null);
    setDate("");
    setSelectedSlot(null);
    setNotes("");
    setSubmitError(null);
    setFieldErrors({});
    createBooking.reset();
  }

  if (isBusinessPending) {
    return (
      <div className="min-h-screen bg-stone-50">
        <div className="h-44 bg-gradient-to-br from-brand-600 to-violet-600 sm:h-52" />
        <div className="mx-auto -mt-16 max-w-5xl px-4">
          <Shimmer className="h-28 rounded-3xl" />
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <Shimmer key={i} className="h-28" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isBusinessError || !business) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
        <div className="max-w-sm rounded-3xl border border-stone-200 bg-surface p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-100 text-stone-400">
            <CalendarDays className="h-6 w-6" aria-hidden="true" />
          </div>
          <h1 className="mt-4 text-lg font-bold text-stone-900">Booking page not found</h1>
          <p className="mt-2 text-sm text-stone-500">This link may be out of date. Please check with the business for their booking link.</p>
        </div>
      </div>
    );
  }

  const whatsappNumber = business.phone?.replace(/[^\d]/g, "");
  const confirmation = createBooking.data?.confirmation;

  return (
    <div className="min-h-screen bg-stone-50 pb-16">
      {/* Branded header */}
      <header className="relative overflow-hidden bg-gradient-to-br from-brand-600 via-indigo-600 to-violet-600 pb-24 pt-8 text-white sm:pb-28">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" aria-hidden="true" />
        <div className="absolute -bottom-32 left-10 h-72 w-72 rounded-full bg-fuchsia-400/20 blur-3xl" aria-hidden="true" />
        <div className="relative mx-auto flex max-w-5xl items-center justify-between px-4">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">Online booking</span>
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">Instant confirmation</span>
        </div>
      </header>

      <div className="relative mx-auto -mt-20 max-w-5xl px-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-stone-200 bg-surface p-5 shadow-[0_20px_50px_-20px_rgb(15_23_42/0.25)] sm:p-7"
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            {business.logoUrl ? (
              <img src={business.logoUrl} alt="" className="h-16 w-16 rounded-2xl object-cover sm:h-20 sm:w-20" />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-violet-500 text-2xl font-bold text-white shadow-lg sm:h-20 sm:w-20 sm:text-3xl">
                {business.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-extrabold text-stone-900 sm:text-3xl">{business.name}</h1>
              {business.description && <p className="mt-1 text-sm text-stone-500 sm:text-base">{business.description}</p>}
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {business.address && (
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(business.address)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1.5 font-medium text-stone-600 transition-colors hover:bg-stone-200"
                  >
                    <MapPin className="h-3.5 w-3.5" aria-hidden="true" /> {business.address}
                  </a>
                )}
                {business.phone && (
                  <a
                    href={`tel:${business.phone.replace(/\s/g, "")}`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1.5 font-medium text-stone-600 transition-colors hover:bg-stone-200"
                  >
                    <Phone className="h-3.5 w-3.5" aria-hidden="true" /> {business.phone}
                  </a>
                )}
                {business.website && (
                  <a
                    href={business.website}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1.5 font-medium text-stone-600 transition-colors hover:bg-stone-200"
                  >
                    <Globe className="h-3.5 w-3.5" aria-hidden="true" /> Website
                  </a>
                )}
              </div>
            </div>
            {whatsappNumber && (
              <a
                href={`https://wa.me/${whatsappNumber}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600"
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" /> Chat on WhatsApp
              </a>
            )}
          </div>
        </motion.div>

        {!bookingEnabled ? (
          <div className="mt-6 rounded-3xl border border-stone-200 bg-surface p-10 text-center">
            <h2 className="text-lg font-bold text-stone-900">Online booking is paused</h2>
            <p className="mt-2 text-sm text-stone-500">Please contact the business directly to book an appointment.</p>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="min-w-0">
              {step !== "confirmation" && (
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-brand-700">
                      Step {stepIndex + 1} of {STEPS.length} · {STEPS[stepIndex]?.label}
                    </span>
                    <span className="text-stone-400">{Math.round((stepIndex / STEPS.length) * 100)}%</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-200">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-brand-500 to-violet-500"
                      animate={{ width: `${((stepIndex + 0.5) / STEPS.length) * 100}%` }}
                      transition={{ type: "spring", stiffness: 120, damping: 20 }}
                    />
                  </div>
                </div>
              )}

              <div className="relative overflow-hidden rounded-3xl border border-stone-200 bg-surface p-5 sm:p-7">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div key={step} {...slide}>
                    {step === "service" && (
                      <>
                        <StepHeader title="What would you like to book?" subtitle="Choose a service to see who's available." />
                        {services.length === 0 ? (
                          <p className="text-sm text-stone-500">This business hasn&apos;t added any bookable services yet.</p>
                        ) : (
                          <div className="grid gap-3 sm:grid-cols-2">
                            {services.map((service, i) => {
                              const { icon: Icon, tone } = serviceIcon(service);
                              return (
                                <motion.button
                                  key={service.id}
                                  type="button"
                                  onClick={() => selectService(service.id)}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: i * 0.04 }}
                                  whileHover={{ y: -2 }}
                                  whileTap={{ scale: 0.98 }}
                                  className="group flex items-start gap-4 rounded-2xl border border-stone-200 p-4 text-left transition-colors hover:border-brand-400 hover:shadow-[0_10px_30px_-15px_rgb(79_70_229/0.5)]"
                                >
                                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${tone} text-white shadow-sm`}>
                                    <Icon className="h-5 w-5" aria-hidden="true" />
                                  </span>
                                  <span className="min-w-0 flex-1">
                                    <span className="block font-semibold text-stone-900">{service.name}</span>
                                    {service.description && <span className="mt-0.5 line-clamp-2 block text-sm text-stone-500">{service.description}</span>}
                                    <span className="mt-2 flex items-center justify-between">
                                      <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">
                                        <Clock className="h-3 w-3" aria-hidden="true" /> {formatDuration(service.durationMinutes)}
                                      </span>
                                      <span className="text-base font-bold text-stone-900">{formatPrice(service.price)}</span>
                                    </span>
                                  </span>
                                </motion.button>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}

                    {step === "staff" && selectedService && (
                      <>
                        <StepHeader title="Who would you like?" subtitle={`Professionals who offer ${selectedService.name}.`} onBack={goBack} />
                        {isStaffPending ? (
                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                            {[0, 1, 2].map((i) => (
                              <Shimmer key={i} className="h-32" />
                            ))}
                          </div>
                        ) : staff.length === 0 ? (
                          <p className="text-sm text-stone-500">Nobody offers this service right now. Please choose another service.</p>
                        ) : (
                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                            {staff.map((member, i) => (
                              <motion.button
                                key={member.id}
                                type="button"
                                onClick={() => selectStaff(member.id)}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.05 }}
                                whileHover={{ y: -2 }}
                                whileTap={{ scale: 0.97 }}
                                className="flex flex-col items-center gap-3 rounded-2xl border border-stone-200 p-5 text-center transition-colors hover:border-brand-400"
                              >
                                <Avatar name={member.name} size="lg" className="ring-4 ring-stone-100" />
                                <span className="text-sm font-semibold text-stone-900">{member.name}</span>
                              </motion.button>
                            ))}
                          </div>
                        )}
                      </>
                    )}

                    {step === "datetime" && selectedService && selectedStaff && (
                      <>
                        <StepHeader title="Pick a date & time" subtitle={`Times shown in ${timezone.replace(/_/g, " ")}.`} onBack={goBack} />
                        {submitError && (
                          <p role="alert" className="mb-4 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
                            {submitError}
                          </p>
                        )}
                        <div className="no-scrollbar -mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-2">
                          {days.map((key) => {
                            const active = key === date;
                            return (
                              <button
                                key={key}
                                type="button"
                                onClick={() => {
                                  setDate(key);
                                  setSelectedSlot(null);
                                }}
                                className={`flex w-16 shrink-0 snap-start flex-col items-center rounded-2xl border py-2.5 transition-all ${
                                  active
                                    ? "border-brand-600 bg-brand-600 text-white shadow-[0_10px_20px_-10px_rgb(79_70_229/0.8)]"
                                    : "border-stone-200 text-stone-700 hover:border-brand-300"
                                }`}
                              >
                                <span className={`text-[11px] font-medium uppercase ${active ? "text-white/80" : "text-stone-400"}`}>
                                  {key === today ? "Today" : dayLabel(key, "EEE")}
                                </span>
                                <span className="text-lg font-bold">{dayLabel(key, "d")}</span>
                                <span className={`text-[11px] ${active ? "text-white/80" : "text-stone-400"}`}>{dayLabel(key, "MMM")}</span>
                              </button>
                            );
                          })}
                          <label className="relative flex w-16 shrink-0 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 text-stone-500 hover:border-brand-300">
                            <CalendarDays className="h-5 w-5" aria-hidden="true" />
                            <span className="mt-1 text-[11px] font-medium">Later</span>
                            <input
                              type="date"
                              min={today}
                              value={date}
                              aria-label="Pick a later date"
                              onChange={(event) => {
                                setDate(event.target.value);
                                setSelectedSlot(null);
                              }}
                              className="absolute inset-0 cursor-pointer opacity-0"
                            />
                          </label>
                        </div>

                        {date && (
                          <div className="mt-4">
                            <p className="text-sm font-semibold text-stone-800">{dayLabel(date, "EEEE, MMMM d")}</p>
                            {isSlotsLoading ? (
                              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                                {Array.from({ length: 8 }).map((_, i) => (
                                  <Shimmer key={i} className="h-11" />
                                ))}
                              </div>
                            ) : slots.length === 0 ? (
                              <div className="mt-3 rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-6 text-center">
                                <p className="font-semibold text-stone-700">Fully booked or closed</p>
                                <p className="mt-1 text-sm text-stone-500">Try another day above.</p>
                              </div>
                            ) : (
                              <div className="mt-3 space-y-5">
                                {groupSlotsByPeriod(slots, timezone).map((group) => (
                                  <div key={group.label}>
                                    <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-stone-400">
                                      <group.icon className="h-3.5 w-3.5" aria-hidden="true" /> {group.label}
                                    </p>
                                    <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                                      {group.slots.map((slot, i) => (
                                        <motion.button
                                          key={slot}
                                          type="button"
                                          onClick={() => selectSlot(slot)}
                                          initial={{ opacity: 0, y: 6 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          transition={{ delay: Math.min(i, 12) * 0.02 }}
                                          whileTap={{ scale: 0.95 }}
                                          className="rounded-xl border border-stone-200 py-2.5 text-sm font-semibold text-stone-700 transition-colors hover:border-brand-500 hover:bg-brand-50 hover:text-brand-700"
                                        >
                                          {formatInTimeZone(new Date(slot), timezone, "h:mm a")}
                                        </motion.button>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}

                    {step === "details" && selectedService && selectedStaff && selectedSlot && (
                      <>
                        <StepHeader title="Your details" subtitle="So the business can confirm and remind you." onBack={goBack} />
                        <form onSubmit={handleContinueToReview} noValidate className="space-y-4">
                          <FormField label="Full name" type="text" autoComplete="name" value={name} onChange={setName} error={fieldErrors.name} />
                          <div className="grid gap-4 sm:grid-cols-2">
                            <FormField label="Phone" type="tel" autoComplete="tel" value={phone} onChange={setPhone} error={fieldErrors.phone} />
                            <FormField label="Email (for confirmation)" type="email" autoComplete="email" value={email} onChange={setEmail} error={fieldErrors.email} />
                          </div>
                          <label className="block">
                            <span className="text-sm font-medium text-stone-700">Anything we should know? (optional)</span>
                            <textarea
                              value={notes}
                              onChange={(event) => setNotes(event.target.value)}
                              rows={3}
                              placeholder="Allergies, preferences, reference photos…"
                              className="mt-1 w-full rounded-lg border border-stone-300 bg-transparent px-3 py-2.5 text-sm text-stone-900 transition-colors placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                            />
                          </label>
                          <Button type="submit" size="lg" className="w-full rounded-xl">
                            Review booking
                          </Button>
                        </form>
                      </>
                    )}

                    {step === "review" && selectedService && selectedStaff && selectedSlot && (
                      <>
                        <StepHeader title="Confirm your booking" subtitle="Check the details, then tap confirm." onBack={goBack} />
                        <div className="space-y-4 rounded-2xl bg-stone-50 p-5">
                          <SummaryRow
                            icon={Sparkles}
                            label="Service"
                            value={selectedService.name}
                            sub={`${formatDuration(selectedService.durationMinutes)} · ${formatPrice(selectedService.price)}`}
                          />
                          <SummaryRow icon={UserRound} label="With" value={selectedStaff.name} />
                          <SummaryRow
                            icon={CalendarDays}
                            label="When"
                            value={formatInTimeZone(new Date(selectedSlot), timezone, "EEEE, MMMM d")}
                            sub={formatInTimeZone(new Date(selectedSlot), timezone, "h:mm a")}
                          />
                          <SummaryRow icon={Phone} label="Contact" value={name} sub={[phone, email].filter(Boolean).join(" · ")} />
                        </div>
                        {submitError && (
                          <p role="alert" className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                            {submitError}
                          </p>
                        )}
                        <Button type="button" size="lg" className="mt-5 w-full rounded-xl" onClick={handleConfirm} isLoading={createBooking.isPending}>
                          {createBooking.isPending ? "Booking…" : `Confirm · ${formatPrice(selectedService.price)}`}
                        </Button>
                        <p className="mt-3 text-center text-xs text-stone-400">Pay at your appointment. No card needed.</p>
                      </>
                    )}

                    {step === "confirmation" && confirmation && (
                      <div className="relative py-4 text-center">
                        <Confetti />
                        <motion.div
                          initial={{ scale: 0, rotate: -45 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: "spring", stiffness: 260, damping: 15 }}
                          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_12px_30px_-10px_rgb(16_185_129/0.8)]"
                        >
                          <Check className="h-8 w-8" strokeWidth={3} aria-hidden="true" />
                        </motion.div>
                        <h2 className="mt-5 text-2xl font-extrabold text-stone-900">You&apos;re booked!</h2>
                        <p className="mt-1 text-sm text-stone-500">
                          {confirmation.customerEmail
                            ? `A confirmation is on its way to ${confirmation.customerEmail}.`
                            : `${business.name} can see your booking now.`}
                        </p>

                        <div className="mx-auto mt-6 max-w-sm space-y-4 rounded-2xl bg-stone-50 p-5 text-left">
                          <SummaryRow icon={Sparkles} label="Service" value={confirmation.serviceName} sub={`with ${confirmation.staffName}`} />
                          <SummaryRow
                            icon={CalendarDays}
                            label="When"
                            value={formatInTimeZone(new Date(confirmation.startTime), timezone, "EEEE, MMMM d")}
                            sub={`${formatInTimeZone(new Date(confirmation.startTime), timezone, "h:mm a")} – ${formatInTimeZone(new Date(confirmation.endTime), timezone, "h:mm a")}`}
                          />
                        </div>

                        <div className="mx-auto mt-6 flex max-w-sm flex-col gap-2 sm:flex-row">
                          <a
                            href={googleCalendarUrl(
                              `${confirmation.serviceName} at ${business.name}`,
                              confirmation.startTime,
                              confirmation.endTime,
                              `With ${confirmation.staffName}. Booked via ServiceBook.`,
                              business.address,
                            )}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
                          >
                            <CalendarPlus className="h-4 w-4" aria-hidden="true" /> Add to calendar
                          </a>
                          <a
                            href={`https://wa.me/?text=${encodeURIComponent(
                              `I just booked ${confirmation.serviceName} at ${business.name} on ${formatInTimeZone(new Date(confirmation.startTime), timezone, "EEE d MMM, h:mm a")}. Book yours: ${window.location.href}`,
                            )}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-semibold text-stone-700 transition hover:bg-stone-100"
                          >
                            <MessageCircle className="h-4 w-4" aria-hidden="true" /> Share
                          </a>
                        </div>
                        <button type="button" onClick={startOver} className="mt-5 text-sm font-medium text-brand-700 hover:underline">
                          Book another appointment
                        </button>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Live summary */}
            {step !== "confirmation" && (
              <aside className="hidden lg:block">
                <div className="sticky top-6 space-y-5 rounded-3xl border border-stone-200 bg-surface p-6">
                  <p className="text-sm font-bold text-stone-900">Your booking</p>
                  <SummaryRow
                    icon={Sparkles}
                    label="Service"
                    value={selectedService?.name}
                    sub={selectedService && `${formatDuration(selectedService.durationMinutes)} · ${formatPrice(selectedService.price)}`}
                  />
                  <SummaryRow icon={UserRound} label="Professional" value={selectedStaff?.name} />
                  <SummaryRow
                    icon={CalendarDays}
                    label="Date & time"
                    value={
                      selectedSlot
                        ? formatInTimeZone(new Date(selectedSlot), timezone, "EEE, MMM d")
                        : date && step === "datetime"
                          ? dayLabel(date, "EEE, MMM d")
                          : undefined
                    }
                    sub={selectedSlot ? formatInTimeZone(new Date(selectedSlot), timezone, "h:mm a") : undefined}
                  />
                  {selectedService && (
                    <div className="flex items-center justify-between border-t border-stone-200 pt-4">
                      <span className="text-sm text-stone-500">Total</span>
                      <span className="text-xl font-extrabold text-stone-900">{formatPrice(selectedService.price)}</span>
                    </div>
                  )}
                </div>
              </aside>
            )}
          </div>
        )}

        <p className="mt-10 text-center text-xs text-stone-400">
          Powered by <span className="font-semibold text-stone-500">ServiceBook</span>
        </p>
      </div>
    </div>
  );
}
