import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { BellRing, Check, Loader2 } from "lucide-react";
import type { PublicWaitlistInput, PublicWaitlistResponse } from "@servicebook/types";
import { apiRequest, ApiError } from "../../lib/apiClient";

interface WaitlistJoinProps {
  slug: string;
  serviceId: string;
  staffId?: string;
  date: string;
  dayLabel: string;
  known?: { name: string; phone: string; email?: string } | null;
}

const input =
  "w-full rounded-xl border border-stone-300 bg-surface px-3.5 py-2.5 text-base text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 sm:text-sm";

/** Shown on a fully booked day: leave a name and number to hear if a spot opens. */
export function WaitlistJoin({ slug, serviceId, staffId, date, dayLabel, known }: WaitlistJoinProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(known?.name ?? "");
  const [phone, setPhone] = useState(known?.phone ?? "");
  const [error, setError] = useState<string | null>(null);
  const join = useMutation({
    mutationFn: (body: PublicWaitlistInput) =>
      apiRequest<PublicWaitlistResponse>(`/api/public/businesses/${slug}/waitlist`, { method: "POST", body, auth: false }),
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return setError("Please enter your name");
    if (phone.replace(/[^\d]/g, "").length < 7) return setError("Please enter a valid phone number");
    setError(null);
    join.mutate(
      { serviceId, staffId, date, customer: { name: name.trim(), phone: phone.trim(), email: known?.email } },
      { onError: (err) => setError(err instanceof ApiError ? err.message : "Couldn't join. Please try again.") },
    );
  }

  if (join.isSuccess) {
    return (
      <div className="mt-3 flex items-start gap-3 rounded-2xl bg-brand-50 p-4 text-sm text-brand-900">
        <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p>
          You&apos;re on the waitlist for {dayLabel}
          {join.data.position > 1 ? ` (${join.data.position} people waiting)` : ""}. If a spot opens, the salon will message you on {phone}.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-5">
      <p className="font-semibold text-stone-800">Fully booked on {dayLabel}</p>
      <p className="mt-1 text-sm text-stone-500">Try another day above, or join the waitlist and hear if someone cancels.</p>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-white hover:bg-ink-700 dark:bg-highlight dark:text-ink"
        >
          <BellRing className="h-4 w-4" aria-hidden="true" /> Join the waitlist
        </button>
      ) : (
        <form onSubmit={submit} noValidate className="mt-4 space-y-2.5">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" aria-label="Your name" autoComplete="name" className={input} />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" aria-label="Phone number" type="tel" inputMode="tel" autoComplete="tel" className={input} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={join.isPending}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-ink text-sm font-semibold text-white hover:bg-ink-700 disabled:opacity-70 dark:bg-highlight dark:text-ink"
          >
            {join.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} Add me to the waitlist
          </button>
        </form>
      )}
    </div>
  );
}
