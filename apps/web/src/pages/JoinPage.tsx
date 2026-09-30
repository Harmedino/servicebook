import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { CalendarPlus, Check, Loader2, MapPin, MessageCircle, UserPlus } from "lucide-react";
import { usePublicBusiness, useCustomerSignup } from "../lib/publicBooking";
import { ApiError } from "../lib/apiClient";
import { imageSrc } from "../lib/images";
import { LogoMark } from "../components/Logo";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FieldErrors {
  name?: string;
  phone?: string;
  email?: string;
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between text-sm font-medium text-stone-800">
        {label}
        {hint && <span className="text-xs font-normal text-stone-400">{hint}</span>}
      </span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}

const inputClass = (error?: string) =>
  `mt-1.5 w-full rounded-xl border bg-surface px-3.5 py-3 text-base text-stone-900 placeholder:text-stone-400 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/40 ${
    error ? "border-red-400" : "border-stone-300 focus:border-brand-500"
  }`;

/** Public page where a customer adds themselves to a business's client list. */
export function JoinPage() {
  const { businessSlug = "" } = useParams();
  const { data, isPending, isError } = usePublicBusiness(businessSlug);
  const signup = useCustomerSignup(businessSlug);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  const business = data?.business;

  function validate(): boolean {
    const next: FieldErrors = {};
    if (!name.trim()) next.name = "Please enter your name";
    if (phone.replace(/[^\d]/g, "").length < 7) next.phone = "Please enter a valid phone number";
    if (email.trim() && !EMAIL_PATTERN.test(email.trim())) next.email = "That email doesn't look right";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!validate()) return;
    signup.mutate({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  }

  if (isPending) {
    return (
      <div className="min-h-screen bg-stone-50">
        <div className="h-40 bg-ink-grid sm:h-48" />
        <div className="mx-auto -mt-16 max-w-md px-4">
          <div className="skeleton-shimmer h-[520px] rounded-3xl bg-stone-200/70" />
        </div>
      </div>
    );
  }

  if (isError || !business) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
        <div className="max-w-sm rounded-3xl border border-stone-200 bg-surface p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-100 text-stone-400">
            <UserPlus className="h-6 w-6" aria-hidden="true" />
          </div>
          <h1 className="mt-4 text-lg font-bold text-stone-900">This link isn&apos;t working</h1>
          <p className="mt-2 text-sm text-stone-500">It may be out of date. Please ask the business to send you their latest link.</p>
        </div>
      </div>
    );
  }

  const done = signup.isSuccess;
  const whatsapp = business.socials?.whatsapp ?? business.phone?.replace(/[^\d]/g, "");
  const serverError = signup.isError ? (signup.error instanceof ApiError ? signup.error.message : "Something went wrong. Please try again.") : null;

  return (
    <div className="min-h-screen bg-stone-50 pb-12">
      <header className="relative h-40 overflow-hidden bg-ink-grid sm:h-48">
        {business.coverImageUrl && (
          <>
            <img src={imageSrc(business.coverImageUrl)} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-ink/55" aria-hidden="true" />
          </>
        )}
      </header>

      <main className="relative mx-auto -mt-20 max-w-md px-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden rounded-3xl border border-stone-200 bg-surface shadow-[0_24px_60px_-28px_rgb(12_26_20/0.35)]"
        >
          <div className="flex items-center gap-4 border-b border-stone-100 p-5 sm:p-6">
            {business.logoUrl ? (
              <img src={imageSrc(business.logoUrl)} alt="" className="h-14 w-14 shrink-0 rounded-2xl object-cover" />
            ) : (
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-ink text-xl font-bold text-highlight">
                {business.name.charAt(0).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-lg font-bold text-stone-900">{business.name}</p>
              {business.address && (
                <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-stone-500">
                  <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">{business.address}</span>
                </p>
              )}
            </div>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            {done ? (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="p-6 text-center sm:p-8">
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 16, delay: 0.1 }}
                  className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-600 text-white"
                >
                  <Check className="h-8 w-8" strokeWidth={3} aria-hidden="true" />
                </motion.span>
                <h1 className="mt-5 text-2xl font-semibold text-stone-900">You&apos;re on the list, {name.trim().split(/\s+/)[0]}!</h1>
                <p className="mt-2 text-sm text-stone-500">{business.name} now has your details and can reach you about appointments.</p>
                <div className="mt-7 grid gap-2.5">
                  {signup.data?.bookingEnabled && (
                    <Link
                      to={`/book/${business.slug}`}
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-ink text-[15px] font-semibold text-white transition hover:bg-ink-700 dark:bg-highlight dark:text-ink"
                    >
                      <CalendarPlus className="h-4 w-4" aria-hidden="true" /> Book an appointment
                    </Link>
                  )}
                  {whatsapp && (
                    <a
                      href={`https://wa.me/${whatsapp}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-stone-300 text-[15px] font-medium text-stone-800 transition hover:bg-stone-50"
                    >
                      <MessageCircle className="h-4 w-4" aria-hidden="true" /> Message on WhatsApp
                    </a>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.form key="form" onSubmit={handleSubmit} noValidate exit={{ opacity: 0 }} className="space-y-4 p-5 sm:p-6">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Join our client list</h1>
                  <p className="mt-1 text-sm text-stone-500">Takes 20 seconds. We&apos;ll only use this to reach you about your appointments.</p>
                </div>
                <Field label="Full name" error={errors.name}>
                  <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="e.g. Chioma Okafor" className={inputClass(errors.name)} />
                </Field>
                <Field label="Phone number" error={errors.phone}>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="e.g. 0803 555 0100"
                    className={inputClass(errors.phone)}
                  />
                </Field>
                <Field label="Email" hint="Optional" error={errors.email}>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    className={inputClass(errors.email)}
                  />
                </Field>
                <Field label="Anything we should know?" hint="Optional">
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    maxLength={500}
                    placeholder="Allergies, preferred stylist, best time to call…"
                    className={`${inputClass()} resize-none`}
                  />
                </Field>
                {serverError && <p className="rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700">{serverError}</p>}
                <button
                  type="submit"
                  disabled={signup.isPending}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-ink text-[15px] font-semibold text-white transition hover:bg-ink-700 disabled:opacity-70 dark:bg-highlight dark:text-ink"
                >
                  {signup.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                  {signup.isPending ? "Joining…" : "Join the list"}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>

        <Link to="/" className="mt-8 flex items-center justify-center gap-2 text-xs text-stone-400 transition hover:text-stone-600">
          <LogoMark className="h-5 w-5" /> Powered by ServiceBook
        </Link>
      </main>
    </div>
  );
}
