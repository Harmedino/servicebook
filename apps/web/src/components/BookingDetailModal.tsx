import { useState } from "react";
import { formatInTimeZone } from "date-fns-tz";
import type { BookingProfile } from "@servicebook/types";
import { useUpdateBooking } from "../lib/bookings";
import { ApiError } from "../lib/apiClient";
import { useEscapeToClose } from "../lib/useEscapeToClose";
import { STATUS_BADGE_STYLES, STATUS_LABELS } from "../lib/bookingStatus";

interface BookingDetailModalProps {
  booking: BookingProfile;
  timezone: string;
  onClose: () => void;
}

export function BookingDetailModal({ booking, timezone, onClose }: BookingDetailModalProps) {
  useEscapeToClose(onClose);
  const updateBooking = useUpdateBooking();

  const [notes, setNotes] = useState(booking.notes ?? "");
  const [error, setError] = useState<string | null>(null);

  const isFinal = booking.status === "CANCELLED" || booking.status === "COMPLETED";
  const notesChanged = notes !== (booking.notes ?? "");

  async function handleStatusChange(status: "COMPLETED" | "CANCELLED") {
    if (status === "CANCELLED" && !window.confirm(`Cancel the booking for ${booking.customerName}?`)) {
      return;
    }
    setError(null);
    try {
      await updateBooking.mutateAsync({ id: booking.id, status });
      if (status === "CANCELLED") {
        onClose();
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  }

  async function handleSaveNotes() {
    setError(null);
    try {
      await updateBooking.mutateAsync({ id: booking.id, notes });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save notes. Please try again.");
    }
  }

  const dateLabel = formatInTimeZone(new Date(booking.startTime), timezone, "EEEE, MMMM d");
  const timeLabel = `${formatInTimeZone(new Date(booking.startTime), timezone, "h:mm a")} – ${formatInTimeZone(
    new Date(booking.endTime),
    timezone,
    "h:mm a",
  )}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-stone-900/40 px-4 py-8">
      <div className="animate-fade-in-up w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-stone-900">{booking.customerName}</h2>
            <p className="mt-0.5 text-sm text-stone-600">
              {booking.serviceName} · {booking.staffName}
            </p>
          </div>
          <span
            className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE_STYLES[booking.status]}`}
          >
            {STATUS_LABELS[booking.status]}
          </span>
        </div>

        <div className="mt-4 rounded-lg bg-stone-50 px-3 py-2 text-sm text-stone-700">
          <p>{dateLabel}</p>
          <p>{timeLabel}</p>
        </div>

        <label className="mt-4 block">
          <span className="text-sm font-medium text-stone-700">Notes</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            disabled={isFinal || updateBooking.isPending}
            rows={3}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 disabled:cursor-not-allowed disabled:bg-stone-100"
          />
        </label>
        {!isFinal && notesChanged && (
          <button
            type="button"
            onClick={handleSaveNotes}
            disabled={updateBooking.isPending}
            className="mt-2 text-sm font-medium text-brand-700 hover:text-brand-800 disabled:cursor-not-allowed"
          >
            Save notes
          </button>
        )}

        {error && (
          <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100"
          >
            Close
          </button>
          {!isFinal && (
            <>
              <button
                type="button"
                onClick={() => handleStatusChange("CANCELLED")}
                disabled={updateBooking.isPending}
                className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed"
              >
                Cancel booking
              </button>
              <button
                type="button"
                onClick={() => handleStatusChange("COMPLETED")}
                disabled={updateBooking.isPending}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed"
              >
                Mark completed
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
