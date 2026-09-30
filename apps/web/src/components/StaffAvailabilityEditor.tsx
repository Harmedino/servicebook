import { useEffect, useState } from "react";
import type { StaffAvailabilityEntry } from "@servicebook/types";
import { useStaffAvailability, useUpdateStaffAvailability } from "../lib/staffAvailability";
import { DAY_LABELS, WEEK_DISPLAY_ORDER } from "../lib/weekDays";
import { timeToMinutes } from "../lib/timeMath";
import { ApiError } from "../lib/apiClient";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";
import { Toggle } from "./Toggle";

const MINUTES_PER_DAY = 24 * 60;

export function StaffAvailabilityEditor({ staffId }: { staffId: string }) {
  const { data, isPending, isError } = useStaffAvailability(staffId);
  const updateAvailability = useUpdateStaffAvailability(staffId);

  const [draft, setDraft] = useState<StaffAvailabilityEntry[] | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (data?.availability) {
      setDraft(data.availability);
    }
  }, [data?.availability]);

  function updateDay(dayOfWeek: number, changes: Partial<StaffAvailabilityEntry>) {
    setSuccessMessage(null);
    setDraft((current) =>
      current?.map((entry) => (entry.dayOfWeek === dayOfWeek ? { ...entry, ...changes } : entry)) ?? current,
    );
  }

  async function handleSave() {
    if (!draft) {
      return;
    }
    setServerError(null);
    setSuccessMessage(null);
    try {
      await updateAvailability.mutateAsync(draft);
      setSuccessMessage("Availability updated.");
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Something went wrong. Please try again.");
    }
  }

  if (isPending || !draft) {
    return <p className="text-sm text-stone-500">Loading availability…</p>;
  }

  if (isError) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        Couldn&apos;t load availability. Please refresh the page.
      </p>
    );
  }

  return (
    <Card className="max-w-lg p-5">
      <h2 className="text-base font-semibold text-stone-900">Availability</h2>
      <p className="mt-1 text-sm text-stone-500">When this staff member can be booked. Must fall within business hours.</p>

      <div className="mt-4 divide-y divide-stone-100">
        {WEEK_DISPLAY_ORDER.map((dayOfWeek) => {
          const entry = draft.find((day) => day.dayOfWeek === dayOfWeek);
          if (!entry) {
            return null;
          }
          const startMinutes = timeToMinutes(entry.startTime);
          const endMinutes = timeToMinutes(entry.endTime);
          const barLeft = (Math.min(startMinutes, endMinutes) / MINUTES_PER_DAY) * 100;
          const barWidth = (Math.max(0, endMinutes - startMinutes) / MINUTES_PER_DAY) * 100;

          return (
            <div key={dayOfWeek} className="py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${entry.isOff ? "bg-stone-300" : "bg-green-500"}`} aria-hidden="true" />
                  <span className="text-sm font-semibold text-stone-900">{DAY_LABELS[dayOfWeek]}</span>
                </div>
                <Toggle
                  checked={!entry.isOff}
                  onChange={(checked) => updateDay(dayOfWeek, { isOff: !checked })}
                  label={`${DAY_LABELS[dayOfWeek]} available`}
                />
              </div>

              {entry.isOff ? (
                <p className="mt-2 pl-[1.125rem] text-sm text-stone-400">Unavailable</p>
              ) : (
                <div className="mt-3 pl-[1.125rem]">
                  <div className="relative h-1.5 rounded-full bg-stone-100">
                    <div
                      className="absolute h-1.5 rounded-full bg-brand-500"
                      style={{ left: `${barLeft}%`, width: `${barWidth}%` }}
                    />
                  </div>
                  <div className="mt-2.5 flex items-center gap-2">
                    <input
                      type="time"
                      value={entry.startTime}
                      onChange={(event) => updateDay(dayOfWeek, { startTime: event.target.value })}
                      className="rounded-lg border border-stone-300 px-2.5 py-1.5 text-sm text-stone-900 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                    />
                    <span className="text-stone-400">–</span>
                    <input
                      type="time"
                      value={entry.endTime}
                      onChange={(event) => updateDay(dayOfWeek, { endTime: event.target.value })}
                      className="rounded-lg border border-stone-300 px-2.5 py-1.5 text-sm text-stone-900 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {serverError && (
        <p role="alert" className="animate-fade-in-up mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {serverError}
        </p>
      )}
      {successMessage && (
        <p role="status" className="animate-fade-in-up mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          {successMessage}
        </p>
      )}

      <Button className="mt-4" isLoading={updateAvailability.isPending} onClick={handleSave}>
        {updateAvailability.isPending ? "Saving…" : "Save availability"}
      </Button>
    </Card>
  );
}
