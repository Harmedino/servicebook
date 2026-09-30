import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { MarketingLayout } from "../../components/marketing/MarketingLayout";
import { CtaBand } from "../../components/marketing/primitives";
import { DEMO_BOOKING_PATH, DEMO_JOIN_PATH, ownerDemoPath } from "../../lib/demo";

const SCREENS = [
  {
    key: "book",
    title: "Book a haircut",
    body: "Pick Signature Haircut, leave “Any available” on and choose a time. The salon messages you as soon as it's booked; ask it anything.",
    src: `${DEMO_BOOKING_PATH}?embed=1`,
  },
  {
    key: "chat",
    title: "Ask before you book",
    body: "Tap “Chat with us”, choose WhatsApp or Instagram and leave a message. The salon gets your details before you've even opened the app.",
    src: `${DEMO_BOOKING_PATH}?embed=1&chat=1`,
  },
  {
    key: "join",
    title: "Join the client list",
    body: "What a customer sees after scanning the QR code on the counter. Twenty seconds, no account.",
    src: `${DEMO_JOIN_PATH}?embed=1`,
  },
] as const;

const OWNER_LINKS = [
  { label: "Dashboard", note: "Today, revenue, what needs attention", next: "/dashboard" },
  { label: "Inbox", note: "Your messages and chat requests", next: "/inbox?tab=messages" },
  { label: "Calendar", note: "The whole team's day", next: "/calendar" },
  { label: "Clients", note: "Newest sign-ups first", next: "/customers?sort=newest" },
];

/** Interactive demo: the real booking pages running inside a phone, plus shortcuts into the owner's side. */
export function DemoPage() {
  const [screen, setScreen] = useState<(typeof SCREENS)[number]["key"]>("book");
  const [loaded, setLoaded] = useState<string | null>(null);
  const active = SCREENS.find((entry) => entry.key === screen) ?? SCREENS[0];

  return (
    <MarketingLayout>
      <section className="bg-ink">
        <div className="mx-auto max-w-6xl px-4 pb-14 pt-12 sm:px-6 sm:pb-16 sm:pt-16 lg:px-8">
          <h1 className="max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-6xl">
            Try it as a customer. Then open the owner&apos;s side.
          </h1>
          <p className="mt-5 max-w-xl text-base text-white/65 sm:text-lg">
            Glow Studio Lekki is a sample salon with a month of bookings. Nothing you do here reaches a real person, and it resets every day.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-16 lg:px-8 lg:py-16">
        <div>
          <p className="text-sm font-medium text-stone-500">As a customer</p>
          <ol className="mt-4 space-y-2">
            {SCREENS.map((entry, index) => {
              const isActive = entry.key === screen;
              return (
                <li key={entry.key}>
                  <button
                    type="button"
                    onClick={() => setScreen(entry.key)}
                    aria-pressed={isActive}
                    className={`group flex w-full gap-4 rounded-2xl border p-4 text-left transition-colors sm:p-5 ${
                      isActive ? "border-stone-900 bg-surface dark:border-stone-500" : "border-transparent hover:bg-surface"
                    }`}
                  >
                    <span className={`font-display text-2xl font-semibold ${isActive ? "text-stone-900" : "text-stone-300"}`}>{index + 1}</span>
                    <span>
                      <span className="block text-lg font-semibold text-stone-900">{entry.title}</span>
                      <span className="mt-1 block text-[15px] leading-relaxed text-stone-600">{entry.body}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          <div className="mt-10 border-t border-stone-200 pt-8">
            <p className="text-sm font-medium text-stone-500">Then as the owner</p>
            <p className="mt-2 max-w-md text-[15px] text-stone-600">
              Everything you just did as a customer is waiting on the other side: the booking, your messages, your details.
            </p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {OWNER_LINKS.map((link) => (
                <Link
                  key={link.label}
                  to={ownerDemoPath(link.next)}
                  className="group flex items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-surface px-4 py-3.5 transition-colors hover:border-stone-400"
                >
                  <span>
                    <span className="block font-semibold text-stone-900">{link.label}</span>
                    <span className="block text-sm text-stone-500">{link.note}</span>
                  </span>
                  <ArrowUpRight className="h-5 w-5 shrink-0 text-stone-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-stone-700" aria-hidden="true" />
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="order-first lg:order-none">
          <div className="lg:sticky lg:top-24">
            <div className="relative mx-auto w-full max-w-[390px] rounded-[2.6rem] bg-[#0b0f0d] p-2 shadow-[var(--shadow-screen)] ring-1 ring-white/10">
              <div className="relative h-[min(760px,74svh)] overflow-hidden rounded-[2.1rem] bg-stone-50">
                {loaded !== active.src && <div className="skeleton-shimmer absolute inset-0 bg-stone-100" aria-hidden="true" />}
                <motion.iframe
                  key={active.src}
                  src={active.src}
                  title={`Demo: ${active.title}`}
                  onLoad={() => setLoaded(active.src)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: loaded === active.src ? 1 : 0 }}
                  transition={{ duration: 0.3 }}
                  className="h-full w-full border-0"
                />
              </div>
            </div>
            <p className="mt-3 text-center text-xs text-stone-500">
              This is the live booking page, scaled to a phone.{" "}
              <a href={active.src.replace("embed=1&", "").replace("?embed=1", "")} className="font-medium text-stone-700 underline-offset-2 hover:underline">
                Open it full screen
              </a>
            </p>
          </div>
        </div>
      </section>

      <CtaBand title="Ready to set up your own?" />
    </MarketingLayout>
  );
}
