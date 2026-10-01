import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { formatInTimeZone } from "date-fns-tz";
import { formatDistanceToNowStrict } from "date-fns";
import { motion } from "motion/react";
import { CalendarPlus, ChevronRight, MapPin, Phone, RotateCcw, Star } from "lucide-react";
import type { CustomerPortalAppointment, CustomerPortalResponse } from "@servicebook/types";
import { rebookPath, useCustomerPortal } from "../lib/customerPortal";
import { formatPrice, setDisplayCurrency } from "../lib/format";
import { imageSrc } from "../lib/images";
import { isDemoSlug } from "../lib/demo";
import { BookingStatusBadge } from "../components/ui/Badge";
import { DemoBar } from "../components/DemoBar";
import { LogoMark } from "../components/Logo";

function UpcomingCard({ appointment, timezone, index }: { appointment: CustomerPortalAppointment; timezone: string; index: number }) {
  const start = new Date(appointment.startTime);
  const cancelled = appointment.status === "CANCELLED";
  return (
    <motion.li initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
      <Link
        to={`/my-booking/${appointment.accessToken}`}
        className={`flex items-center gap-4 rounded-3xl border bg-surface p-4 transition hover:border-stone-300 hover:shadow-[0_12px_30px_-20px_rgb(12_26_20/0.45)] ${
          cancelled ? "border-stone-200 opacity-60" : "border-stone-200"
        }`}
      >
        <span className="flex w-14 shrink-0 flex-col items-center rounded-2xl bg-ink py-2 text-white">
          <span className="text-[11px] font-medium uppercase tracking-wide text-white/60">{formatInTimeZone(start, timezone, "MMM")}</span>
          <span className="font-display text-2xl font-semibold leading-none">{formatInTimeZone(start, timezone, "d")}</span>
          <span className="mt-0.5 text-[11px] text-white/60">{formatInTimeZone(start, timezone, "EEE")}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-stone-900">{appointment.serviceName}</span>
          <span className="block truncate text-sm text-stone-500">
            {formatInTimeZone(start, timezone, "h:mm a")}
            {appointment.staffName ? ` with ${appointment.staffName.split(" ")[0]}` : ""}
          </span>
          <span className="mt-1.5 flex items-center gap-2">
            <BookingStatusBadge status={appointment.status} />
            {!cancelled && <span className="text-xs text-stone-400">{formatDistanceToNowStrict(start, { addSuffix: true })}</span>}
          </span>
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 text-stone-300" aria-hidden="true" />
      </Link>
    </motion.li>
  );
}

function PastRow({ appointment, timezone, data, token }: { appointment: CustomerPortalAppointment; timezone: string; data: CustomerPortalResponse; token: string }) {
  const start = new Date(appointment.startTime);
  const done = appointment.status === "COMPLETED";
  return (
    <li className="flex items-center gap-3 py-3.5">
      <Link to={`/my-booking/${appointment.accessToken}`} className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-stone-900">{appointment.serviceName}</span>
        <span className="block truncate text-xs text-stone-500">
          {formatInTimeZone(start, timezone, "d MMM yyyy")}
          {appointment.staffName ? ` · ${appointment.staffName.split(" ")[0]}` : ""}
          {appointment.price !== undefined && done ? ` · ${formatPrice(appointment.price)}` : ""}
        </span>
        <span className="mt-1 flex items-center gap-2">
          {done ? (
            appointment.rating ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-stone-600">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden="true" /> You rated it {appointment.rating}
              </span>
            ) : appointment.canReview ? (
              <span className="text-xs font-semibold text-amber-700">Rate this visit</span>
            ) : null
          ) : (
            <BookingStatusBadge status={appointment.status} />
          )}
        </span>
      </Link>
      {data.business.bookingEnabled && (
        <Link
          to={rebookPath(data.business.slug, token, { serviceId: appointment.serviceId, staffId: appointment.staffId })}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-stone-300 px-3 text-xs font-semibold text-stone-700 transition-colors hover:bg-stone-50"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Book again
        </Link>
      )}
    </li>
  );
}

/** /c/:token — a customer's own page: their appointments with one business, and booking again. */
export function CustomerPortalPage() {
  const { token = "" } = useParams();
  const { data, isPending, isError } = useCustomerPortal(token);
  const [showAllPast, setShowAllPast] = useState(false);

  useEffect(() => {
    if (data) document.title = `Your appointments · ${data.business.name}`;
  }, [data]);

  if (isPending) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="skeleton-shimmer h-40 rounded-3xl bg-stone-200/70" />
        <div className="skeleton-shimmer mt-4 h-72 rounded-3xl bg-stone-200/70" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50 px-4 text-center">
        <div className="max-w-sm">
          <h1 className="text-xl font-semibold text-stone-900">This link isn&apos;t working</h1>
          <p className="mt-2 text-sm text-stone-500">Please ask the business to send you your link again.</p>
        </div>
      </div>
    );
  }

  const { business, customer, upcoming, past, visits } = data;
  setDisplayCurrency(business.currency);
  const firstName = customer.name.split(" ")[0];
  const next = upcoming.find((appointment) => appointment.status !== "CANCELLED");

  return (
    <div className="min-h-screen bg-stone-50 pb-14">
      {isDemoSlug(business.slug) && <DemoBar />}
      <header className="relative overflow-hidden bg-ink text-white">
        {business.coverImageUrl && (
          <>
            <img src={imageSrc(business.coverImageUrl)} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-ink/70" aria-hidden="true" />
          </>
        )}
        <div className="relative mx-auto max-w-2xl px-4 pb-8 pt-8 sm:pt-12">
          <div className="flex items-center gap-3">
            {business.logoUrl ? (
              <img src={imageSrc(business.logoUrl)} alt="" className="h-11 w-11 rounded-xl object-cover" />
            ) : (
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-highlight font-bold text-ink">{business.name.charAt(0)}</span>
            )}
            <p className="font-semibold">{business.name}</p>
          </div>
          <h1 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">Hi {firstName}</h1>
          <p className="mt-1.5 text-white/70">
            {next
              ? `Your next visit is ${formatInTimeZone(new Date(next.startTime), business.timezone, "EEEE d MMMM 'at' h:mm a")}.`
              : visits > 0
                ? `You've visited ${visits} time${visits === 1 ? "" : "s"}. Ready for the next one?`
                : "Here are your appointments with us."}
          </p>
          {business.bookingEnabled && (
            <Link
              to={rebookPath(business.slug, token)}
              className="mt-6 inline-flex h-12 items-center gap-2 rounded-xl bg-highlight px-5 text-[15px] font-semibold text-ink transition hover:bg-highlight-soft"
            >
              <CalendarPlus className="h-4 w-4" aria-hidden="true" /> Book an appointment
            </Link>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-8 px-4 pt-8">
        <section>
          <h2 className="text-lg font-semibold text-stone-900">Coming up</h2>
          {upcoming.length === 0 ? (
            <p className="mt-3 rounded-3xl border border-dashed border-stone-300 px-5 py-6 text-sm text-stone-500">Nothing booked yet.</p>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {upcoming.map((appointment, index) => (
                <UpcomingCard key={appointment.accessToken} appointment={appointment} timezone={business.timezone} index={index} />
              ))}
            </ul>
          )}
        </section>

        {past.length > 0 && (
          <section>
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-semibold text-stone-900">Past visits</h2>
              {visits > 0 && <span className="text-sm text-stone-500">{visits} completed</span>}
            </div>
            <ul className="mt-2 divide-y divide-stone-100 rounded-3xl border border-stone-200 bg-surface px-4">
              {(showAllPast ? past : past.slice(0, 8)).map((appointment) => (
                <PastRow key={appointment.accessToken} appointment={appointment} timezone={business.timezone} data={data} token={token} />
              ))}
            </ul>
            {past.length > 8 && (
              <button
                type="button"
                onClick={() => setShowAllPast((value) => !value)}
                className="mt-3 text-sm font-semibold text-stone-900 underline decoration-stone-300 underline-offset-4"
              >
                {showAllPast ? "Show fewer" : `Show all ${past.length}`}
              </button>
            )}
          </section>
        )}

        {(business.address || business.phone) && (
          <section className="flex flex-wrap gap-2">
            {business.address && (
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(business.address)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center gap-2 rounded-full border border-stone-300 bg-surface px-4 text-sm font-medium text-stone-700 hover:bg-stone-50"
              >
                <MapPin className="h-4 w-4" aria-hidden="true" /> {business.address}
              </a>
            )}
            {business.phone && (
              <a
                href={`tel:${business.phone.replace(/\s/g, "")}`}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-stone-300 bg-surface px-4 text-sm font-medium text-stone-700 hover:bg-stone-50"
              >
                <Phone className="h-4 w-4" aria-hidden="true" /> {business.phone}
              </a>
            )}
          </section>
        )}

        <p className="text-xs text-stone-400">This page is private to you. Anyone with the link can see it, so keep it to yourself.</p>

        <Link to="/" className="flex items-center justify-center gap-2 text-xs text-stone-400 hover:text-stone-600">
          <LogoMark className="h-4 w-4" /> Powered by ServiceBook
        </Link>
      </main>
    </div>
  );
}
