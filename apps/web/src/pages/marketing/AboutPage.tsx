import { Link } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import { MarketingLayout } from "../../components/marketing/MarketingLayout";
import { CtaBand, Reveal } from "../../components/marketing/primitives";

const PEOPLE = [
  {
    who: "Your customers",
    lead: "No app, no account. They open your link and book.",
    points: [
      "Book from your Instagram bio, a WhatsApp message or the QR poster on your counter",
      "See your team, your work, real reviews, your hours and how to find you",
      "Chat with you about their booking, cancel it, or add it to their calendar",
      "Rate the visit afterwards",
      "Their own page with every visit, and “Book again” without typing their details",
      "Join a waitlist when a day is full",
    ],
  },
  {
    who: "You, the owner",
    lead: "Everything about the business, in one place.",
    points: [
      "Today's schedule, the calendar and a full-screen view for the front desk",
      "Every booking on its own page: confirm, move, cancel, mark done, notes and chat",
      "A client list that fills itself, with history, birthdays and a link for each client",
      "Services, staff, opening hours, time off and holidays",
      "Your work and reviews on your booking page",
      "Alerts on your phone the moment someone books, messages or cancels",
    ],
  },
  {
    who: "Your team",
    lead: "Their own login, for their own day.",
    points: [
      "You invite them with a link on WhatsApp",
      "They see only their own appointments and the chats about them",
      "They can book customers in with themselves and add their own time off",
      "They can't see your settings, other people's bookings or your numbers",
      "You can remove their access with one tap",
    ],
  },
];

const JOURNEY = [
  { title: "You set up", body: "Your business name, hours, services and team. A few minutes, and you can change all of it later." },
  { title: "You share one link", body: "Put it in your bio and WhatsApp status, and print the QR poster for the counter or the mirror." },
  {
    title: "A customer books",
    body: "They only see times that are really free: your opening hours, each person's hours, time off and existing bookings are all taken into account, and checked again the moment they book.",
  },
  {
    title: "You hear about it",
    body: "A notification on your phone, the booking on your calendar, on the front desk screen and in your Google, Apple or Outlook calendar if you synced it.",
  },
  {
    title: "Before the visit",
    body: "The customer gets their own booking page with a chat. They can ask a question, cancel, or get an email reminder the day before. If they cancel and someone's on the waitlist, you're told a spot opened.",
  },
  { title: "After the visit", body: "You mark it done. They're asked to rate it, and the rating shows on your booking page under that person." },
  { title: "Next time", body: "They open their page, tap “Book again” and just pick a time. Their name and number are already there." },
];

const EVERYTHING: { group: string; items: string[] }[] = [
  {
    group: "Bookings and the calendar",
    items: [
      "Online booking that only offers free times",
      "Day, week and month calendar",
      "Front desk view for a tablet",
      "Time off and holidays, for one person or everyone",
      "Waitlist for fully booked days",
      "Sync to Google, Apple or Outlook calendar",
      "Book by hand for walk-ins and calls",
    ],
  },
  {
    group: "Customers",
    items: [
      "Client list that fills itself from bookings",
      "A private page per client with all their visits",
      "Join link and QR code for your existing clients",
      "Birthdays, with a ready-written WhatsApp wish",
      "Email confirmations and reminders",
    ],
  },
  {
    group: "Your booking page",
    items: [
      "Tabs: Book, Team, Our work, Reviews, Info",
      "Your colour, logo and cover photo",
      "Photos of finished work with “Book this style”",
      "Verified reviews from real appointments",
      "Printable QR poster",
    ],
  },
  {
    group: "Messages and alerts",
    items: [
      "A chat on every booking",
      "Chat requests from WhatsApp, Instagram, TikTok and four more apps",
      "Push alerts on your phone or computer",
      "One Inbox for all of it",
    ],
  },
  {
    group: "Your team",
    items: ["Staff profiles with bio, location and hours", "Ratings per person and per service", "Staff logins that see only their own day"],
  },
  {
    group: "Behind the scenes",
    items: ["Works in any currency and time zone", "No double bookings, even when two people book at once", "Dark mode", "Works on any phone, no app to install"],
  },
];

const NOT_YET = ["Taking deposits or payments online", "WhatsApp or SMS reminders (email reminders for now)", "More than one location in one account"];

/** /about — what ServiceBook is and everything it does, in plain words. */
export function AboutPage() {
  return (
    <MarketingLayout>
      <section className="bg-ink">
        <div className="mx-auto max-w-6xl px-4 pb-14 pt-12 sm:px-6 sm:pb-20 sm:pt-16 lg:px-8">
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-6xl">About ServiceBook</h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/70 sm:text-lg">
            ServiceBook is online booking, a calendar and a client list for businesses that run on appointments: barbers, salons, nail techs, makeup
            artists, spas, massage therapists, trainers and clinics. It replaces the WhatsApp back-and-forth, the paper diary and the &ldquo;who&apos;s free
            on Saturday?&rdquo; with one link your customers book from and one place you run the day.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/demo" className="inline-flex h-11 items-center gap-2 rounded-full bg-highlight px-5 text-sm font-semibold text-ink hover:bg-highlight-soft">
              Try the demo salon <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link to="/how-it-works" className="inline-flex h-11 items-center rounded-full border border-white/20 px-5 text-sm font-medium text-white hover:bg-white/10">
              How it works
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <h2 className="text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">Three people, three views</h2>
        <p className="mt-3 max-w-2xl text-stone-600">Everyone who touches a booking sees what they need and nothing else.</p>
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {PEOPLE.map((person, index) => (
            <Reveal key={person.who} delay={index * 0.06}>
              <article className="h-full rounded-3xl border border-stone-200 bg-surface p-6">
                <h3 className="text-xl font-semibold text-stone-900">{person.who}</h3>
                <p className="mt-1 text-sm text-stone-500">{person.lead}</p>
                <ul className="mt-5 space-y-2.5">
                  {person.points.map((point) => (
                    <li key={point} className="flex gap-2.5 text-[15px] leading-snug text-stone-700">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
                      {point}
                    </li>
                  ))}
                </ul>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <h2 className="text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">A booking, start to finish</h2>
          <ol className="mt-8">
            {JOURNEY.map((step, index) => (
              <Reveal key={step.title} delay={index * 0.04}>
                <li className="grid grid-cols-[3rem_1fr] gap-4 border-t border-stone-200 py-6 sm:grid-cols-[4rem_1fr_1.5fr] sm:gap-8">
                  <span className="font-display text-3xl font-semibold text-stone-300">{index + 1}</span>
                  <h3 className="text-lg font-semibold text-stone-900 sm:text-xl">{step.title}</h3>
                  <p className="col-start-2 text-[15px] leading-relaxed text-stone-600 sm:col-start-3">{step.body}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <h2 className="text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">Everything it does</h2>
        <div className="mt-10 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {EVERYTHING.map((group) => (
            <div key={group.group}>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-stone-500">{group.group}</h3>
              <ul className="mt-3 space-y-2">
                {group.items.map((item) => (
                  <li key={item} className="flex gap-2.5 text-[15px] text-stone-800">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-stone-200/70">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:px-8">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">What it doesn&apos;t do yet</h2>
            <p className="mt-3 text-stone-600">Better to say it plainly:</p>
            <ul className="mt-4 space-y-2">
              {NOT_YET.map((item) => (
                <li key={item} className="flex gap-2.5 text-[15px] text-stone-700">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-stone-400" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
            <Link to="/roadmap" className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-stone-900 underline decoration-stone-300 underline-offset-4 hover:decoration-stone-900">
              See what&apos;s coming and vote on it <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">Your data</h2>
            <ul className="mt-4 space-y-3 text-[15px] leading-relaxed text-stone-700">
              <li>Your customers and bookings belong to your business only. No one else&apos;s account can see them.</li>
              <li>Staff logins see their own appointments and nothing more. The server enforces it, not just the screens.</li>
              <li>Customers&apos; private pages use long random links, like a calendar&apos;s secret address.</li>
              <li>Passwords are stored hashed, never in plain text.</li>
            </ul>
          </div>
        </div>
      </section>

      <CtaBand />
    </MarketingLayout>
  );
}
