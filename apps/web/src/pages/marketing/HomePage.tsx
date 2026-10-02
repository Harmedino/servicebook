import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { MarketingLayout } from "../../components/marketing/MarketingLayout";
import { CtaBand, Photo, Reveal } from "../../components/marketing/primitives";
import { PHOTOS } from "../../components/marketing/photos";

// Row photos sit in a 4:3 box, so the 3:2 image renders 1.125x wider than its column.
const ROW_SIZES = "(min-width: 1152px) 576px, (min-width: 1024px) 50vw, 110vw";

const ROWS = [
  {
    id: "booking",
    title: "A booking page that's actually yours",
    body: "Your logo, your prices, your team. Customers choose a service and a time that's really free; choosing a stylist is optional. The booking lands on your calendar without anyone typing it in.",
    photo: PHOTOS.braiding,
  },
  {
    id: "chat",
    title: "The conversation doesn't stop at “booked”",
    body: "Every booking comes with its own chat. The customer gets a reply straight away and can ask about parking, reference photos or running late. You answer from one inbox, not five apps.",
    photo: PHOTOS.lashArtist,
  },
  {
    id: "calendar",
    title: "One diary for the whole team",
    body: "Day, week and month views for every staff member. Walk-ins take seconds to add, and a time someone just booked disappears from the booking page.",
    photo: PHOTOS.barberMidCut,
  },
  {
    id: "clients",
    title: "Clients add their own details",
    body: "Put the QR code on your counter or send the join link to your broadcast list. Names and numbers go straight into your client list, with every visit after that.",
    photo: PHOTOS.nailTech,
  },
];

export function HomePage() {
  return (
    <MarketingLayout>
      <section className="overflow-hidden bg-ink">
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 pb-20 pt-12 sm:px-6 sm:pt-16 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:pb-24">
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="text-[2.5rem] font-semibold leading-[1.04] tracking-tight text-white sm:text-6xl">
              Online booking for salons, barbers and spas.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-white/70 sm:text-lg">
              Share one link on WhatsApp and Instagram. Customers pick a time, and you get a calendar, a client list and every message in one place.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link to="/register" className="inline-flex h-12 items-center justify-center rounded-full bg-highlight px-6 text-[15px] font-semibold text-ink transition hover:bg-highlight-soft">
                Create your booking page
              </Link>
              <Link to="/demo" className="group inline-flex items-center justify-center gap-1.5 text-[15px] font-medium text-white">
                Try the demo <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            </div>
            <p className="mt-6 text-sm text-white/50">Free while we&apos;re in early access. Prices in naira; works in any currency.</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }}>
            {/* Cropped to 4:5 on desktop, so the image renders about 1.9x wider than its column. */}
            <Photo photo={PHOTOS.bookingOnPhone} sizes="(min-width: 1152px) 870px, (min-width: 1024px) 75vw, 110vw" className="aspect-[4/3] lg:aspect-[4/5]" eager />
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <Reveal>
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <h2 className="max-w-md text-3xl font-semibold leading-tight tracking-tight text-stone-900 sm:text-4xl">Then it all lands in one place.</h2>
            <p className="max-w-sm text-[15px] text-stone-600">
              Today&apos;s appointments, who still needs confirming, and how the month compares with last month.
            </p>
          </div>
          <Photo photo={PHOTOS.busyBarbershop} sizes="(min-width: 1152px) 1088px, 100vw" className="mt-8 aspect-[3/2] object-[50%_15%] sm:aspect-[16/9]" />
        </Reveal>
      </section>

      <section className="border-t border-stone-200/70">
        <div className="mx-auto max-w-6xl space-y-24 px-4 py-20 sm:space-y-28 sm:px-6 sm:py-24 lg:px-8">
          {ROWS.map((row, index) => (
            <div key={row.id} className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
              <Reveal className={index % 2 === 1 ? "lg:order-2" : ""}>
                <h2 className="text-3xl font-semibold leading-tight tracking-tight text-stone-900 sm:text-[2.5rem]">{row.title}</h2>
                <p className="mt-4 max-w-lg text-base leading-relaxed text-stone-600 sm:text-lg">{row.body}</p>
                <Link
                  to={`/features#${row.id === "chat" ? "inbox" : row.id}`}
                  className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-stone-900 underline decoration-stone-300 underline-offset-4 hover:decoration-stone-900"
                >
                  How it works
                </Link>
              </Reveal>
              <Reveal delay={0.1} className={index % 2 === 1 ? "lg:order-1" : ""}>
                <Photo photo={row.photo} sizes={ROW_SIZES} />
              </Reveal>
            </div>
          ))}
        </div>
      </section>

      <CtaBand />
    </MarketingLayout>
  );
}
