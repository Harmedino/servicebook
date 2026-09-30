import { Link } from "react-router-dom";
import { motion } from "motion/react";
import {
  ArrowRight,
  BarChart3,
  Bell,
  CalendarDays,
  Check,
  Clock,
  Coins,
  Dumbbell,
  GraduationCap,
  Hand,
  Heart,
  ImageIcon,
  Link2,
  Moon,
  Scissors,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UserPlus,
  Wand2,
  X,
} from "lucide-react";
import { MarketingLayout } from "../../components/marketing/MarketingLayout";
import { BrowserFrame, CtaBand, DemoButton, PhoneFrame, PrimaryCta, Reveal, SectionHeading } from "../../components/marketing/primitives";
import { DEMO_BOOKING_PATH } from "../../lib/demo";

const INDUSTRIES = [
  { icon: Scissors, label: "Hair salons" },
  { icon: Scissors, label: "Barbershops" },
  { icon: Heart, label: "Spas & massage" },
  { icon: Hand, label: "Nail studios" },
  { icon: Wand2, label: "Makeup artists" },
  { icon: Sparkles, label: "Lash & brow bars" },
  { icon: Stethoscope, label: "Clinics & therapists" },
  { icon: Dumbbell, label: "Personal trainers" },
  { icon: GraduationCap, label: "Tutors & coaches" },
];

const BEFORE = [
  "Answering “are you free Saturday?” at 11pm",
  "Two customers booked into the same chair",
  "Client numbers scattered across three phones",
  "No idea what the business made this month",
];

const AFTER = [
  "Customers book themselves, 24/7, from one link",
  "A slot locks the moment someone books it",
  "Every client, their visits and notes in one list",
  "Revenue, bookings and no-shows tracked for you",
];

const SHOWCASE = [
  {
    id: "booking",
    eyebrow: "Online booking page",
    title: "A booking page that feels like an app.",
    body: "Put one link in your Instagram bio and WhatsApp status. Customers pick a service and a free time, choose a stylist only if they care, and get an instant confirmation. No app to install, no account to create.",
    points: ["Only real free slots are shown", "“Any available” books you first, then your team", "Chat buttons for WhatsApp, Instagram, TikTok and more"],
    visual: "phones" as const,
  },
  {
    id: "calendar",
    eyebrow: "Team calendar",
    title: "The whole team's day on one screen.",
    body: "Day, week and month views across every staff member. Add a walk-in in seconds, reschedule by picking a new time, and never double-book a chair again.",
    points: ["Per-staff working hours and days off", "Conflicts blocked before they happen", "Confirm, complete or mark no-shows in one tap"],
    visual: "calendar" as const,
  },
  {
    id: "clients",
    eyebrow: "Client list",
    title: "A client list that fills itself.",
    body: "Share your join link once. Customers add their own name and number, and every booking adds to their history, so you know who is due back and who you haven't seen in a while.",
    points: ["Self sign-up link and printable QR code", "Visit history and private notes", "Search, sort and filter in a second"],
    visual: "clients" as const,
  },
];

const EXTRAS = [
  { icon: Coins, title: "Naira first", body: "₦ by default, plus USD, GBP, EUR, GHS, KES and more." },
  { icon: Clock, title: "Any time zone", body: "Slots always show in your business's local time." },
  { icon: Bell, title: "Confirmations", body: "Email confirmations and reminders when you connect email." },
  { icon: ImageIcon, title: "Photos", body: "Logo, cover photo, service photos and staff pictures." },
  { icon: BarChart3, title: "Insights", body: "Revenue, bookings, new clients and no-show rate by month." },
  { icon: Moon, title: "Dark mode", body: "Easy on the eyes when you close up late." },
  { icon: Link2, title: "Every chat logged", body: "DMs from WhatsApp, Instagram or TikTok start in your Inbox." },
  { icon: ShieldCheck, title: "Private by default", body: "Each business only ever sees its own data." },
];

function Hero() {
  return (
    <section className="relative overflow-hidden pb-12">
      {/* Ink stops partway down so the screenshot overlaps onto the page below. */}
      <div className="absolute inset-x-0 bottom-[16%] top-0 bg-ink-grid sm:bottom-[24%]" aria-hidden="true" />
      <div className="relative mx-auto max-w-6xl px-4 pt-14 sm:px-6 sm:pt-20 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} className="mx-auto max-w-3xl text-center">
          <Link
            to="/features#clients"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 py-1 pl-1 pr-3 text-xs font-medium text-white/80 transition hover:bg-white/10"
          >
            <span className="rounded-full bg-highlight px-2 py-0.5 text-[11px] font-semibold text-ink">New</span>
            Customers can now join your client list with one link
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
          <h1 className="mt-6 text-[2.6rem] font-semibold leading-[1.02] tracking-tight text-white sm:text-6xl lg:text-7xl">
            Stop taking bookings <span className="text-highlight">in your DMs.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-white/65 sm:text-lg">
            ServiceBook gives your salon, barbershop, spa or clinic a booking link customers actually use, a calendar the whole team shares, and a client list
            that fills itself.
          </p>
          <div className="mx-auto mt-9 flex max-w-sm flex-col items-center justify-center gap-3 sm:max-w-none sm:flex-row sm:items-start">
            <PrimaryCta />
            <DemoButton />
          </div>
          <p className="mt-5 text-xs text-white/45">Free during early access · No card needed · Works on any phone</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 48 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto mt-14 max-w-5xl sm:mt-16"
        >
          <BrowserFrame src="/screens/dashboard.webp" alt="ServiceBook dashboard with today's schedule and revenue" />
          <motion.div
            initial={{ opacity: 0, y: 40, rotate: 4 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            transition={{ duration: 0.9, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="absolute -bottom-10 -right-2 w-[30%] max-w-[230px] sm:-right-8 sm:w-[24%]"
          >
            <PhoneFrame src="/screens/booking-mobile.webp" alt="The public booking page on a phone" bar="dark" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function IndustryMarquee() {
  const row = [...INDUSTRIES, ...INDUSTRIES];
  return (
    <section className="pb-6 pt-16 sm:pt-20" aria-label="Who ServiceBook is for">
      <p className="text-center text-sm font-medium text-stone-500">Built for businesses that run on appointments</p>
      <div className="relative mt-6 overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]">
        <div className="marquee flex w-max gap-3">
          {row.map((item, index) => (
            <span
              key={`${item.label}-${index}`}
              className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-surface px-4 py-2 text-sm font-medium text-stone-700"
              aria-hidden={index >= INDUSTRIES.length}
            >
              <item.icon className="h-4 w-4 text-brand-600" aria-hidden="true" />
              {item.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function BeforeAfter() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
      <SectionHeading eyebrow="Why switch" title="Your week, before and after." description="Most small service businesses run on WhatsApp, a paper diary and memory. It works, until it doesn't." />
      <div className="mt-12 grid gap-4 md:grid-cols-2">
        <Reveal className="rounded-3xl border border-stone-200 bg-surface p-6 sm:p-8">
          <p className="text-sm font-semibold text-stone-500">Without ServiceBook</p>
          <ul className="mt-6 space-y-4">
            {BEFORE.map((item) => (
              <li key={item} className="flex items-start gap-3 text-[15px] text-stone-600">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-400">
                  <X className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </Reveal>
        <Reveal delay={0.1} className="rounded-3xl bg-ink p-6 text-white sm:p-8">
          <p className="text-sm font-semibold text-highlight">With ServiceBook</p>
          <ul className="mt-6 space-y-4">
            {AFTER.map((item) => (
              <li key={item} className="flex items-start gap-3 text-[15px] text-white/85">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-highlight text-ink">
                  <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}

function ShowcaseVisual({ kind }: { kind: (typeof SHOWCASE)[number]["visual"] }) {
  if (kind === "phones") {
    return (
      <div className="relative mx-auto flex max-w-md justify-center gap-4 rounded-[2rem] bg-brand-100/60 px-6 pb-0 pt-10 sm:gap-6 sm:px-10">
        <PhoneFrame src="/screens/booking-mobile.webp" alt="Choosing a service on the booking page" className="w-1/2 translate-y-6" bar="dark" />
        <PhoneFrame src="/screens/slots-mobile.webp" alt="Picking a free time slot" className="w-1/2 -translate-y-2" />
      </div>
    );
  }
  if (kind === "calendar") {
    return <BrowserFrame src="/screens/calendar.webp" alt="Week view of the team calendar" path="calendar" />;
  }
  return (
    <div className="relative pb-10 pr-8 sm:pr-14">
      <BrowserFrame src="/screens/customers.webp" alt="The customer list" path="customers" />
      <PhoneFrame src="/screens/join-mobile.webp" alt="A customer joining the client list from the link" className="absolute -bottom-2 right-0 w-[34%] max-w-[200px]" bar="dark" />
    </div>
  );
}

function Showcase() {
  return (
    <section className="border-t border-stone-200/70">
      <div className="mx-auto max-w-6xl space-y-24 px-4 py-20 sm:space-y-32 sm:px-6 sm:py-28 lg:px-8">
        {SHOWCASE.map((item, index) => (
          <div key={item.id} className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <Reveal className={index % 2 === 1 ? "lg:order-2" : ""}>
              <SectionHeading eyebrow={item.eyebrow} title={item.title} description={item.body} />
              <ul className="mt-7 space-y-3">
                {item.points.map((point) => (
                  <li key={point} className="flex items-center gap-3 text-[15px] font-medium text-stone-800">
                    <Check className="h-4 w-4 shrink-0 text-brand-600" strokeWidth={3} aria-hidden="true" />
                    {point}
                  </li>
                ))}
              </ul>
              <Link to={`/features#${item.id}`} className="mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:gap-2.5 hover:underline">
                More about {item.eyebrow.toLowerCase()} <ArrowRight className="h-4 w-4 transition-all" aria-hidden="true" />
              </Link>
            </Reveal>
            <Reveal delay={0.1} className={index % 2 === 1 ? "lg:order-1" : ""}>
              <ShowcaseVisual kind={item.visual} />
            </Reveal>
          </div>
        ))}
      </div>
    </section>
  );
}

function Steps() {
  const steps = [
    { title: "Create your business", body: "Name, hours, time zone and currency. Two minutes." },
    { title: "Add services and staff", body: "Prices, durations, who does what, and when they work." },
    { title: "Share your links", body: "Drop them in your bio, WhatsApp status and on the counter as a QR code." },
  ];
  return (
    <section className="bg-ink text-white">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <SectionHeading onDark eyebrow="Getting started" title="Live in about five minutes." description="No setup call, no training. If you can post on Instagram, you can set up ServiceBook." />
        <ol className="mt-14 grid gap-10 md:grid-cols-3 md:gap-6">
          {steps.map((step, index) => (
            <Reveal key={step.title} delay={index * 0.08}>
              <li className="relative border-t border-white/15 pt-6">
                <span className="absolute -top-px left-0 h-px w-16 bg-highlight" />
                <span className="font-display text-5xl font-semibold text-white/20">0{index + 1}</span>
                <h3 className="mt-4 text-xl font-semibold">{step.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-white/60">{step.body}</p>
              </li>
            </Reveal>
          ))}
        </ol>
        <div className="mt-14 flex flex-col gap-3 sm:flex-row">
          <PrimaryCta>Create your business</PrimaryCta>
          <Link to={DEMO_BOOKING_PATH} className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/20 px-6 text-[15px] font-medium text-white transition hover:bg-white/10">
            <CalendarDays className="h-4 w-4" aria-hidden="true" /> Book a demo appointment
          </Link>
        </div>
      </div>
    </section>
  );
}

function Extras() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
      <SectionHeading eyebrow="Included" title="The small things, done properly." />
      <div className="mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-3xl border border-stone-200 bg-stone-200 sm:grid-cols-2 lg:grid-cols-4">
        {EXTRAS.map((item, index) => (
          <Reveal key={item.title} delay={(index % 4) * 0.05} className="bg-surface p-6">
            <item.icon className="h-5 w-5 text-brand-600" aria-hidden="true" />
            <h3 className="mt-4 text-base font-semibold text-stone-900">{item.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-stone-500">{item.body}</p>
          </Reveal>
        ))}
      </div>
      <div className="mt-8 flex items-center gap-2 text-sm">
        <UserPlus className="h-4 w-4 text-brand-600" aria-hidden="true" />
        <span className="text-stone-600">Everything above is in every plan.</span>
        <Link to="/pricing" className="font-semibold text-brand-700 hover:underline">
          See pricing
        </Link>
      </div>
    </section>
  );
}

export function HomePage() {
  return (
    <MarketingLayout>
      <Hero />
      <IndustryMarquee />
      <BeforeAfter />
      <Showcase />
      <Steps />
      <Extras />
      <CtaBand />
    </MarketingLayout>
  );
}
