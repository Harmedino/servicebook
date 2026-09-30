import { motion } from "motion/react";
import { Check, Dumbbell, GraduationCap, Hand, Heart, Scissors, Stethoscope, type LucideIcon } from "lucide-react";
import { MarketingLayout } from "../../components/marketing/MarketingLayout";
import { CtaBand, PhoneFrame, Reveal, SectionHeading } from "../../components/marketing/primitives";

interface Solution {
  id: string;
  icon: LucideIcon;
  name: string;
  pain: string;
  services: [string, string][];
  wins: string[];
}

const SOLUTIONS: Solution[] = [
  {
    id: "salons",
    icon: Scissors,
    name: "Salons & barbershops",
    pain: "Chairs double-booked, braids that run long, and a phone that never stops buzzing.",
    services: [
      ["Haircut & style", "₦8,000"],
      ["Knotless braids", "₦35,000"],
      ["Beard line-up", "₦5,000"],
    ],
    wins: ["Long services block the right amount of time", "Customers choose their favourite stylist", "Walk-ins added in seconds"],
  },
  {
    id: "spas",
    icon: Heart,
    name: "Spas & massage",
    pain: "Rooms and therapists to juggle, and guests who want to book at midnight.",
    services: [
      ["Deep tissue, 60 min", "₦20,000"],
      ["Couples massage", "₦45,000"],
      ["Facial", "₦15,000"],
    ],
    wins: ["Therapist schedules and days off respected", "Booking page with your cover photo", "Reminders that cut no-shows"],
  },
  {
    id: "beauty",
    icon: Hand,
    name: "Nails, lashes & makeup",
    pain: "Mobile bookings, deposits discussed in DMs, and repeat clients you forget to follow up.",
    services: [
      ["Gel manicure", "₦12,000"],
      ["Lash extensions", "₦18,000"],
      ["Full glam makeup", "₦25,000"],
    ],
    wins: ["Service photos so clients know the look", "Client notes for allergies and preferences", "Share your link in your Instagram bio"],
  },
  {
    id: "clinics",
    icon: Stethoscope,
    name: "Clinics & therapists",
    pain: "Patients calling reception to book, and paper registers for contact details.",
    services: [
      ["Consultation", "₦15,000"],
      ["Physiotherapy session", "₦20,000"],
      ["Follow-up", "₦8,000"],
    ],
    wins: ["Patients register themselves with the join link", "Practitioner calendars side by side", "Private notes on each patient"],
  },
  {
    id: "fitness",
    icon: Dumbbell,
    name: "Fitness & coaching",
    pain: "Session times agreed over chat, forgotten, then rearranged again.",
    services: [
      ["Personal training", "₦10,000"],
      ["Assessment", "₦7,500"],
      ["Nutrition check-in", "₦6,000"],
    ],
    wins: ["Clients pick from your real free hours", "Every session logged against the client", "See monthly revenue at a glance"],
  },
  {
    id: "tutors",
    icon: GraduationCap,
    name: "Tutors & consultants",
    pain: "Parents and clients messaging to find a time, across different days and subjects.",
    services: [
      ["Maths lesson, 1 hr", "₦6,000"],
      ["Exam prep", "₦12,000"],
      ["Strategy call", "₦25,000"],
    ],
    wins: ["One link per subject or service", "Automatic time zone handling", "No double-booked evenings"],
  },
];

const TIMELINE = [
  { time: "06:52", title: "Chioma books a haircut", body: "From the link in the salon's Instagram bio, before anyone is awake." },
  { time: "08:45", title: "The team checks the day", body: "Tunde opens today's view on his phone and sees four appointments." },
  { time: "11:20", title: "A walk-in arrives", body: "Reception adds her in ten seconds; the free slot disappears from the booking page." },
  { time: "14:05", title: "New client joins the list", body: "She scans the QR code at the counter and adds her own number." },
  { time: "19:10", title: "The owner closes up", body: "Today's revenue, completed bookings and tomorrow's schedule, on one screen." },
];

export function SolutionsPage() {
  return (
    <MarketingLayout>
      <section className="bg-ink-grid">
        <div className="mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pb-20 sm:pt-20 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-highlight">Solutions</p>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-6xl">Made for businesses that run on appointments.</h1>
            <p className="mt-5 max-w-xl text-base text-white/60 sm:text-lg">
              If customers book time with you or your team, ServiceBook fits. Here&apos;s how different businesses use it.
            </p>
          </motion.div>
          <div className="no-scrollbar -mx-4 mt-10 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
            {SOLUTIONS.map((solution) => (
              <a
                key={solution.id}
                href={`#${solution.id}`}
                className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white/85 transition hover:bg-white/10"
              >
                <solution.icon className="h-4 w-4 text-highlight" aria-hidden="true" />
                {solution.name}
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {SOLUTIONS.map((solution, index) => (
            <Reveal key={solution.id} delay={(index % 3) * 0.06}>
              <article id={solution.id} className="flex h-full scroll-mt-24 flex-col rounded-3xl border border-stone-200 bg-surface p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink text-highlight">
                  <solution.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h2 className="mt-5 text-xl font-semibold text-stone-900">{solution.name}</h2>
                <p className="mt-2 text-sm leading-relaxed text-stone-500">{solution.pain}</p>
                <div className="mt-5 rounded-2xl bg-stone-50 p-3">
                  <p className="px-1 text-[11px] font-semibold uppercase tracking-wider text-stone-400">Typical services</p>
                  <ul className="mt-2 divide-y divide-stone-200/70">
                    {solution.services.map(([name, price]) => (
                      <li key={name} className="flex items-center justify-between gap-3 px-1 py-2 text-sm">
                        <span className="text-stone-700">{name}</span>
                        <span className="font-semibold tabular-nums text-stone-900">{price}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <ul className="mt-5 space-y-2.5">
                  {solution.wins.map((win) => (
                    <li key={win} className="flex items-start gap-2.5 text-sm text-stone-700">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" strokeWidth={3} aria-hidden="true" />
                      {win}
                    </li>
                  ))}
                </ul>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="border-t border-stone-200/70">
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
          <div>
            <SectionHeading eyebrow="A day at a salon" title="What a Saturday looks like with ServiceBook." />
            <ol className="relative mt-10 space-y-8 border-l border-stone-300 pl-7">
              {TIMELINE.map((entry, index) => (
                <Reveal key={entry.time} delay={index * 0.05}>
                  <li className="relative">
                    <span className="absolute -left-[33px] top-1 h-3 w-3 rounded-full border-2 border-paper bg-brand-600 ring-4 ring-brand-100" />
                    <p className="font-mono text-xs font-semibold text-brand-700">{entry.time}</p>
                    <h3 className="mt-1 text-lg font-semibold text-stone-900">{entry.title}</h3>
                    <p className="mt-1 text-[15px] text-stone-500">{entry.body}</p>
                  </li>
                </Reveal>
              ))}
            </ol>
          </div>
          <Reveal delay={0.1} className="mx-auto w-full max-w-[300px]">
            <PhoneFrame src="/screens/dashboard-mobile.webp" alt="The dashboard on a phone" bar="dark" />
          </Reveal>
        </div>
      </section>

      <CtaBand title="Whatever you book, book it here." />
    </MarketingLayout>
  );
}
