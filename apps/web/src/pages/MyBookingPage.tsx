import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { formatInTimeZone } from "date-fns-tz";
import { CalendarPlus, Check, Copy, MapPin, Phone } from "lucide-react";
import { useCancelPublicBooking, usePublicThread } from "../lib/bookingChat";
import { ApiError } from "../lib/apiClient";
import { imageSrc } from "../lib/images";
import { formatPrice, setDisplayCurrency } from "../lib/format";
import { isDemoSlug } from "../lib/demo";
import { CustomerChat } from "../components/chat/CustomerChat";
import { DemoBar } from "../components/DemoBar";
import { BookingStatusBadge } from "../components/ui/Badge";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { LogoMark } from "../components/Logo";

function googleCalendarUrl(title: string, start: string, end: string, location?: string): string {
  const fmt = (iso: string) => iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const params = new URLSearchParams({ action: "TEMPLATE", text: title, dates: `${fmt(start)}/${fmt(end)}` });
  if (location) params.set("location", location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** /my-booking/:token — the customer's private page: booking details, chat with the business, cancel. */
export function MyBookingPage() {
  const { token = "" } = useParams();
  const { data, isPending, isError } = usePublicThread(token);
  const cancel = useCancelPublicBooking(token);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [copied, setCopied] = useState(false);

  if (isPending) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="skeleton-shimmer h-40 rounded-3xl bg-stone-200/70" />
        <div className="skeleton-shimmer mt-4 h-96 rounded-3xl bg-stone-200/70" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50 px-4 text-center">
        <div className="max-w-sm">
          <h1 className="text-xl font-semibold text-stone-900">This booking link isn&apos;t working</h1>
          <p className="mt-2 text-sm text-stone-500">It may have been mistyped. Check the link the business sent you, or book again.</p>
        </div>
      </div>
    );
  }

  const { booking, business } = data;
  setDisplayCurrency(business.currency);
  const start = new Date(booking.startTime);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Copy this link", window.location.href);
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-12">
      {isDemoSlug(business.slug) && <DemoBar />}
      <div className="mx-auto max-w-2xl px-4 pt-6 sm:pt-10">
        <div className="flex items-center gap-3">
          {business.logoUrl ? (
            <img src={imageSrc(business.logoUrl)} alt="" className="h-11 w-11 rounded-xl object-cover" />
          ) : (
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-ink font-bold text-highlight">{business.name.charAt(0)}</span>
          )}
          <div className="min-w-0">
            <p className="text-xs text-stone-500">Your booking with</p>
            <Link to={`/book/${business.slug}`} className="block truncate font-semibold text-stone-900 hover:underline">
              {business.name}
            </Link>
          </div>
        </div>

        <section className="mt-5 rounded-3xl border border-stone-200 bg-surface p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-stone-900 sm:text-2xl">{booking.serviceName}</h1>
              {booking.staffName && <p className="mt-0.5 text-sm text-stone-500">with {booking.staffName}</p>}
            </div>
            <BookingStatusBadge status={booking.status} />
          </div>
          <div className="mt-5 flex items-end justify-between gap-4 border-t border-stone-100 pt-5">
            <div>
              <p className="font-display text-3xl font-semibold tracking-tight text-stone-900">{formatInTimeZone(start, business.timezone, "h:mm a")}</p>
              <p className="text-sm text-stone-600">{formatInTimeZone(start, business.timezone, "EEEE d MMMM")}</p>
            </div>
            {booking.price !== undefined && <p className="text-lg font-semibold text-stone-900">{formatPrice(booking.price)}</p>}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {booking.status !== "CANCELLED" && (
              <a
                href={googleCalendarUrl(`${booking.serviceName} at ${business.name}`, booking.startTime, booking.endTime, business.address)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center gap-2 rounded-full border border-stone-300 px-4 text-sm font-medium text-stone-700 hover:bg-stone-50"
              >
                <CalendarPlus className="h-4 w-4" aria-hidden="true" /> Add to calendar
              </a>
            )}
            {business.address && (
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(business.address)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center gap-2 rounded-full border border-stone-300 px-4 text-sm font-medium text-stone-700 hover:bg-stone-50"
              >
                <MapPin className="h-4 w-4" aria-hidden="true" /> Directions
              </a>
            )}
            {business.phone && (
              <a href={`tel:${business.phone.replace(/\s/g, "")}`} className="inline-flex h-10 items-center gap-2 rounded-full border border-stone-300 px-4 text-sm font-medium text-stone-700 hover:bg-stone-50">
                <Phone className="h-4 w-4" aria-hidden="true" /> Call
              </a>
            )}
            {booking.canCancel && (
              <button type="button" onClick={() => setConfirmCancel(true)} className="inline-flex h-10 items-center rounded-full px-4 text-sm font-medium text-red-600 hover:bg-red-50">
                Cancel booking
              </button>
            )}
          </div>
          {cancel.isError && (
            <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
              {cancel.error instanceof ApiError ? cancel.error.message : "Couldn't cancel. Please try again."}
            </p>
          )}
        </section>

        <section className="mt-4 rounded-3xl border border-stone-200 bg-surface p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3 px-1">
            <h2 className="font-semibold text-stone-900">Messages</h2>
            <button type="button" onClick={copyLink} className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-500 hover:text-stone-800">
              {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
              {copied ? "Link copied" : "Copy link to this page"}
            </button>
          </div>
          <p className="px-1 text-xs text-stone-500">Replies show up here. Keep this link to come back to them.</p>
          <CustomerChat token={token} className="mt-2 h-[min(460px,60svh)]" />
        </section>

        <Link to="/" className="mt-8 flex items-center justify-center gap-2 text-xs text-stone-400 hover:text-stone-600">
          <LogoMark className="h-4 w-4" /> Powered by ServiceBook
        </Link>
      </div>

      {confirmCancel && (
        <ConfirmDialog
          title="Cancel this booking?"
          confirmLabel="Yes, cancel it"
          cancelLabel="Keep it"
          destructive
          isConfirming={cancel.isPending}
          onConfirm={() => cancel.mutate(undefined, { onSettled: () => setConfirmCancel(false) })}
          onCancel={() => setConfirmCancel(false)}
        >
          <p>
            {booking.serviceName}, {formatInTimeZone(start, business.timezone, "EEE d MMM, h:mm a")}
          </p>
          <p>{business.name} will see that you cancelled.</p>
        </ConfirmDialog>
      )}
    </div>
  );
}
