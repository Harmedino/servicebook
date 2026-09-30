import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  BarChart3,
  Bell,
  CalendarDays,
  Check,
  Clock,
  Coins,
  Globe,
  ImageIcon,
  KeyRound,
  Link2,
  MessageCircle,
  MessagesSquare,
  Moon,
  QrCode,
  Search,
  Smartphone,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { MarketingLayout } from "../../components/marketing/MarketingLayout";
import { BrowserFrame, CtaBand, PhoneFrame, Reveal, SectionHeading } from "../../components/marketing/primitives";

interface Feature {
  id: string;
  icon: LucideIcon;
  nav: string;
  eyebrow: string;
  title: string;
  body: string;
  points: string[];
  visual: { kind: "browser"; src: string; path: string; alt: string } | { kind: "phones"; srcs: [string, string]; alt: string };
}

const FEATURES: Feature[] = [
  {
    id: "booking",
    icon: Smartphone,
    nav: "Booking page",
    eyebrow: "Online booking page",
    title: "Customers book themselves. You get the notification.",
    body: "Your page lives at your own link. It shows your services with photos and prices, lets customers pick someone if they want to, and only offers times that are genuinely free.",
    points: [
      "Service, time, details, confirm: four quick steps on any phone",
      "Choosing a staff member is optional; “Any available” books you first",
      "Free slots calculated from business hours, staff hours and existing bookings",
      "Your logo, cover photo, address and phone number",
    ],
    visual: { kind: "phones", srcs: ["/screens/booking-mobile.webp", "/screens/slots-mobile.webp"], alt: "The booking page on a phone" },
  },
  {
    id: "calendar",
    icon: CalendarDays,
    nav: "Calendar",
    eyebrow: "Team calendar",
    title: "Day, week and month, for everyone at once.",
    body: "See every appointment across your team, colour-coded by status. Add a walk-in, move a booking to a new time, or mark someone as a no-show without leaving the page.",
    points: [
      "Filter by staff member or see the whole team",
      "Reschedule with conflict checks built in",
      "Pending, confirmed, completed, cancelled and no-show statuses",
      "Opens on today's day view on your phone",
    ],
    visual: { kind: "browser", src: "/screens/calendar.webp", path: "calendar", alt: "Week view of the team calendar" },
  },
  {
    id: "clients",
    icon: Users,
    nav: "Clients",
    eyebrow: "Client list and join link",
    title: "Stop typing in phone numbers. Send one link.",
    body: "Share your join link on WhatsApp or print its QR code. Customers add their own details and land straight in your client list, tagged so you know they came from the link.",
    points: [
      "Join link and booking link, each with a downloadable QR code",
      "Every visit, spend and note on the customer's profile",
      "Search by name, phone or email; filter by upcoming or past visits",
      "Anyone who books online is added automatically",
    ],
    visual: { kind: "browser", src: "/screens/customers.webp", path: "customers", alt: "The customer list" },
  },
  {
    id: "inbox",
    icon: MessagesSquare,
    nav: "Inbox",
    eyebrow: "Chat apps and Inbox",
    title: "Every DM starts as a lead you can see.",
    body: "Customers can reach you on WhatsApp, Instagram, Messenger, TikTok, X, Telegram or Snapchat. Before the app opens they leave their name, number and what they want, so the chat lands in your Inbox with a reference code.",
    points: [
      "Seven chat apps; show only the ones you use",
      "Name, phone, service and message captured before the chat opens",
      "Reference codes to match a DM to its enquiry",
      "Mark as replied, booked or closed; reply on WhatsApp in one tap",
    ],
    visual: { kind: "browser", src: "/screens/inbox.webp", path: "inbox", alt: "The Inbox with chats from the booking page" },
  },
  {
    id: "team",
    icon: UserRound,
    nav: "Team",
    eyebrow: "Staff and services",
    title: "Who does what, and when they work.",
    body: "Give each staff member their services, working days and hours. The booking page and calendar respect them automatically, so nobody is booked for something they don't do.",
    points: [
      "Weekly availability per staff member",
      "Services with duration, price, description and photo",
      "Staff photos on the booking page",
      "Turn a service or a staff member off without deleting history",
    ],
    visual: { kind: "browser", src: "/screens/staff.webp", path: "staff", alt: "The staff page" },
  },
  {
    id: "insights",
    icon: BarChart3,
    nav: "Insights",
    eyebrow: "Insights",
    title: "Know how the month is going.",
    body: "Your dashboard compares this month with last: revenue, bookings, new clients and no-show rate, plus a 30-day revenue chart you can scrub through day by day.",
    points: ["Month-on-month change on every number", "Daily revenue and booking counts", "Today's schedule and quick actions up top"],
    visual: { kind: "browser", src: "/screens/dashboard.webp", path: "dashboard", alt: "The dashboard with insights" },
  },
];

const DETAILS: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: Coins, title: "Currencies", body: "₦, $, £, €, GH₵, KSh, R and more, set per business." },
  { icon: Globe, title: "Time zones", body: "Every slot is calculated in your business's own time zone." },
  { icon: Bell, title: "Email notifications", body: "Booking confirmations and reminders once email is connected." },
  { icon: MessageCircle, title: "WhatsApp sharing", body: "Send your booking or join link to WhatsApp in one tap." },
  { icon: QrCode, title: "QR codes", body: "Download print-ready QR codes for both of your links." },
  { icon: ImageIcon, title: "Photos", body: "Upload a logo, cover photo, service photos and staff pictures." },
  { icon: Search, title: "Fast search", body: "Find any customer or booking by name, phone or email." },
  { icon: Moon, title: "Dark mode", body: "Follows your phone's setting, or switch it yourself." },
  { icon: Clock, title: "Business hours", body: "Opening hours per day, with closed days respected everywhere." },
  { icon: Link2, title: "Your own link", body: "A clean /book/your-business address you can print anywhere." },
  { icon: KeyRound, title: "Secure accounts", body: "Hashed passwords, signed sessions and per-business data isolation." },
  { icon: Smartphone, title: "Built for phones", body: "An app-style layout with a bottom tab bar on small screens." },
];

function FeatureVisual({ visual }: { visual: Feature["visual"] }) {
  if (visual.kind === "phones") {
    return (
      <div className="mx-auto flex max-w-md justify-center gap-4 rounded-[2rem] bg-brand-100/60 px-6 pt-10 sm:gap-6 sm:px-10">
        <PhoneFrame src={visual.srcs[0]} alt={visual.alt} className="w-1/2 translate-y-6" bar="dark" />
        <PhoneFrame src={visual.srcs[1]} alt={visual.alt} className="w-1/2 -translate-y-2" />
      </div>
    );
  }
  return <BrowserFrame src={visual.src} alt={visual.alt} path={visual.path} />;
}

/** Highlights the sub-nav pill for whichever section is on screen. */
function useActiveSection(ids: string[]): string {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-40% 0px -55% 0px" },
    );
    // Above the first section nothing intersects; highlight the first tab.
    const onScroll = () => {
      const first = document.getElementById(ids[0]);
      if (first && first.getBoundingClientRect().top > window.innerHeight * 0.4) setActive(ids[0]);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, [ids]);
  return active;
}

const IDS = FEATURES.map((feature) => feature.id);

export function FeaturesPage() {
  const active = useActiveSection(IDS);

  return (
    <MarketingLayout>
      <section className="bg-ink-grid">
        <div className="mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pb-20 sm:pt-20 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-highlight">Features</p>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-6xl">
              Everything you need to run appointments. Nothing you don&apos;t.
            </h1>
            <p className="mt-5 max-w-xl text-base text-white/60 sm:text-lg">
              Six tools that work together: a booking page, a team calendar, a client list, an inbox for chats, staff and services, and insights.
            </p>
          </motion.div>
        </div>
      </section>

      <nav className="sticky top-16 z-30 border-b border-stone-200 bg-paper/90 backdrop-blur-xl" aria-label="Feature sections">
        <div className="no-scrollbar mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 py-2.5 sm:px-6 lg:px-8">
          {FEATURES.map((feature) => (
            <a
              key={feature.id}
              href={`#${feature.id}`}
              className={`relative inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
                active === feature.id ? "text-white" : "text-stone-600 hover:text-stone-900"
              }`}
            >
              {active === feature.id && (
                <motion.span layoutId="feature-pill" className="absolute inset-0 rounded-full bg-ink dark:bg-brand-700" transition={{ type: "spring", stiffness: 480, damping: 38 }} />
              )}
              <feature.icon className="relative h-4 w-4" aria-hidden="true" />
              <span className="relative">{feature.nav}</span>
            </a>
          ))}
        </div>
      </nav>

      <div className="mx-auto max-w-6xl space-y-24 px-4 py-20 sm:space-y-32 sm:px-6 sm:py-28 lg:px-8">
        {FEATURES.map((feature, index) => (
          <section key={feature.id} id={feature.id} className="scroll-mt-32 grid items-center gap-10 lg:grid-cols-[1fr_1.15fr] lg:gap-16">
            <Reveal className={index % 2 === 1 ? "lg:order-2" : ""}>
              <SectionHeading eyebrow={feature.eyebrow} title={feature.title} description={feature.body} />
              <ul className="mt-7 space-y-3.5">
                {feature.points.map((point) => (
                  <li key={point} className="flex items-start gap-3 text-[15px] text-stone-700">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                      <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={0.1} className={index % 2 === 1 ? "lg:order-1" : ""}>
              <FeatureVisual visual={feature.visual} />
            </Reveal>
          </section>
        ))}
      </div>

      <section id="details" className="border-t border-stone-200/70">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <SectionHeading eyebrow="And the details" title="Small things that save you time every day." />
          <div className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {DETAILS.map((item, index) => (
              <Reveal key={item.title} delay={(index % 3) * 0.05} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface text-brand-700 ring-1 ring-stone-200">
                  <item.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-base font-semibold text-stone-900">{item.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-stone-500">{item.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <CtaBand title="See it with real data." description="Open the demo dashboard or book an appointment at our demo salon. No sign-up needed." />
    </MarketingLayout>
  );
}
