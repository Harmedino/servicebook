import { Link } from "react-router-dom";
import { Calendar, CalendarDays, CheckCircle2, Menu, UserPlus, Users, X, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { motion } from "motion/react";
import { buttonClassName } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Badge, type BadgeTone } from "../components/ui/Badge";
import { Avatar } from "../components/ui/Avatar";

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
];

const WEEK_PREVIEW: { day: string; blocks: { label: string; tone: BadgeTone }[] }[] = [
  { day: "Mon", blocks: [{ label: "Haircut · 9:00", tone: "success" }, { label: "Styling · 2:00", tone: "info" }] },
  { day: "Tue", blocks: [{ label: "Beard trim · 10:30", tone: "warning" }] },
  { day: "Wed", blocks: [{ label: "Haircut · 9:00", tone: "success" }, { label: "Color · 1:00", tone: "info" }, { label: "Cut · 4:00", tone: "success" }] },
  { day: "Thu", blocks: [{ label: "Styling · 11:00", tone: "info" }] },
  { day: "Fri", blocks: [{ label: "Haircut · 9:30", tone: "success" }, { label: "Beard trim · 3:00", tone: "warning" }] },
];

const TEAM_PREVIEW = [
  { name: "Mike Johnson", appointments: 4 },
  { name: "Jessica Brown", appointments: 6 },
  { name: "David Smith", appointments: 2 },
];

function FloatingNotification({
  icon: Icon,
  tone,
  title,
  subtitle,
  className = "",
  delay = 0,
}: {
  icon: LucideIcon;
  tone: "success" | "brand";
  title: string;
  subtitle: string;
  className?: string;
  delay?: number;
}) {
  const toneClasses = tone === "success" ? "bg-green-100 text-green-600" : "bg-brand-100 text-brand-600";
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: [0, -8, 0] }}
      transition={{
        opacity: { duration: 0.4, delay: 0.6 + delay },
        scale: { duration: 0.4, delay: 0.6 + delay },
        y: { duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 + delay },
      }}
      className={`hidden items-center gap-2.5 rounded-xl border border-stone-200 bg-surface px-3.5 py-2.5 shadow-[var(--shadow-elevated)] sm:flex ${className}`}
    >
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${toneClasses}`}>
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
      <div>
        <p className="text-xs font-semibold text-stone-900">{title}</p>
        <p className="text-[11px] text-stone-500">{subtitle}</p>
      </div>
    </motion.div>
  );
}

function HeroPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="relative"
    >
      <Card elevated className="w-full max-w-md overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3.5">
          <span className="text-sm font-semibold text-stone-900">Today&apos;s schedule</span>
          <span className="text-xs text-stone-400">Tuesday</span>
        </div>
        <ul className="divide-y divide-stone-50 px-5">
          {[
            { customer: "Sam Carter", service: "Haircut", time: "9:00 AM", tone: "success" as const, status: "Confirmed" },
            { customer: "Priya Nair", service: "Beard trim", time: "10:30 AM", tone: "warning" as const, status: "Pending" },
            { customer: "Jordan Lee", service: "Styling", time: "12:00 PM", tone: "success" as const, status: "Confirmed" },
          ].map((row) => (
            <li key={row.customer} className="flex items-center justify-between gap-3 py-3">
              <div className="flex items-center gap-3">
                <Avatar name={row.customer} size="sm" />
                <div>
                  <p className="text-sm font-medium text-stone-900">{row.customer}</p>
                  <p className="text-xs text-stone-500">
                    {row.service} · {row.time}
                  </p>
                </div>
              </div>
              <Badge tone={row.tone}>{row.status}</Badge>
            </li>
          ))}
        </ul>
        <div className="grid grid-cols-3 gap-2 border-t border-stone-100 px-5 py-4">
          <div>
            <p className="text-lg font-semibold text-stone-900">3</p>
            <p className="text-xs text-stone-500">Today</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-stone-900">12</p>
            <p className="text-xs text-stone-500">Upcoming</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-stone-900">6</p>
            <p className="text-xs text-stone-500">Services</p>
          </div>
        </div>
      </Card>

      <FloatingNotification
        icon={CheckCircle2}
        tone="success"
        title="Booking confirmed"
        subtitle="Sarah — 10:30 AM"
        className="absolute -left-6 -top-6 sm:-left-10"
      />
      <FloatingNotification
        icon={UserPlus}
        tone="brand"
        title="New customer"
        subtitle="John Smith"
        delay={0.8}
        className="absolute -bottom-5 -right-4 sm:-right-8"
      />
    </motion.div>
  );
}

function BookingFlowPreview() {
  return (
    <Card elevated className="w-full max-w-sm p-6">
      <p className="section-label">Book an appointment</p>
      <div className="mt-4 space-y-3">
        <div className="flex items-center gap-3 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2.5">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
          <div className="flex-1">
            <p className="text-sm font-medium text-stone-900">Haircut</p>
            <p className="text-xs text-stone-500">30 min · $25</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2.5">
          <Avatar name="Mike Johnson" size="xs" />
          <p className="flex-1 text-sm font-medium text-stone-900">Mike Johnson</p>
          <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
        </div>
        <div>
          <p className="mb-2 text-xs font-medium text-stone-500">Friday, August 14</p>
          <div className="grid grid-cols-4 gap-1.5">
            {["9:00", "9:30", "10:00", "10:30"].map((slot, i) => (
              <div
                key={slot}
                className={`rounded-lg border px-1 py-1.5 text-center text-xs font-medium ${
                  i === 3 ? "border-brand-600 bg-brand-600 text-white" : "border-stone-200 text-stone-600"
                }`}
              >
                {slot}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className={`${buttonClassName("primary", "md", "mt-5 w-full")}`}>Confirm booking</div>
    </Card>
  );
}

function CalendarPreview() {
  return (
    <Card elevated className="w-full overflow-hidden p-0">
      <div className="grid grid-cols-5 divide-x divide-stone-100 border-b border-stone-100 text-center text-xs font-semibold uppercase tracking-wide text-stone-500">
        {WEEK_PREVIEW.map((d) => (
          <div key={d.day} className="py-2.5">
            {d.day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-5 divide-x divide-stone-100">
        {WEEK_PREVIEW.map((d) => (
          <div key={d.day} className="min-h-[180px] space-y-1.5 p-2">
            {d.blocks.map((block) => (
              <div key={block.label} className="rounded-md border-l-2 border-l-brand-400 bg-stone-50 px-1.5 py-1 text-left text-[11px] leading-tight text-stone-700">
                {block.label}
              </div>
            ))}
          </div>
        ))}
      </div>
    </Card>
  );
}

function TeamPreview() {
  return (
    <Card elevated className="w-full max-w-sm p-6">
      <p className="section-label">Team</p>
      <ul className="mt-4 space-y-4">
        {TEAM_PREVIEW.map((member) => (
          <li key={member.name} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar name={member.name} />
              <div>
                <p className="text-sm font-medium text-stone-900">{member.name}</p>
                <p className="text-xs text-stone-500">{member.appointments} appointments today</p>
              </div>
            </div>
            <span className="h-2 w-2 rounded-full bg-green-500" title="Available" />
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function LandingPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-surface text-stone-900">
      <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <span className="text-lg font-semibold tracking-tight text-stone-900">ServiceBook</span>

          <nav className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className="text-sm font-medium text-stone-600 hover:text-stone-900">
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Link to="/login" className="text-sm font-medium text-stone-600 hover:text-stone-900">
              Log in
            </Link>
            <Link to="/register" className={buttonClassName("primary", "sm")}>
              Get started
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            className="rounded-lg p-2 text-stone-600 hover:bg-stone-100 md:hidden"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {isMobileMenuOpen && (
          <div className="animate-fade-in-up border-t border-stone-200 px-4 py-4 md:hidden">
            <div className="flex flex-col gap-3">
              {NAV_LINKS.map((link) => (
                <a key={link.href} href={link.href} onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-medium text-stone-600">
                  {link.label}
                </a>
              ))}
              <div className="mt-2 flex flex-col gap-2 border-t border-stone-100 pt-3">
                <Link to="/login" className={buttonClassName("secondary", "md")}>
                  Log in
                </Link>
                <Link to="/register" className={buttonClassName("primary", "md")}>
                  Get started
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-hero-mesh">
        <div className="relative z-10 mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-indigo-100">
                Booking software for service businesses
              </span>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Your business.
                <br />
                Your bookings.
                <br />
                One simple place.
              </h1>
              <p className="mt-5 max-w-md text-lg text-indigo-100/80">
                ServiceBook helps service businesses manage bookings, customers, staff and availability from one
                simple platform.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/register" className={buttonClassName("primary", "lg")}>
                  Get started
                </Link>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center justify-center rounded-lg border border-white/20 px-5 py-2.5 text-[0.9375rem] font-medium text-white transition-colors hover:bg-white/10"
                >
                  See how it works
                </a>
              </div>
            </motion.div>

            <div className="flex justify-center pt-6 lg:justify-end lg:pt-0">
              <HeroPreview />
            </div>
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="border-b border-stone-100">
        <div className="mx-auto max-w-6xl px-4 py-10 text-center sm:px-6 lg:px-8">
          <p className="text-base font-medium text-stone-600">
            Everything you need to manage appointments in one place.
          </p>
        </div>
      </section>

      {/* Why ServiceBook — split, booking flow preview */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-1 items-center gap-14 lg:grid-cols-2"
        >
          <div>
            <p className="section-label">Why ServiceBook</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900">
              Let customers book online in minutes.
            </h2>
            <p className="mt-4 text-stone-600">
              No phone calls, no back-and-forth. Customers pick a service, choose their staff member, and land on a
              time that works — all from a page that belongs to your business.
            </p>
            <ul className="mt-6 space-y-3">
              {["Real-time availability, no double-bookings", "Staff and service selection built in", "Works on any device, no app required"].map(
                (item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-stone-700">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
                    {item}
                  </li>
                ),
              )}
            </ul>
          </div>
          <div className="flex justify-center">
            <BookingFlowPreview />
          </div>
        </motion.div>
      </section>

      {/* Dark contrast section */}
      <section className="bg-navy-900">
        <div className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Everything your business needs. Nothing you don&apos;t.
          </h2>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5 }}
            className="mt-12 grid grid-cols-1 gap-10 sm:grid-cols-3"
          >
            {[
              { icon: CalendarDays, label: "One calendar", description: "Every appointment, every staff member, one view." },
              { icon: Users, label: "Organized customers", description: "Full history and contact details, always up to date." },
              { icon: Calendar, label: "Always available", description: "Your booking page works around the clock." },
            ].map((item) => (
              <div key={item.label}>
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-indigo-200">
                  <item.icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <p className="mt-4 text-base font-semibold text-white">{item.label}</p>
                <p className="mt-1 text-sm text-indigo-100/70">{item.description}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Calendar preview */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="max-w-xl">
          <p className="section-label">Scheduling</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900">Every appointment in view.</h2>
          <p className="mt-4 text-stone-600">
            See your whole week at a glance, spot conflicts before they happen, and know exactly what&apos;s coming up.
          </p>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="mt-10"
        >
          <CalendarPreview />
        </motion.div>
      </section>

      {/* Team preview */}
      <section className="border-t border-stone-100 bg-stone-50">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-1 items-center gap-14 lg:grid-cols-2"
          >
            <div className="order-2 flex justify-center lg:order-1">
              <TeamPreview />
            </div>
            <div className="order-1 lg:order-2">
              <p className="section-label">Team management</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900">
                Keep your team organized.
              </h2>
              <p className="mt-4 text-stone-600">
                Assign services to staff, manage individual availability, and see who&apos;s working — and how busy
                they are — at a glance.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">How it works</h2>
        <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-3">
          {[
            { number: "01", title: "Set up your business", description: "Add your profile, hours, and timezone." },
            { number: "02", title: "Add services and staff", description: "Define what you offer and who provides it." },
            { number: "03", title: "Share your booking page", description: "Send customers your link and start taking bookings." },
          ].map((step) => (
            <div key={step.number}>
              <span className="text-sm font-semibold text-brand-600">{step.number}</span>
              <h3 className="mt-2 text-base font-semibold text-stone-900">{step.title}</h3>
              <p className="mt-1 text-sm text-stone-600">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden bg-hero-mesh">
        <div className="relative z-10 mx-auto max-w-6xl px-4 py-20 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Ready to take control of your bookings?
          </h2>
          <p className="mt-2 text-indigo-100/80">Start managing your business with ServiceBook.</p>
          <Link to="/register" className={`${buttonClassName("primary", "lg")} mt-6`}>
            Get started
          </Link>
        </div>
      </section>

      <footer className="border-t border-stone-200">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <span className="text-sm font-semibold text-stone-900">ServiceBook</span>
            <div className="flex gap-6 text-sm text-stone-500">
              <a href="#features" className="hover:text-stone-900">
                Features
              </a>
              <a href="#how-it-works" className="hover:text-stone-900">
                How it works
              </a>
              <Link to="/login" className="hover:text-stone-900">
                Log in
              </Link>
              <Link to="/register" className="hover:text-stone-900">
                Get started
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
