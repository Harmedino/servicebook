import { useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { formatInTimeZone } from "date-fns-tz";
import { formatDistanceToNowStrict } from "date-fns";
import { AnimatePresence, motion } from "motion/react";
import { CalendarClock, CalendarX, Check, ChevronRight, Loader2, Mail, MessageCircle, Phone, UserX, X } from "lucide-react";
import type { BookingProfile, BookingStatus } from "@servicebook/types";
import { useBooking, useUpdateBooking } from "../lib/bookings";
import { useMyBusiness } from "../lib/business";
import { ApiError } from "../lib/apiClient";
import { formatDuration, formatPrice } from "../lib/format";
import { whatsappNumberFor } from "../lib/socials";
import { DashboardLayout } from "../components/DashboardLayout";
import { BookingStatusBadge } from "../components/ui/Badge";
import { Avatar } from "../components/ui/Avatar";
import { BackLink } from "../components/ui/BackLink";
import { Button } from "../components/ui/Button";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { RescheduleModal } from "../components/RescheduleModal";
import { OwnerThread } from "../components/chat/OwnerThread";

type ActionStatus = "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";

const DONE_MESSAGES: Record<ActionStatus, string> = {
  CONFIRMED: "Confirmed. The customer can see it on their booking page.",
  COMPLETED: "Marked as done. They've been asked to rate the visit.",
  CANCELLED: "Appointment cancelled.",
  NO_SHOW: "Marked as a no-show.",
};

const FINAL_NOTES: Partial<Record<BookingStatus, string>> = {
  COMPLETED: "This visit is done. Notes and messages stay here for next time.",
  CANCELLED:
    "This appointment was cancelled. The time is free for someone else.",
  NO_SHOW: "The customer didn't turn up for this one.",
};

function ContactButton({
  href,
  icon: Icon,
  label,
  external,
}: {
  href: string;
  icon: typeof Phone;
  label: string;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className="flex flex-1 flex-col items-center gap-1 rounded-2xl border border-stone-200 py-2.5 text-xs font-medium text-stone-700 transition-colors hover:border-stone-300 hover:bg-stone-50"
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {label}
    </a>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <span className="text-sm text-stone-500">{label}</span>
      <span className="min-w-0 text-right text-sm font-medium text-stone-900">
        {children}
      </span>
    </div>
  );
}

function BookingView({ booking, timezone }: { booking: BookingProfile; timezone: string }) {
  const updateBooking = useUpdateBooking();
  const { data: businessData } = useMyBusiness();

  const [notes, setNotes] = useState(booking.notes ?? "");
  const [notesState, setNotesState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, setPending] = useState<ActionStatus | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);

  const start = new Date(booking.startTime);
  const end = new Date(booking.endTime);
  const isFinal = booking.status === "CANCELLED" || booking.status === "COMPLETED" || booking.status === "NO_SHOW";
  const hasStarted = start.getTime() <= Date.now();
  const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60_000);
  const whatsapp = booking.customerPhone ? whatsappNumberFor(booking.customerPhone, businessData?.business?.socials?.whatsapp) : null;
  const busy = updateBooking.isPending;

  async function setStatus(status: ActionStatus) {
    setError(null);
    setDone(null);
    setPending(status);
    try {
      await updateBooking.mutateAsync({ id: booking.id, status });
      setDone(DONE_MESSAGES[status]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setPending(null);
    }
  }

  async function saveNotes() {
    if (isFinal || notes === (booking.notes ?? "")) return;
    setNotesState("saving");
    setError(null);
    try {
      await updateBooking.mutateAsync({ id: booking.id, notes });
      setNotesState("saved");
      setTimeout(() => setNotesState("idle"), 1800);
    } catch (err) {
      setNotesState("idle");
      setError(err instanceof ApiError ? err.message : "Couldn't save notes. Please try again.");
    }
  }

  const icon = (status: ActionStatus, Fallback: typeof Check) =>
    pending === status ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Fallback className="h-4 w-4" aria-hidden="true" />;

  return (
    <>
      <BackLink to="/bookings" label="All bookings" />

      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <BookingStatusBadge status={booking.status} />
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">{booking.serviceName}</h1>
          <p className="mt-1 text-sm text-stone-500">
            {booking.customerName} with {booking.staffName}
          </p>
        </div>
        {!isFinal && (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setIsRescheduleOpen(true)} disabled={busy}>
              <CalendarClock className="h-4 w-4" aria-hidden="true" /> Move
            </Button>
            <Button variant="danger" onClick={() => setShowCancelConfirm(true)} disabled={busy}>
              <CalendarX className="h-4 w-4" aria-hidden="true" /> Cancel
            </Button>
            {booking.status === "PENDING" ? (
              <Button className="flex-1 sm:flex-none" onClick={() => setStatus("CONFIRMED")} disabled={busy}>
                {icon("CONFIRMED", Check)} Confirm
              </Button>
            ) : (
              <Button className="flex-1 sm:flex-none" onClick={() => setStatus("COMPLETED")} disabled={busy}>
                {icon("COMPLETED", Check)} Mark done
              </Button>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {(done || error) && (
          <motion.p
            key={done ?? error}
            role={error ? "alert" : "status"}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`mt-4 flex items-start gap-2 rounded-2xl px-4 py-3 text-sm ${error ? "bg-red-50 text-red-700" : "bg-brand-50 text-brand-800"}`}
          >
            {error ? <X className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> : <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}
            {error ?? done}
          </motion.p>
        )}
      </AnimatePresence>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start">
        <div className="space-y-6">
          <section className="rounded-3xl bg-ink p-6 text-white">
            <p className="text-xs font-medium uppercase tracking-wider text-white/50">
              {isFinal ? formatInTimeZone(start, timezone, "EEEE d MMMM yyyy") : formatDistanceToNowStrict(start, { addSuffix: true })}
            </p>
            <p className="mt-2 font-display text-5xl font-semibold tracking-tight">
              {formatInTimeZone(start, timezone, "h:mm")}
              <span className="ml-1.5 text-2xl text-white/60">{formatInTimeZone(start, timezone, "a")}</span>
            </p>
            <p className="mt-1 text-sm text-white/70">
              {formatInTimeZone(start, timezone, "EEEE d MMMM")} · until {formatInTimeZone(end, timezone, "h:mm a")}
            </p>
          </section>

          {!isFinal && hasStarted && (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
              <p className="text-sm font-semibold text-stone-900">Did {booking.customerName.split(" ")[0]} come in?</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => setStatus("COMPLETED")} disabled={busy}>
                  {icon("COMPLETED", Check)} Yes, mark done
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setStatus("NO_SHOW")} disabled={busy}>
                  {icon("NO_SHOW", UserX)} No-show
                </Button>
              </div>
            </section>
          )}
          {isFinal && FINAL_NOTES[booking.status] && <p className="rounded-2xl bg-stone-100 px-4 py-3 text-sm text-stone-600">{FINAL_NOTES[booking.status]}</p>}

          <section className="rounded-3xl border border-stone-200 bg-surface p-5">
            <Link to={`/customers/${booking.customerId}`} className="group -m-1 flex items-center gap-3 rounded-2xl p-1 transition-colors hover:bg-stone-50">
              <Avatar name={booking.customerName} size="lg" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base font-semibold text-stone-900">{booking.customerName}</span>
                <span className="block truncate text-sm text-stone-500">{booking.customerPhone ?? booking.customerEmail ?? "No contact details"}</span>
              </span>
              <ChevronRight className="h-5 w-5 text-stone-300 transition-transform group-hover:translate-x-0.5 group-hover:text-stone-500" aria-hidden="true" />
            </Link>
            {(booking.customerPhone || booking.customerEmail) && (
              <div className="mt-4 flex gap-2">
                {booking.customerPhone && <ContactButton href={`tel:${booking.customerPhone.replace(/\s/g, "")}`} icon={Phone} label="Call" />}
                {whatsapp && <ContactButton href={`https://wa.me/${whatsapp}`} icon={MessageCircle} label="WhatsApp" external />}
                {booking.customerEmail && <ContactButton href={`mailto:${booking.customerEmail}`} icon={Mail} label="Email" />}
              </div>
            )}
            <div className="mt-4 divide-y divide-stone-100 border-t border-stone-100">
              <Row label="Service">
                {booking.serviceName}
              </Row>
              <Row label="With">
                <span className="inline-flex items-center gap-2">
                  <Avatar name={booking.staffName} size="xs" /> {booking.staffName}
                </span>
              </Row>
              <Row label="Length">{formatDuration(durationMinutes)}</Row>
              {booking.price !== undefined && (
                <Row label="Price">
                  <span className="text-base">{formatPrice(booking.price)}</span>
                  <span className="block text-xs font-normal text-stone-400">Paid at the appointment</span>
                </Row>
              )}
              <Row label="Booked">{formatDistanceToNowStrict(new Date(booking.createdAt), { addSuffix: true })}</Row>
            </div>
          </section>

          <section className="rounded-3xl border border-stone-200 bg-surface p-5">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="booking-notes" className="text-sm font-semibold text-stone-900">
                Notes
              </label>
              <span className="text-xs text-stone-400" aria-live="polite">
                {notesState === "saving" ? "Saving…" : notesState === "saved" ? "Saved" : isFinal ? "" : "Saves when you click away · only you see these"}
              </span>
            </div>
            <textarea
              id="booking-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              onBlur={saveNotes}
              disabled={isFinal}
              rows={4}
              placeholder={isFinal ? "No notes" : "Allergies, the style they want, anything to remember…"}
              className="mt-3 w-full resize-none rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 transition-colors focus:border-brand-500 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:cursor-not-allowed"
            />
          </section>
        </div>

        <section className="rounded-3xl border border-stone-200 bg-surface p-4 lg:sticky lg:top-6">
          <p className="px-1 text-sm font-semibold text-stone-900">Messages with {booking.customerName.split(" ")[0]}</p>
          <OwnerThread bookingId={booking.id} timezone={timezone} className="mt-2 h-[min(560px,70svh)]" />
        </section>
      </div>

      {showCancelConfirm && (
        <ConfirmDialog
          title="Cancel this appointment?"
          confirmLabel="Cancel appointment"
          cancelLabel="Keep it"
          destructive
          isConfirming={busy}
          onConfirm={async () => {
            await setStatus("CANCELLED");
            setShowCancelConfirm(false);
          }}
          onCancel={() => setShowCancelConfirm(false)}
        >
          <p>
            {booking.customerName} · {booking.serviceName}
          </p>
          <p>{formatInTimeZone(start, timezone, "EEEE d MMMM, h:mm a")}</p>
        </ConfirmDialog>
      )}

      {isRescheduleOpen && (
        <RescheduleModal
          booking={booking}
          timezone={timezone}
          onClose={() => setIsRescheduleOpen(false)}
          onSuccess={() => {
            setIsRescheduleOpen(false);
            setError(null);
            setDone("Moved. The new time is on their booking page.");
          }}
        />
      )}
    </>
  );
}

/** /bookings/:id — one appointment: when, who, what's next, notes and the chat. */
export function BookingDetailPage() {
  const { bookingId = "" } = useParams();
  const { data, isPending, isError } = useBooking(bookingId);
  const { data: businessData } = useMyBusiness();
  const timezone = businessData?.business?.timezone ?? "UTC";

  return (
    <DashboardLayout>
      {isPending ? (
        <div className="space-y-4">
          <div className="skeleton-shimmer h-8 w-40 rounded-lg bg-stone-200/70" />
          <div className="skeleton-shimmer h-40 rounded-3xl bg-stone-200/70" />
          <div className="skeleton-shimmer h-64 rounded-3xl bg-stone-200/70" />
        </div>
      ) : isError || !data ? (
        <>
          <BackLink to="/bookings" label="All bookings" />
          <div className="mt-4 rounded-3xl border border-stone-200 bg-surface p-8 text-center">
            <p className="font-semibold text-stone-900">This booking doesn&apos;t exist anymore</p>
            <p className="mt-1 text-sm text-stone-500">It may have been removed, or the link is from another account.</p>
          </div>
        </>
      ) : (
        // Keyed so notes and messages reset when moving between bookings.
        <BookingView key={data.booking.id} booking={data.booking} timezone={timezone} />
      )}
    </DashboardLayout>
  );
}
