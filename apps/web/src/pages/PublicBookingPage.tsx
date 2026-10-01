import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { formatInTimeZone } from "date-fns-tz";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  CalendarDays,
  CalendarPlus,
  Check,
  Clock,
  Globe,
  MapPin,
  MessageCircle,
  Moon,
  Phone,
  Sparkles,
  Star,
  Sun,
  Sunrise,
  UserRound,
  X,
} from "lucide-react";
import type { ShowcaseStaff } from "@servicebook/types";
import { usePublicAvailableSlots, usePublicBusiness, usePublicStaff, useCreatePublicBooking } from "../lib/publicBooking";
import { ApiError } from "../lib/apiClient";
import { formatDuration, formatPrice, setDisplayCurrency } from "../lib/format";
import { FormField } from "../components/FormField";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";
import { ServiceThumb } from "../components/ServiceThumb";
import { LogoMark } from "../components/Logo";
import { imageSrc } from "../lib/images";
import { activeChannels } from "../lib/socials";
import { SocialIcon } from "../components/SocialIcon";
import { ChatSheet } from "../components/ChatSheet";
import { CustomerChat } from "../components/chat/CustomerChat";
import { DemoBar } from "../components/DemoBar";
import { isDemoSlug, isEmbedded, ownerDemoPath } from "../lib/demo";
import { usePublicShowcase } from "../lib/showcase";
import { useCustomerPortal } from "../lib/customerPortal";
import { PublicShowcase, type BookIntent, type ShowcaseSection } from "../components/showcase/PublicShowcase";
import { BusinessInfo } from "../components/showcase/BusinessInfo";
import { RatingBadge } from "../components/showcase/Stars";

type Step = "service" | "datetime" | "details" | "review" | "confirmation";

// Choosing a professional is optional: "any" lets the business assign
// someone (the owner first, if they take appointments).
const ANY_STAFF = "any";

const STEPS: { key: Exclude<Step, "confirmation">; label: string }[] = [
  { key: "service", label: "Service" },
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
  const [isChatOpen, setIsChatOpen] = useState(false);
  // Set by "Book with Tunde" on the team section: narrows the services to theirs.
  const [preferredStaff, setPreferredStaff] = useState<ShowcaseStaff | null>(null);
  const bookingCard = useRef<HTMLDivElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const embedded = isEmbedded();

  const { data: staffData, isPending: isStaffPending } = usePublicStaff(slug, serviceId ?? undefined);
  const {
    data: slotsData,
    isFetching: isSlotsLoading,
    refetch: refetchSlots,
  } = usePublicAvailableSlots(slug, serviceId ?? undefined, staffId ?? undefined, date || undefined);
  const createBooking = useCreatePublicBooking(slug);

  const business = businessData?.business;
  const bookingEnabled = businessData?.bookingEnabled ?? true;
  const { data: showcase } = usePublicShowcase(slug);
  type Tab = "book" | ShowcaseSection | "info";
  const requestedTab = searchParams.get("tab") as Tab | null;
  const tab: Tab = requestedTab && ["book", "team", "work", "reviews", "info"].includes(requestedTab) ? requestedTab : "book";
  function openTab(next: Tab) {
    const params = new URLSearchParams(searchParams);
    if (next === "book") params.delete("tab");
    else params.set("tab", next);
    setSearchParams(params, { replace: true });
    window.scrollTo({ top: Math.min(window.scrollY, 220), behavior: "smooth" });
  }
  // Arriving from the customer's own page (?c=token): we already know who they are.
  const customerToken = searchParams.get("c");
  const { data: portal } = useCustomerPortal(customerToken);
  const knownCustomer = portal && portal.business.slug === slug ? portal.customer : null;
  const [editingDetails, setEditingDetails] = useState(false);
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

  // The demo tour links here with ?chat=1 to open "Chat with us" straight away.
  useEffect(() => {
    if (business && searchParams.get("chat") === "1" && activeChannels(business.socials).length > 0) setIsChatOpen(true);
  }, [business, searchParams]);

  const selectedService = services.find((service) => service.id === serviceId) ?? null;
  const selectedStaff = staffId && staffId !== ANY_STAFF ? (staff.find((member) => member.id === staffId) ?? null) : null;
  // With a single professional there's nothing to choose; name them instead of "any".
  const onlyStaff = staff.length === 1 ? staff[0] : null;
  const staffLabel = selectedStaff?.name ?? onlyStaff?.name ?? (serviceId ? "Any available" : undefined);
  const stepIndex = step === "confirmation" ? STEPS.length : STEPS.findIndex((s) => s.key === step);

  function selectService(id: string, withStaffId?: string) {
    setServiceId(id);
    setStaffId(withStaffId ?? preferredStaff?.id ?? ANY_STAFF);
    setPreferredStaff(null);
    setDate(today);
    setSelectedSlot(null);
    setStep("datetime");
  }

  /** From the team, a portfolio post or a staff profile: jump into the booking flow with them preselected. */
  function bookFromShowcase(intent: BookIntent, member?: ShowcaseStaff) {
    const theirServices = member?.serviceIds.filter((id) => services.some((service) => service.id === id)) ?? [];
    const serviceForBooking = intent.serviceId ?? (theirServices.length === 1 ? theirServices[0] : undefined);
    if (serviceForBooking) {
      selectService(serviceForBooking, intent.staffId);
    } else {
      setServiceId(null);
      setSelectedSlot(null);
      setPreferredStaff(member ?? null);
      setStep("service");
    }
    openTab("book");
    // The booking card only exists on the Book tab, so wait for it to render.
    setTimeout(() => bookingCard.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  }

  // Fill in a returning customer's details once.
  useEffect(() => {
    if (!knownCustomer) return;
    setName((current) => current || knownCustomer.name);
    setPhone((current) => current || knownCustomer.phone);
    setEmail((current) => current || knownCustomer.email || "");
  }, [knownCustomer]);

  // "Book again" (?service=&staff=): jump straight to picking a time.
  const [preselected, setPreselected] = useState(false);
  useEffect(() => {
    if (preselected || services.length === 0) return;
    setPreselected(true);
    const wanted = searchParams.get("service");
    if (wanted && services.some((service) => service.id === wanted)) selectService(wanted, searchParams.get("staff") ?? undefined);
    // selectService is stable enough here; this runs once when services first load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [services, preselected, searchParams]);

  function selectStaff(id: string) {
    setStaffId(id);
    setSelectedSlot(null);
  }

  function selectSlot(slot: string) {
    setSelectedSlot(slot);
    setSubmitError(null);
    setStep("details");
  }

  function goBack() {
    const order: Step[] = ["service", "datetime", "details", "review"];
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
    if (!serviceId || !selectedSlot) return;

    try {
      await createBooking.mutateAsync({
        serviceId,
        staffId: staffId && staffId !== ANY_STAFF ? staffId : undefined,
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
        <div className="h-44 bg-ink-grid sm:h-52" />
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

  const chatChannels = activeChannels(business.socials);
  const confirmation = createBooking.data?.confirmation;

  return (
    <div className="min-h-screen bg-stone-50 pb-16">
      {isDemoSlug(business.slug) && <DemoBar />}
      {/* Branded header */}
      <header className="relative h-40 overflow-hidden bg-ink text-white sm:h-56">
        {business.coverImageUrl && (
          <>
            <motion.img
              src={imageSrc(business.coverImageUrl)}
              alt=""
              initial={{ scale: 1.08, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-black/25" aria-hidden="true" />
          </>
        )}
      </header>

      <div className="relative mx-auto -mt-20 max-w-5xl px-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-stone-200 bg-surface p-5 shadow-[0_20px_50px_-20px_rgb(12_26_20/0.3)] sm:p-7"
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            {business.logoUrl ? (
              <img src={imageSrc(business.logoUrl)} alt={`${business.name} logo`} className="h-16 w-16 rounded-2xl bg-surface object-cover shadow-lg ring-4 ring-surface sm:h-20 sm:w-20" />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-ink text-2xl font-bold text-highlight shadow-lg sm:h-20 sm:w-20 sm:text-3xl">
                {business.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-extrabold text-stone-900 sm:text-3xl">{business.name}</h1>
              {showcase && showcase.summary.count > 0 && (
                <a
                  href="?tab=reviews"
                  onClick={(event) => {
                    event.preventDefault();
                    openTab("reviews");
                  }}
                  className="mt-1 inline-flex items-center gap-1.5 text-sm text-stone-600 hover:text-stone-900"
                >
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden="true" />
                  <span className="font-semibold text-stone-900">{showcase.summary.rating.toFixed(1)}</span>
                  <span className="underline decoration-stone-300 underline-offset-2">{showcase.summary.count} reviews</span>
                </a>
              )}
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
            {chatChannels.length > 0 && (
              <button
                type="button"
                onClick={() => setIsChatOpen(true)}
                className="group inline-flex items-center justify-center gap-3 rounded-xl bg-ink py-2 pl-4 pr-2 text-sm font-semibold text-white transition hover:bg-ink-700 dark:bg-highlight dark:text-ink"
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" /> Chat with us
                <span className="flex -space-x-1.5">
                  {chatChannels.slice(0, 4).map((channel) => (
                    <span
                      key={channel.id}
                      className="flex h-6 w-6 items-center justify-center rounded-full ring-2 ring-ink dark:ring-highlight"
                      style={{ backgroundColor: channel.color, color: channel.onColor }}
                    >
                      <SocialIcon icon={channel.icon} className="h-3 w-3" />
                    </span>
                  ))}
                </span>
              </button>
            )}
          </div>
        </motion.div>

        <nav className="no-scrollbar sticky top-0 z-20 -mx-4 mt-4 flex gap-1.5 overflow-x-auto bg-stone-50/90 px-4 py-2.5 backdrop-blur" aria-label="Sections">
          {(
            [
              { key: "book", label: "Book", show: true },
              { key: "team", label: "Team", show: (showcase?.staff.length ?? 0) > 0, count: showcase?.staff.length },
              { key: "work", label: "Our work", show: (showcase?.posts.length ?? 0) > 0, count: showcase?.posts.length },
              { key: "reviews", label: "Reviews", show: (showcase?.reviews.length ?? 0) > 0, count: showcase?.summary.count },
              { key: "info", label: "Info", show: true },
            ] as Array<{ key: Tab; label: string; show: boolean; count?: number }>
          )
            .filter((entry) => entry.show)
            .map((entry) => (
              <button
                key={entry.key}
                type="button"
                onClick={() => openTab(entry.key)}
                aria-current={tab === entry.key ? "page" : undefined}
                className={`relative inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-colors ${
                  tab === entry.key ? "text-white dark:text-ink" : "text-stone-600 hover:bg-stone-200/60 hover:text-stone-900"
                }`}
              >
                {tab === entry.key && (
                  <motion.span layoutId="public-tab" className="absolute inset-0 rounded-full bg-ink dark:bg-highlight" transition={{ type: "spring", stiffness: 480, damping: 38 }} />
                )}
                <span className="relative">{entry.label}</span>
                {entry.count ? <span className={`relative text-xs ${tab === entry.key ? "opacity-70" : "text-stone-400"}`}>{entry.count}</span> : null}
              </button>
            ))}
        </nav>

        {tab === "info" ? (
          <div className="mt-4">
            <BusinessInfo
              data={businessData}
              todayDayOfWeek={Number(formatInTimeZone(new Date(), timezone, "i")) % 7}
              onChat={chatChannels.length > 0 ? () => setIsChatOpen(true) : undefined}
            />
          </div>
        ) : tab !== "book" ? (
          <div className="mt-4">
            <PublicShowcase slug={slug} section={tab} onBook={bookingEnabled ? bookFromShowcase : () => undefined} />
          </div>
        ) : !bookingEnabled ? (
          <div className="mt-6 rounded-3xl border border-stone-200 bg-surface p-10 text-center">
            <h2 className="text-lg font-bold text-stone-900">Online booking is paused</h2>
            <p className="mt-2 text-sm text-stone-500">Please contact the business directly to book an appointment.</p>
          </div>
        ) : (
          <div ref={bookingCard} className="mt-4 grid scroll-mt-20 gap-6 lg:grid-cols-[1fr_320px]">
            <div className="min-w-0">
              {step !== "confirmation" && (
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex flex-1 gap-1.5" aria-hidden="true">
                    {STEPS.map((entry, index) => (
                      <span key={entry.key} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${index <= stepIndex ? "bg-brand-600" : "bg-stone-200"}`} />
                    ))}
                  </div>
                  <span className="shrink-0 text-xs font-medium text-stone-500">
                    {STEPS[stepIndex]?.label} · {stepIndex + 1}/{STEPS.length}
                  </span>
                </div>
              )}

              <div className="relative overflow-hidden rounded-3xl border border-stone-200 bg-surface p-5 sm:p-7">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div key={step} {...slide}>
                    {step === "service" && (
                      <>
                        <StepHeader
                          title={preferredStaff ? `What would you like ${preferredStaff.name.split(" ")[0]} to do?` : "What would you like to book?"}
                          subtitle="Choose a service to see free times."
                        />
                        {preferredStaff && (
                          <div className="mb-4 flex items-center gap-3 rounded-2xl bg-brand-50 px-3 py-2.5 text-sm text-brand-900">
                            <Avatar name={preferredStaff.name} src={preferredStaff.avatarUrl} size="sm" />
                            <span className="flex-1">
                              Booking with <span className="font-semibold">{preferredStaff.name}</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => setPreferredStaff(null)}
                              aria-label="Show every service"
                              className="flex h-8 w-8 items-center justify-center rounded-full text-brand-800 hover:bg-brand-100"
                            >
                              <X className="h-4 w-4" aria-hidden="true" />
                            </button>
                          </div>
                        )}
                        {services.length === 0 ? (
                          <p className="text-sm text-stone-500">This business hasn&apos;t added any bookable services yet.</p>
                        ) : (
                          <div className="grid gap-3 sm:grid-cols-2">
                            {services.filter((service) => !preferredStaff || preferredStaff.serviceIds.includes(service.id)).map((service, i) => {
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
                                  className="group flex items-start gap-4 rounded-2xl border border-stone-200 p-4 text-left transition-colors hover:border-brand-400 hover:shadow-[0_10px_30px_-15px_rgb(15_130_80/0.45)]"
                                >
                                  <ServiceThumb
                                    name={service.name}
                                    imageUrl={service.imageUrl}
                                    className={service.imageUrl ? "h-20 w-20 rounded-xl" : "h-11 w-11 rounded-xl"}
                                  />
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

                    {step === "datetime" && selectedService && (
                      <>
                        <StepHeader title="Pick a date & time" subtitle={`Times shown in ${timezone.replace(/_/g, " ")}.`} onBack={goBack} />
                        {!isStaffPending && staff.length === 0 ? (
                          <p className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-6 text-center text-sm text-stone-500">
                            Nobody offers this service right now. Please choose another service.
                          </p>
                        ) : (
                        <>
                        {staff.length > 1 && (
                          <div className="mb-5">
                            <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">
                              Professional <span className="font-normal normal-case tracking-normal">· optional</span>
                            </p>
                            <div className="no-scrollbar -mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-1">
                              {[{ id: ANY_STAFF, name: "Any available", avatarUrl: undefined }, ...staff].map((member) => {
                                const active = (staffId ?? ANY_STAFF) === member.id;
                                return (
                                  <button
                                    key={member.id}
                                    type="button"
                                    onClick={() => selectStaff(member.id)}
                                    aria-pressed={active}
                                    className={`inline-flex shrink-0 items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3.5 text-sm font-medium transition-colors ${
                                      active ? "border-brand-600 bg-brand-50 text-brand-800" : "border-stone-200 text-stone-700 hover:border-stone-300"
                                    }`}
                                  >
                                    {member.id === ANY_STAFF ? (
                                      <span className={`flex h-8 w-8 items-center justify-center rounded-full ${active ? "bg-brand-600 text-white" : "bg-stone-100 text-stone-500"}`}>
                                        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                                      </span>
                                    ) : (
                                      <Avatar name={member.name} src={member.avatarUrl} size="sm" />
                                    )}
                                    {member.id === ANY_STAFF ? member.name : member.name.split(" ")[0]}
                                    {"reviewCount" in member && <RatingBadge rating={member.rating} count={member.reviewCount} className="ml-0.5" />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        {onlyStaff && (
                          <p className="mb-4 flex items-center gap-2 text-sm text-stone-600">
                            <Avatar name={onlyStaff.name} src={onlyStaff.avatarUrl} size="xs" /> With {onlyStaff.name}
                          </p>
                        )}
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
                                    ? "border-brand-600 bg-brand-600 text-white shadow-[0_10px_20px_-10px_rgb(15_130_80/0.8)]"
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
                      </>
                    )}

                    {step === "details" && selectedService && selectedSlot && (
                      <>
                        <StepHeader title="Your details" subtitle="So the business can confirm and remind you." onBack={goBack} />
                        <form onSubmit={handleContinueToReview} noValidate className="space-y-4">
                          {knownCustomer && !editingDetails ? (
                            <div className="flex items-center gap-3 rounded-2xl bg-stone-50 p-4">
                              <Avatar name={name} size="md" />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate font-semibold text-stone-900">Booking as {name}</span>
                                <span className="block truncate text-sm text-stone-500">{[phone, email].filter(Boolean).join(" · ")}</span>
                              </span>
                              <button type="button" onClick={() => setEditingDetails(true)} className="shrink-0 text-sm font-semibold text-brand-700 hover:text-brand-800">
                                Change
                              </button>
                            </div>
                          ) : (
                            <>
                            <FormField label="Full name" type="text" autoComplete="name" value={name} onChange={setName} error={fieldErrors.name} />
                            <div className="grid gap-4 sm:grid-cols-2">
                              <FormField label="Phone" type="tel" autoComplete="tel" value={phone} onChange={setPhone} error={fieldErrors.phone} />
                              <FormField label="Email (for confirmation)" type="email" autoComplete="email" value={email} onChange={setEmail} error={fieldErrors.email} />
                            </div>
                            </>
                          )}
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

                    {step === "review" && selectedService && selectedSlot && (
                      <>
                        <StepHeader title="Confirm your booking" subtitle="Check the details, then tap confirm." onBack={goBack} />
                        <div className="space-y-4 rounded-2xl bg-stone-50 p-5">
                          <SummaryRow
                            icon={Sparkles}
                            label="Service"
                            value={selectedService.name}
                            sub={`${formatDuration(selectedService.durationMinutes)} · ${formatPrice(selectedService.price)}`}
                          />
                          <SummaryRow
                            icon={UserRound}
                            label="With"
                            value={staffLabel}
                            sub={!selectedStaff && !onlyStaff ? "The first free professional; you'll see who on the next screen" : undefined}
                          />
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
                      <div>
                        <div className="flex items-start gap-3">
                          <motion.span
                            initial={{ scale: 0.6, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 320, damping: 20 }}
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white"
                          >
                            <Check className="h-5 w-5" strokeWidth={3} aria-hidden="true" />
                          </motion.span>
                          <div className="min-w-0">
                            <h2 className="text-xl font-semibold text-stone-900">You&apos;re booked, {confirmation.customerName.split(" ")[0]}</h2>
                            <p className="mt-0.5 text-sm text-stone-600">
                              {confirmation.serviceName} with {confirmation.staffName},{" "}
                              {formatInTimeZone(new Date(confirmation.startTime), timezone, "EEE d MMM 'at' h:mm a")}
                            </p>
                          </div>
                        </div>

                        <div className="mt-5 rounded-2xl border border-stone-200 p-3 sm:p-4">
                          <p className="px-1 text-sm font-semibold text-stone-900">Message {business.name}</p>
                          <p className="px-1 text-xs text-stone-500">Questions before your visit? Ask here. Replies also appear on your booking page.</p>
                          <CustomerChat token={confirmation.accessToken} className="mt-1 h-[340px]" />
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <Link
                            to={`/my-booking/${confirmation.accessToken}`}
                            target={embedded ? "_top" : undefined}
                            className="inline-flex h-10 items-center rounded-full bg-ink px-4 text-sm font-semibold text-white hover:bg-ink-700 dark:bg-highlight dark:text-ink"
                          >
                            Open my booking page
                          </Link>
                          <Link
                            to={`/c/${confirmation.customerToken}`}
                            target={embedded ? "_top" : undefined}
                            className="inline-flex h-10 items-center rounded-full border border-stone-300 px-4 text-sm font-medium text-stone-700 hover:bg-stone-50"
                          >
                            All my appointments
                          </Link>
                          <a
                            href={googleCalendarUrl(
                              `${confirmation.serviceName} at ${business.name}`,
                              confirmation.startTime,
                              confirmation.endTime,
                              `With ${confirmation.staffName}.`,
                              business.address,
                            )}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex h-10 items-center gap-2 rounded-full border border-stone-300 px-4 text-sm font-medium text-stone-700 hover:bg-stone-50"
                          >
                            <CalendarPlus className="h-4 w-4" aria-hidden="true" /> Add to calendar
                          </a>
                          <button type="button" onClick={startOver} className="inline-flex h-10 items-center rounded-full px-3 text-sm font-medium text-stone-600 hover:bg-stone-100">
                            Book another
                          </button>
                        </div>

                        {isDemoSlug(business.slug) && (
                          <div data-demo-banner className="mt-5 flex flex-col gap-3 rounded-2xl bg-ink p-4 text-white sm:flex-row sm:items-center">
                            <p className="flex-1 text-sm text-white/75">
                              <span className="font-semibold text-white">Now switch sides.</span> See this booking and your messages the way the salon owner sees them.
                            </p>
                            <Link
                              to={ownerDemoPath("/inbox?tab=messages")}
                              target={embedded ? "_top" : undefined}
                              className="inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-highlight px-4 text-sm font-semibold text-ink"
                            >
                              Open the owner&apos;s inbox
                            </Link>
                          </div>
                        )}
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
                  <SummaryRow icon={UserRound} label="Professional" value={staffLabel} />
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

        <AnimatePresence>
          {isChatOpen && <ChatSheet slug={slug} business={business} services={services} onClose={() => setIsChatOpen(false)} />}
        </AnimatePresence>

        <Link to="/" target={embedded ? "_top" : undefined} className="mx-auto mt-10 flex w-fit items-center gap-1.5 text-xs text-stone-400 transition-colors hover:text-stone-600">
          Powered by <LogoMark className="h-4 w-4" /> <span className="font-semibold text-stone-500">ServiceBook</span>
        </Link>
      </div>
    </div>
  );
}
