import { Link } from "react-router-dom";
import { useState } from "react";
import { useMyBusiness, useUpdateBusiness } from "../lib/business";
import { BRAND_PRESETS, inkOn } from "../lib/brand";
import { ApiError } from "../lib/apiClient";
import { Toggle } from "./Toggle";
import { Card } from "./ui/Card";
import { buttonClassName } from "./ui/Button";

export function BookingPageSection() {
  const { data, isPending } = useMyBusiness();
  const updateBusiness = useUpdateBusiness();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // While dragging the custom picker, preview here and save once on release.
  const [draftColor, setDraftColor] = useState<string | null>(null);

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

  const shownColor = draftColor ?? business.brandColor ?? BRAND_PRESETS[0];

  async function saveColor(color: string) {
    setError(null);
    try {
      await updateBusiness.mutateAsync({ brandColor: color });
    } catch {
      setError("Couldn't save the colour. Please try again.");
    }
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
          <Link to="/poster" className={buttonClassName("secondary", "sm")}>
            Print a poster
          </Link>
        </div>
      </div>

      <div className="p-5">
        <p className="section-label">Your colour</p>
        <p className="mt-1 text-sm text-stone-500">Used on your booking page, your customers&apos; pages and your printed poster.</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {BRAND_PRESETS.map((color) => {
            const active = (business.brandColor ?? BRAND_PRESETS[0]).toLowerCase() === color;
            return (
              <button
                key={color}
                type="button"
                onClick={() => void saveColor(color === BRAND_PRESETS[0] ? "" : color)}
                disabled={updateBusiness.isPending}
                aria-label={`Use ${color}`}
                aria-pressed={active}
                className={`h-9 w-9 rounded-full ring-offset-2 ring-offset-surface transition ${active ? "ring-2 ring-stone-900" : "hover:scale-110"}`}
                style={{ backgroundColor: color }}
              />
            );
          })}
          <label className="relative inline-flex h-9 cursor-pointer items-center gap-2 rounded-full border border-stone-300 px-3 text-sm font-medium text-stone-700 hover:bg-stone-50">
            <span className="h-4 w-4 rounded-full border border-stone-300" style={{ backgroundColor: shownColor }} />
            Custom
            <input
              type="color"
              value={shownColor}
              onChange={(event) => setDraftColor(event.target.value)}
              onBlur={() => {
                if (draftColor && draftColor !== business.brandColor) void saveColor(draftColor);
                setDraftColor(null);
              }}
              className="absolute inset-0 cursor-pointer opacity-0"
              aria-label="Pick any colour"
            />
          </label>
        </div>
        <div
          className="mt-4 flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold"
          style={{ backgroundColor: shownColor, color: inkOn(shownColor) }}
        >
          {business.name}
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs">Book now</span>
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
