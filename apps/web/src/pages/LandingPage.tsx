import { Link } from "react-router-dom";
import { CalendarClock, CalendarDays, Clock, LayoutDashboard, Menu, Users, X, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { buttonClassName } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
];

const FEATURES: { icon: LucideIcon; title: string; description: string }[] = [
  { icon: CalendarClock, title: "Online booking", description: "Let customers book appointments without calling." },
  { icon: CalendarDays, title: "Calendar management", description: "See your schedule clearly and avoid conflicts." },
  { icon: Users, title: "Staff management", description: "Manage your team, services and availability." },
  { icon: Users, title: "Customer management", description: "Keep customer information organized." },
  { icon: Clock, title: "Business hours", description: "Control when customers can book." },
  { icon: LayoutDashboard, title: "Simple dashboard", description: "See what's happening with your business at a glance." },
];

const STEPS = [
  { number: "01", title: "Set up your business", description: "Add your profile, hours, and timezone." },
  { number: "02", title: "Add services and staff", description: "Define what you offer and who provides it." },
  { number: "03", title: "Share your booking page", description: "Send customers your link and start taking bookings." },
];

function PreviewAppointmentRow({ time, customer, service, tone }: { time: string; customer: string; service: string; tone: "success" | "warning" }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg px-2 py-2">
      <div className="flex items-center gap-3">
        <span className="w-14 shrink-0 text-xs font-medium text-stone-500">{time}</span>
        <div>
          <p className="text-sm font-medium text-stone-900">{customer}</p>
          <p className="text-xs text-stone-500">{service}</p>
        </div>
      </div>
      <Badge tone={tone}>{tone === "success" ? "Confirmed" : "Pending"}</Badge>
    </li>
  );
}

function DashboardPreviewCard() {
  return (
    <Card className="w-full max-w-md p-5">
      <div className="flex items-center justify-between border-b border-stone-100 pb-3">
        <span className="text-sm font-semibold text-stone-900">Today&apos;s bookings</span>
        <span className="text-xs text-stone-400">Tuesday</span>
      </div>
      <ul className="mt-2 divide-y divide-stone-50">
        <PreviewAppointmentRow time="09:00" customer="Sam Carter" service="Haircut" tone="success" />
        <PreviewAppointmentRow time="10:30" customer="Priya Nair" service="Beard trim" tone="warning" />
        <PreviewAppointmentRow time="12:00" customer="Jordan Lee" service="Styling" tone="success" />
      </ul>
      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-stone-100 pt-3">
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
  );
}

function StaffPreviewCard() {
  return (
    <Card className="w-full max-w-sm p-5">
      <p className="text-sm font-semibold text-stone-900">Team</p>
      <ul className="mt-3 space-y-3">
        {[
          { name: "Mike Johnson", role: "3 services", status: "Active" as const },
          { name: "Sarah Williams", role: "2 services", status: "Active" as const },
        ].map((member) => (
          <li key={member.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
                {member.name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-medium text-stone-900">{member.name}</p>
                <p className="text-xs text-stone-500">{member.role}</p>
              </div>
            </div>
            <Badge tone="success">{member.status}</Badge>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function BookingFlowPreviewCard() {
  return (
    <Card className="w-full max-w-sm p-5">
      <p className="text-sm font-semibold text-stone-900">Choose a time</p>
      <p className="mt-0.5 text-xs text-stone-500">Haircut with Mike</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {["9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM"].map((slot, i) => (
          <div
            key={slot}
            className={`rounded-lg border px-2 py-1.5 text-center text-xs font-medium ${
              i === 2 ? "border-brand-600 bg-brand-600 text-white" : "border-stone-200 text-stone-600"
            }`}
          >
            {slot}
          </div>
        ))}
      </div>
      <div className={`${buttonClassName("primary", "md", "mt-4 w-full")}`}>Confirm booking</div>
    </Card>
  );
}

export function LandingPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-stone-900">
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
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-sm font-medium text-stone-600"
                >
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
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-stone-900 sm:text-5xl">
              Take bookings.
              <br />
              Run your business.
              <br />
              Stay organized.
            </h1>
            <p className="mt-5 max-w-lg text-lg text-stone-600">
              ServiceBook helps service businesses manage bookings, customers, staff and availability from one simple
              platform.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register" className={buttonClassName("primary", "lg")}>
                Get started
              </Link>
              <a href="#product-preview" className={buttonClassName("secondary", "lg")}>
                View demo
              </a>
            </div>
          </div>

          <div className="flex justify-center lg:justify-end">
            <DashboardPreviewCard />
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="border-y border-stone-100 bg-stone-50">
        <div className="mx-auto max-w-6xl px-4 py-10 text-center sm:px-6 lg:px-8">
          <p className="text-base font-medium text-stone-600">
            Everything you need to manage appointments in one place.
          </p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
            Built for real service businesses
          </h2>
          <p className="mt-2 text-stone-600">The essentials, done well — nothing you don&apos;t need.</p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <Card key={feature.title} className="p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                <feature.icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-stone-900">{feature.title}</h3>
              <p className="mt-1 text-sm text-stone-600">{feature.description}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-y border-stone-100 bg-stone-50">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">How it works</h2>
          <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.number}>
                <span className="text-sm font-semibold text-brand-600">{step.number}</span>
                <h3 className="mt-2 text-base font-semibold text-stone-900">{step.title}</h3>
                <p className="mt-1 text-sm text-stone-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Product previews */}
      <section id="product-preview" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="space-y-20">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-stone-900">Manage your schedule</h2>
              <p className="mt-3 text-stone-600">
                See every appointment at a glance and avoid double-bookings automatically.
              </p>
            </div>
            <div className="flex justify-center">
              <DashboardPreviewCard />
            </div>
          </div>

          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
            <div className="order-2 flex justify-center lg:order-1">
              <StaffPreviewCard />
            </div>
            <div className="order-1 lg:order-2">
              <h2 className="text-2xl font-semibold tracking-tight text-stone-900">Keep your team organized</h2>
              <p className="mt-3 text-stone-600">
                Assign services to staff, manage availability, and see who&apos;s working when.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-stone-900">Let customers book online</h2>
              <p className="mt-3 text-stone-600">
                A clean, simple booking page your customers can use anytime — no phone calls required.
              </p>
            </div>
            <div className="flex justify-center">
              <BookingFlowPreviewCard />
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-stone-900">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Ready to simplify your bookings?
          </h2>
          <p className="mt-2 text-stone-300">Start managing your business with ServiceBook.</p>
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
