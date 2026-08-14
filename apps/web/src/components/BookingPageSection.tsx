import { useState } from "react";
import { useMyBusiness, useUpdateBusiness } from "../lib/business";
import { ApiError } from "../lib/apiClient";
import { Toggle } from "./Toggle";

export function BookingPageSection() {
  const { data, isPending } = useMyBusiness();
  const updateBusiness = useUpdateBusiness();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const business = data?.business;
  const bookingUrl = business ? `${window.location.origin}/book/${business.slug}` : "";

  async function handleCopy() {
    if (!bookingUrl) {
      return;
    }
    try {
      await navigator.clipboard.writeText(bookingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy the link. Please copy it manually.");
    }
  }

  async function handleToggle(enabled: boolean) {
    setError(null);
    try {
      await updateBusiness.mutateAsync({ isPublicBookingEnabled: enabled });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't update this setting. Please try again.");
    }
  }

  if (isPending || !business) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-stone-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-900">Your booking page</h2>
        <p className="mt-1 text-sm text-stone-500">Share this link so customers can book appointments online.</p>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <code className="flex-1 truncate rounded-lg bg-stone-50 px-3 py-2.5 text-sm text-stone-700">{bookingUrl}</code>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100"
            >
              {copied ? "Copied!" : "Copy link"}
            </button>
            <a
              href={bookingUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
            >
              Open page
            </a>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-stone-900">Public booking</h2>
            <p className="mt-1 text-sm text-stone-500">
              {business.isPublicBookingEnabled
                ? "Customers can currently book appointments through your public page."
                : "Your public page is visible, but customers can't submit new bookings right now."}
            </p>
          </div>
          <Toggle
            checked={business.isPublicBookingEnabled}
            onChange={handleToggle}
            disabled={updateBusiness.isPending}
            label="Public booking"
          />
        </div>

        {error && (
          <p role="alert" className="animate-fade-in-up mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
