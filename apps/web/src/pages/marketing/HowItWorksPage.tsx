import { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { Plus } from "lucide-react";
import { MarketingLayout } from "../../components/marketing/MarketingLayout";
import { CtaBand, Reveal } from "../../components/marketing/primitives";

const OWNER_STEPS = [
  {
    title: "Create your business",
    body: "Your business name, opening hours, time zone and currency. It takes about two minutes, and you can change any of it later.",
  },
  {
    title: "Add your services and your team",
    body: "Each service gets a price and a duration. Add your staff and their working hours, or just yourself: if you take appointments, customers who don't pick anyone are booked with you.",
  },
  {
    title: "Share your link",
    body: "Put it in your Instagram bio and WhatsApp status, send it to your broadcast list, and print the QR code for the counter.",
  },
  {
    title: "Run the day from one place",
    body: "New bookings land on the calendar. Confirm them, move them, mark them done. Customer messages and chat requests wait in your Inbox.",
  },
];

const CUSTOMER_STEPS = [
  { title: "Opens your link", body: "From your bio, a WhatsApp message or the QR code. No app to download and no account to create." },
  { title: "Picks a service and a time", body: "Only times that are really free are shown. Choosing a stylist is optional." },
  { title: "Gets a reply straight away", body: "The booking comes with its own chat, so they can ask about parking, running late or bringing a reference photo." },
  { title: "Pays you at the appointment", body: "No card is needed to book. They pay in person, cash, card or transfer, the way they already do." },
];

const FAQ = [
  {
    q: "What does it cost?",
    a: "Nothing while ServiceBook is in early access: every account gets every feature. When paid plans start you'll get plenty of notice, and there will always be a free plan.",
  },
  {
    q: "Do my customers need to download an app or create an account?",
    a: "No. They open your link in any browser, pick a service and a time, and enter their name and phone number. That's it.",
  },
  {
    q: "Do customers pay online?",
    a: "Not yet. They book online and pay you at the appointment. Online deposits are on the roadmap.",
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

function Steps({ steps }: { steps: { title: string; body: string }[] }) {
  return (
    <ol className="mt-8 space-y-0">
      {steps.map((step, index) => (
        <Reveal key={step.title} delay={index * 0.05}>
          <li className="grid grid-cols-[3rem_1fr] gap-4 border-t border-stone-200 py-6 sm:grid-cols-[4rem_1fr_1.4fr] sm:gap-8">
            <span className="font-display text-3xl font-semibold text-stone-300">{index + 1}</span>
            <h3 className="text-lg font-semibold text-stone-900 sm:text-xl">{step.title}</h3>
            <p className="col-start-2 text-[15px] leading-relaxed text-stone-600 sm:col-start-3">{step.body}</p>
          </li>
        </Reveal>
      ))}
    </ol>
  );
}

export function HowItWorksPage() {
  return (
    <MarketingLayout>
      <section className="bg-ink">
        <div className="mx-auto max-w-6xl px-4 pb-12 pt-12 sm:px-6 sm:pb-16 sm:pt-16 lg:px-8">
          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-6xl">How it works</h1>
          <p className="mt-4 max-w-xl text-base text-white/65 sm:text-lg">
            From signing up to your first online booking, and what your customers go through on the other side.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <h2 className="text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">For you</h2>
        <Steps steps={OWNER_STEPS} />
      </section>

      <section className="bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <h2 className="text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">For your customers</h2>
          <Steps steps={CUSTOMER_STEPS} />
          <p className="mt-6 text-sm text-stone-500">
            Want to see it from their side?{" "}
            <Link to="/demo" className="font-semibold text-stone-900 underline decoration-stone-300 underline-offset-4 hover:decoration-stone-900">
              Book at the demo salon
            </Link>
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="rounded-3xl border border-stone-200 bg-surface p-6 sm:p-10">
          <h2 className="text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">What it costs</h2>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-stone-600 sm:text-lg">
            Nothing, while we&apos;re in early access. Every account gets every feature. When paid plans arrive you&apos;ll hear about it well before, and
            there will always be a free plan for a business starting out.
          </p>
        </div>
      </section>

      <section id="faq" className="scroll-mt-20 border-t border-stone-200/70">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
          <h2 className="text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">Questions</h2>
          <div className="border-t border-stone-200">
            {FAQ.map((item) => (
              <FaqItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </section>

      <CtaBand />
    </MarketingLayout>
  );
}
