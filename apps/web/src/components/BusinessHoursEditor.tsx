import { useEffect, useState } from "react";
import type { BusinessHoursEntry } from "@servicebook/types";
import { useBusinessHours, useUpdateBusinessHours } from "../lib/businessHours";
import { DAY_LABELS, WEEK_DISPLAY_ORDER } from "../lib/weekDays";
import { ApiError } from "../lib/apiClient";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";

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
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-stone-500">Loading business hours…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        Couldn&apos;t load business hours. Please refresh the page.
      </p>
    );
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-stone-900">Business hours</h2>
      <p className="mt-1 text-sm text-stone-500">When customers can book appointments with your business.</p>

      <div className="mt-4 divide-y divide-stone-100">
        {WEEK_DISPLAY_ORDER.map((dayOfWeek) => {
          const entry = draft.find((day) => day.dayOfWeek === dayOfWeek);
          if (!entry) {
            return null;
          }
          return (
            <div key={dayOfWeek} className="flex flex-wrap items-center gap-3 py-3">
              <span className="w-28 text-sm font-medium text-stone-700">{DAY_LABELS[dayOfWeek]}</span>
              <label className="flex items-center gap-2 text-sm text-stone-600">
                <input
                  type="checkbox"
                  checked={!entry.isClosed}
                  onChange={(event) => updateDay(dayOfWeek, { isClosed: !event.target.checked })}
                  className="h-4 w-4 rounded border-stone-300 text-brand-600 focus:ring-brand-500/40"
                />
                Open
              </label>
              <input
                type="time"
                value={entry.openTime}
                onChange={(event) => updateDay(dayOfWeek, { openTime: event.target.value })}
                disabled={entry.isClosed}
                className="rounded-lg border border-stone-300 px-2.5 py-1.5 text-sm text-stone-900 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400"
              />
              <span className="text-stone-400">–</span>
              <input
                type="time"
                value={entry.closeTime}
                onChange={(event) => updateDay(dayOfWeek, { closeTime: event.target.value })}
                disabled={entry.isClosed}
                className="rounded-lg border border-stone-300 px-2.5 py-1.5 text-sm text-stone-900 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400"
              />
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

      <button
        type="button"
        onClick={handleSave}
        disabled={updateHours.isPending}
        className="mt-4 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {updateHours.isPending ? "Saving…" : "Save changes"}
      </button>
    </div>
  );
}
