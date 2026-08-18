import { useEffect, useState } from "react";
import type { BusinessHoursEntry } from "@servicebook/types";
import { useBusinessHours, useUpdateBusinessHours } from "../lib/businessHours";
import { DAY_LABELS, WEEK_DISPLAY_ORDER } from "../lib/weekDays";
import { timeToMinutes } from "../lib/timeMath";
import { ApiError } from "../lib/apiClient";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";
import { Toggle } from "./Toggle";

const MINUTES_PER_DAY = 24 * 60;

export function BusinessHoursEditor() {
  const { data, isPending, isError } = useBusinessHours();
  const updateHours = useUpdateBusinessHours();

  const [draft, setDraft] = useState<BusinessHoursEntry[] | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (data?.hours) {
      setDraft(data.hours);
    }
  }, [data?.hours]);

  function updateDay(dayOfWeek: number, changes: Partial<BusinessHoursEntry>) {
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
      await updateHours.mutateAsync(draft);
      setSuccessMessage("Business hours updated.");
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Something went wrong. Please try again.");
    }
  }

  if (isPending || !draft) {
    return <p className="text-sm text-stone-500">Loading business hours…</p>;
  }

  if (isError) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        Couldn&apos;t load business hours. Please refresh the page.
      </p>
    );
  }

  return (
    <Card className="max-w-lg p-5">
      <div className="divide-y divide-stone-100">
        {WEEK_DISPLAY_ORDER.map((dayOfWeek) => {
          const entry = draft.find((day) => day.dayOfWeek === dayOfWeek);
          if (!entry) {
            return null;
          }
          const openMinutes = timeToMinutes(entry.openTime);
          const closeMinutes = timeToMinutes(entry.closeTime);
          const barLeft = (Math.min(openMinutes, closeMinutes) / MINUTES_PER_DAY) * 100;
          const barWidth = (Math.max(0, closeMinutes - openMinutes) / MINUTES_PER_DAY) * 100;

          return (
            <div key={dayOfWeek} className="py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${entry.isClosed ? "bg-stone-300" : "bg-green-500"}`} aria-hidden="true" />
                  <span className="text-sm font-semibold text-stone-900">{DAY_LABELS[dayOfWeek]}</span>
                </div>
                <Toggle
                  checked={!entry.isClosed}
                  onChange={(checked) => updateDay(dayOfWeek, { isClosed: !checked })}
                  label={`${DAY_LABELS[dayOfWeek]} open`}
                />
              </div>

              {entry.isClosed ? (
                <p className="mt-2 pl-[1.125rem] text-sm text-stone-400">Closed</p>
              ) : (
                <div className="mt-3 pl-[1.125rem]">
                  <div className="relative h-1.5 rounded-full bg-stone-100">
                    <div
                      className="absolute h-1.5 rounded-full bg-gradient-to-r from-brand-500 to-accent-500"
                      style={{ left: `${barLeft}%`, width: `${barWidth}%` }}
                    />
                  </div>
                  <div className="mt-2.5 flex items-center gap-2">
                    <input
                      type="time"
                      value={entry.openTime}
                      onChange={(event) => updateDay(dayOfWeek, { openTime: event.target.value })}
                      className="rounded-lg border border-stone-300 px-2.5 py-1.5 text-sm text-stone-900 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                    />
                    <span className="text-stone-400">–</span>
                    <input
                      type="time"
                      value={entry.closeTime}
                      onChange={(event) => updateDay(dayOfWeek, { closeTime: event.target.value })}
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

      <Button className="mt-4" isLoading={updateHours.isPending} onClick={handleSave}>
        {updateHours.isPending ? "Saving…" : "Save changes"}
      </Button>
    </Card>
  );
}
