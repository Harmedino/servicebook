import { useState } from "react";
import { useMyBusiness, useUpdateBusiness } from "../lib/business";
import { ApiError } from "../lib/apiClient";
import { Toggle } from "./Toggle";
import { Card } from "./ui/Card";
import { buttonClassName } from "./ui/Button";

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
    return <p className="text-sm text-stone-500">Loading…</p>;
  }

  return (
    <Card className="max-w-lg divide-y divide-stone-200">
      <div className="p-5">
        <p className="section-label">Your link</p>
        <p className="mt-1 text-sm text-stone-500">Share this link so customers can book appointments online.</p>
        <code className="mt-3 block truncate rounded-lg bg-stone-50 px-3 py-2.5 text-sm text-stone-700">{bookingUrl}</code>
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={handleCopy} className={buttonClassName("secondary", "sm")}>
            {copied ? "Copied!" : "Copy link"}
          </button>
          <a href={bookingUrl} target="_blank" rel="noreferrer" className={buttonClassName("primary", "sm")}>
            Open page
          </a>
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="section-label">Public booking</p>
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
    </Card>
  );
}
