import { useState } from "react";
import { formatInTimeZone } from "date-fns-tz";
import type { BookingProfile } from "@servicebook/types";
import { useStaffList } from "../lib/staff";
import { useAvailableSlots, useUpdateBooking } from "../lib/bookings";
import { ApiError } from "../lib/apiClient";
import { useEscapeToClose } from "../lib/useEscapeToClose";
import { ConfirmDialog } from "./ConfirmDialog";
import { Button } from "./ui/Button";

interface RescheduleModalProps {
  booking: BookingProfile;
  timezone: string;
  onClose: () => void;
  onSuccess: () => void;
}

/** Owner-side reschedule: date, staff, and an available time — the service never changes here. */
export function RescheduleModal({ booking, timezone, onClose, onSuccess }: RescheduleModalProps) {
  useEscapeToClose(onClose);

  const today = formatInTimeZone(new Date(), timezone, "yyyy-MM-dd");

  const { data: staffData } = useStaffList();
  const eligibleStaff = (staffData?.staff ?? []).filter(
    (staff) => staff.isActive && staff.serviceIds.includes(booking.serviceId),
  );

  const [staffId, setStaffId] = useState(booking.staffId);
  const [date, setDate] = useState(formatInTimeZone(new Date(booking.startTime), timezone, "yyyy-MM-dd"));
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: slotsData, isFetching: isLoadingSlots } = useAvailableSlots(booking.serviceId, staffId, date);
  const slots = slotsData?.slots ?? [];

  const updateBooking = useUpdateBooking();

  function handleStaffChange(value: string) {
    setStaffId(value);
    setSelectedSlot(null);
  }

  function handleDateChange(value: string) {
    setDate(value);
    setSelectedSlot(null);
  }

  async function handleConfirm() {
    if (!selectedSlot) {
      return;
    }
    setError(null);
    try {
      await updateBooking.mutateAsync({ id: booking.id, staffId, startTime: selectedSlot });
      onSuccess();
    } catch (err) {
      setShowConfirm(false);
      setError(err instanceof ApiError ? err.message : "Couldn't reschedule this appointment. Please try again.");
    }
  }

  const selectedStaffName = eligibleStaff.find((staff) => staff.id === staffId)?.name ?? booking.staffName;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-stone-900/40 px-4 py-8">
        <div className="animate-fade-in-up w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
          <h2 className="text-lg font-semibold text-stone-900">Reschedule appointment</h2>
          <p className="mt-1 text-sm text-stone-500">
            {booking.serviceName} for {booking.customerName}
          </p>

          <div className="mt-4 space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-stone-700">Staff</span>
              <select
                value={staffId}
                onChange={(event) => handleStaffChange(event.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              >
                {eligibleStaff.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-stone-700">Date</span>
              <input
                type="date"
                value={date}
                min={today}
                onChange={(event) => handleDateChange(event.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              />
            </label>

            <div>
              <span className="text-sm font-medium text-stone-700">Available times</span>
              {isLoadingSlots ? (
                <p className="mt-2 text-sm text-stone-500">Loading available times…</p>
              ) : slots.length === 0 ? (
                <p className="mt-2 rounded-lg border border-dashed border-stone-300 bg-stone-50 p-3 text-sm text-stone-500">
                  No available times for this date.
                </p>
              ) : (
                <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {slots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      className={`rounded-lg border px-2 py-1.5 text-sm transition-colors ${
                        selectedSlot === slot
                          ? "border-brand-600 bg-brand-600 text-white"
                          : "border-stone-300 text-stone-700 hover:border-brand-400"
                      }`}
                    >
                      {formatInTimeZone(new Date(slot), timezone, "h:mm a")}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" onClick={() => setShowConfirm(true)} disabled={!selectedSlot}>
              Review changes
            </Button>
          </div>
        </div>
      </div>

      {showConfirm && selectedSlot && (
        <ConfirmDialog
          title="Reschedule appointment?"
          confirmLabel="Confirm reschedule"
          isConfirming={updateBooking.isPending}
          onConfirm={handleConfirm}
          onCancel={() => setShowConfirm(false)}
        >
          <p>
            <span className="font-medium text-stone-900">Customer:</span> {booking.customerName}
          </p>
          <p>
            <span className="font-medium text-stone-900">Service:</span> {booking.serviceName}
          </p>
          <p>
            <span className="font-medium text-stone-900">From:</span>{" "}
            {formatInTimeZone(new Date(booking.startTime), timezone, "MMM d, h:mm a")}
          </p>
          <p>
            <span className="font-medium text-stone-900">To:</span>{" "}
            {formatInTimeZone(new Date(selectedSlot), timezone, "MMM d, h:mm a")}
          </p>
          <p>
            <span className="font-medium text-stone-900">Staff:</span> {selectedStaffName}
          </p>
        </ConfirmDialog>
      )}
    </>
  );
}
