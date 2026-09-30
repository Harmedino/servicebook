import { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { Check, Minus, Plus, Sparkles } from "lucide-react";
import { MarketingLayout } from "../../components/marketing/MarketingLayout";
import { CtaBand, Reveal, SectionHeading } from "../../components/marketing/primitives";

type Billing = "monthly" | "yearly";

interface Plan {
  name: string;
  tagline: string;
  monthly: number;
  yearly: number;
  staff: string;
  highlights: string[];
  featured?: boolean;
}

const PLANS: Plan[] = [
  {
    name: "Starter",
    tagline: "For solo professionals getting off WhatsApp.",
    monthly: 0,
    yearly: 0,
    staff: "1 staff member",
    highlights: ["Booking page and join link", "Calendar and client list", "Unlimited bookings", "QR codes for your counter"],
  },
  {
    name: "Growth",
    tagline: "For small teams that are busy most days.",
    monthly: 9500,
    yearly: 7900,
    staff: "Up to 5 staff",
    highlights: ["Everything in Starter", "Staff schedules and photos", "Insights and revenue chart", "Email confirmations and reminders"],
    featured: true,
  },
  {
    name: "Business",
    tagline: "For established studios, spas and clinics.",
    monthly: 19500,
    yearly: 16250,
    staff: "Unlimited staff",
    highlights: ["Everything in Growth", "Priority WhatsApp support", "Help moving your client list over", "First access to new features"],
  },
];

const COMPARISON: { label: string; values: [string | boolean, string | boolean, string | boolean] }[] = [
  { label: "Staff members", values: ["1", "Up to 5", "Unlimited"] },
  { label: "Bookings", values: ["Unlimited", "Unlimited", "Unlimited"] },
  { label: "Online booking page", values: [true, true, true] },
  { label: "Client join link and QR codes", values: [true, true, true] },
  { label: "Day, week and month calendar", values: [true, true, true] },
  { label: "Client list with history and notes", values: [true, true, true] },
  { label: "Logo, cover and service photos", values: [true, true, true] },
  { label: "Staff availability and photos", values: [false, true, true] },
  { label: "Insights and revenue chart", values: [false, true, true] },
  { label: "Email confirmations and reminders", values: [false, true, true] },
  { label: "Priority support", values: [false, false, true] },
];

const FAQ = [
  {
    q: "Is it really free right now?",
    a: "Yes. While ServiceBook is in early access every account gets every feature, whatever the plan says. When paid plans start you'll get plenty of notice, and the Starter plan stays free.",
  },
  {
    q: "Do my customers need to download an app or create an account?",
    a: "No. They open your link in any browser, pick a service and a time, and enter their name and phone number. That's it.",
  },
  {
    q: "How do I get my existing customers in?",
    a: "Send your join link on WhatsApp or put the QR code on your counter. Customers add their own details. You can also add anyone by hand in a few seconds.",
  },
  {
    q: "Can two people book the same slot?",
    a: "No. Available times are worked out from your hours, each staff member's hours and every existing booking, and a slot is checked again at the moment someone books it.",
  },
  {
    q: "Can I use a currency other than Naira?",
    a: "Yes. Pick your currency and time zone when you set up the business, including USD, GBP, EUR, GHS, KES and ZAR.",
  },
  {
    q: "Can I stop taking online bookings for a while?",
    a: "Yes. One switch in Settings pauses your booking page; everything else keeps working.",
  },
];

function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString("en-NG")}`;
}

function Cell({ value }: { value: string | boolean }) {
  if (value === true) return <Check className="mx-auto h-4 w-4 text-brand-600" strokeWidth={3} aria-label="Included" />;
  if (value === false) return <Minus className="mx-auto h-4 w-4 text-stone-300" aria-label="Not included" />;
  return <span className="text-sm font-medium text-stone-800">{value}</span>;
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-stone-200">
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="flex w-full items-center justify-between gap-6 py-5 text-left">
        <span className="text-base font-semibold text-stone-900 sm:text-lg">{q}</span>
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-stone-300 text-stone-600 transition-transform ${open ? "rotate-45" : ""}`}>
          <Plus className="h-4 w-4" aria-hidden="true" />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
            <p className="max-w-2xl pb-5 text-[15px] leading-relaxed text-stone-600">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function PricingPage() {
  const [billing, setBilling] = useState<Billing>("monthly");

  return (
    <MarketingLayout>
      <section className="relative pb-10">
        <div className="absolute inset-x-0 top-0 h-[430px] bg-ink-grid sm:h-[400px]" aria-hidden="true" />
        <div className="relative mx-auto max-w-6xl px-4 pt-14 sm:px-6 sm:pt-20 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-highlight">Pricing</p>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-6xl">Simple pricing, in Naira.</h1>
            <p className="mx-auto mt-5 max-w-lg text-base text-white/60 sm:text-lg">Start free. Upgrade when your team grows. Cancel whenever you like.</p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-highlight/15 px-4 py-2 text-sm font-medium text-highlight">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Early access: every feature is free for everyone right now
            </div>
          </motion.div>

          <div className="mt-8 flex justify-center">
            <div className="relative grid grid-cols-2 rounded-full bg-white/10 p-1 text-sm font-medium">
              {(["monthly", "yearly"] as Billing[]).map((option) => (
                <button key={option} type="button" onClick={() => setBilling(option)} className={`relative rounded-full px-5 py-2 transition-colors ${billing === option ? "text-ink" : "text-white/70"}`}>
                  {billing === option && <motion.span layoutId="billing-pill" className="absolute inset-0 rounded-full bg-white" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
                  <span className="relative">{option === "monthly" ? "Monthly" : "Yearly · save 17%"}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {PLANS.map((plan, index) => {
              const price = billing === "monthly" ? plan.monthly : plan.yearly;
              return (
                <Reveal key={plan.name} delay={index * 0.06}>
                  <div
                    className={`relative flex h-full flex-col rounded-3xl p-6 sm:p-7 ${
                      plan.featured ? "bg-ink text-white ring-1 ring-white/10 lg:-mt-3 lg:pb-10" : "border border-stone-200 bg-surface"
                    }`}
                  >
                    {plan.featured && (
                      <span className="absolute right-5 top-5 rounded-full bg-highlight px-2.5 py-1 text-[11px] font-semibold text-ink">Most popular</span>
                    )}
                    <h2 className={`text-lg font-semibold ${plan.featured ? "text-white" : "text-stone-900"}`}>{plan.name}</h2>
                    <p className={`mt-1 text-sm ${plan.featured ? "text-white/60" : "text-stone-500"}`}>{plan.tagline}</p>
                    <div className="mt-6 flex items-baseline gap-1.5">
                      <AnimatePresence mode="popLayout" initial={false}>
                        <motion.span
                          key={`${plan.name}-${price}`}
                          initial={{ y: -12, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          exit={{ y: 12, opacity: 0 }}
                          className={`font-display text-4xl font-semibold tracking-tight sm:text-5xl ${plan.featured ? "text-white" : "text-stone-900"}`}
                        >
                          {price === 0 ? "Free" : formatNaira(price)}
                        </motion.span>
                      </AnimatePresence>
                      {price > 0 && <span className={`text-sm ${plan.featured ? "text-white/50" : "text-stone-500"}`}>/ month</span>}
                    </div>
                    <p className={`mt-1 h-5 text-xs ${plan.featured ? "text-white/45" : "text-stone-400"}`}>
                      {price > 0 && billing === "yearly" ? `Billed ${formatNaira(price * 12)} yearly` : price === 0 ? "Forever" : "Billed monthly"}
                    </p>
                    <p className={`mt-6 text-sm font-semibold ${plan.featured ? "text-highlight" : "text-brand-700"}`}>{plan.staff}</p>
                    <ul className="mt-4 flex-1 space-y-3">
                      {plan.highlights.map((item) => (
                        <li key={item} className={`flex items-start gap-2.5 text-sm ${plan.featured ? "text-white/80" : "text-stone-700"}`}>
                          <Check className={`mt-0.5 h-4 w-4 shrink-0 ${plan.featured ? "text-highlight" : "text-brand-600"}`} strokeWidth={3} aria-hidden="true" />
                          {item}
                        </li>
                      ))}
                    </ul>
                    <Link
                      to="/register"
                      className={`mt-8 inline-flex h-12 items-center justify-center rounded-full text-[15px] font-semibold transition ${
                        plan.featured ? "bg-highlight text-ink hover:bg-highlight-soft" : "bg-ink text-white hover:bg-ink-700 dark:bg-stone-900 dark:text-stone-50"
                      }`}
                    >
                      {price === 0 ? "Start free" : `Start with ${plan.name}`}
                    </Link>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <SectionHeading eyebrow="Compare plans" title="What's in each plan." />
        <div className="mt-10 overflow-x-auto rounded-3xl border border-stone-200 bg-surface">
          <table className="w-full min-w-[560px] text-left">
            <thead>
              <tr className="border-b border-stone-200">
                <th className="px-5 py-4 text-sm font-medium text-stone-500">Feature</th>
                {PLANS.map((plan) => (
                  <th key={plan.name} className="px-3 py-4 text-center text-sm font-semibold text-stone-900">
                    {plan.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {COMPARISON.map((row) => (
                <tr key={row.label}>
                  <td className="px-5 py-3.5 text-sm text-stone-700">{row.label}</td>
                  {row.values.map((value, index) => (
                    <td key={index} className="px-3 py-3.5 text-center">
                      <Cell value={value} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="faq" className="scroll-mt-20 border-t border-stone-200/70">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
          <SectionHeading eyebrow="FAQ" title="Questions, answered." description="Anything else? Try the demo; it's the fastest way to see how it works." />
          <div className="border-t border-stone-200">
            {FAQ.map((item) => (
              <FaqItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </section>

      <CtaBand title="Start free today." description="No card needed. Set up your business in about five minutes." />
    </MarketingLayout>
  );
}
