import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowRight, CheckCheck } from "lucide-react";
import { MarketingLayout } from "../../components/marketing/MarketingLayout";
import { BrowserFrame, CtaBand, PhoneFrame, Reveal } from "../../components/marketing/primitives";
import { LogoMark } from "../../components/Logo";

/** A WhatsApp-style thread: how the booking link actually gets used. */
function ChatMock() {
  const bubbles = [
    { from: "them", text: "Good evening 🙏 do you have space for braids on Saturday?", time: "21:47" },
    { from: "me", text: "Hi Chioma! Pick any free time here:", time: "21:48", link: true },
    { from: "them", text: "Done. Saturday 10:30 with Amaka ✅", time: "21:51" },
  ] as const;
  return (
    <div className="relative mx-auto w-full max-w-[360px]">
      <div className="overflow-hidden rounded-[2rem] bg-[#0b0f0d] p-2 shadow-[var(--shadow-screen)] ring-1 ring-white/10">
        <div className="overflow-hidden rounded-[1.6rem] bg-[#efeae2]">
          <div className="flex items-center gap-3 bg-[#1f2c34] px-4 py-3 text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#dfe5e7] text-xs font-semibold text-[#1f2c34]">CO</span>
            <div>
              <p className="text-sm font-medium">Chioma Okafor</p>
              <p className="text-[11px] text-white/60">online</p>
            </div>
          </div>
          <div className="space-y-2 px-3 pb-16 pt-4">
            {bubbles.map((bubble, index) => (
              <motion.div
                key={bubble.time}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.7, duration: 0.3 }}
                className={`flex ${bubble.from === "me" ? "justify-end" : "justify-start"}`}
              >
                <div className={`max-w-[85%] rounded-lg px-2.5 py-1.5 text-[14px] leading-snug text-[#111b21] shadow-sm ${bubble.from === "me" ? "bg-[#d9fdd3]" : "bg-white"}`}>
                  <p>{bubble.text}</p>
                  {"link" in bubble && (
                    <div className="mt-1.5 overflow-hidden rounded-md bg-[#c7f0c0]">
                      <div className="flex items-center gap-2.5 p-2">
                        <LogoMark className="h-9 w-9 shrink-0" />
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-semibold">Book with Glow Studio Lekki</p>
                          <p className="truncate text-[11px] text-[#54656f]">Hair, nails, makeup and massage</p>
                        </div>
                      </div>
                    </div>
                  )}
                  <p className="mt-0.5 flex items-center justify-end gap-1 text-[10px] text-[#667781]">
                    {bubble.time}
                    {bubble.from === "me" && <CheckCheck className="h-3 w-3 text-[#53bdeb]" aria-hidden="true" />}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 2.8, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="absolute -bottom-8 left-3 right-3 rounded-2xl bg-white p-3 shadow-[var(--shadow-elevated)] sm:-left-10 sm:right-8"
      >
        <div className="flex items-center gap-3">
          <LogoMark className="h-8 w-8 shrink-0" />
          <div className="min-w-0 text-[#1c1917]">
            <p className="text-xs text-[#78716c]">ServiceBook · just now</p>
            <p className="truncate text-sm font-semibold">New booking: Knotless braids</p>
            <p className="truncate text-xs text-[#57534e]">Chioma Okafor · Sat 10:30 · Amaka</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

const ROWS = [
  {
    id: "booking",
    title: "A booking page that's actually yours",
    body: "Your logo, your prices, your team. Customers choose a service and a time that's really free; choosing a stylist is optional. The booking lands on your calendar without anyone typing it in.",
    visual: <PhoneFrame src="/screens/slots-mobile.webp" alt="Choosing a time on the booking page" className="mx-auto w-full max-w-[280px]" />,
  },
  {
    id: "chat",
    title: "The conversation doesn't stop at “booked”",
    body: "Every booking comes with its own chat. The customer gets a reply straight away and can ask about parking, reference photos or running late. You answer from one inbox, not five apps.",
    visual: <PhoneFrame src="/screens/chat-mobile.webp" alt="Chatting with the salon after booking" className="mx-auto w-full max-w-[280px]" bar="dark" />,
  },
  {
    id: "calendar",
    title: "One diary for the whole team",
    body: "Day, week and month views for every staff member. Walk-ins take seconds to add, and a time someone just booked disappears from the booking page.",
    visual: <BrowserFrame src="/screens/calendar.webp" alt="Week view of the team calendar" path="calendar" />,
  },
  {
    id: "clients",
    title: "Clients add their own details",
    body: "Put the QR code on your counter or send the join link to your broadcast list. Names and numbers go straight into your client list, with every visit after that.",
    visual: <BrowserFrame src="/screens/customers.webp" alt="The client list" path="customers" />,
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
          <div className="pb-6 lg:pb-0">
            <ChatMock />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <Reveal>
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <h2 className="max-w-md text-3xl font-semibold leading-tight tracking-tight text-stone-900 sm:text-4xl">Then it all lands here.</h2>
            <p className="max-w-sm text-[15px] text-stone-600">
              Today&apos;s appointments, who still needs confirming, and how the month compares with last month.
            </p>
          </div>
          <BrowserFrame src="/screens/dashboard.webp" alt="The ServiceBook dashboard" className="mt-8" />
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
                {row.visual}
              </Reveal>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-surface">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 sm:py-24 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight text-stone-900 sm:text-4xl">Why I built this</h2>
          <Reveal>
            <div className="space-y-4 text-lg leading-relaxed text-stone-700">
              <p>
                I build software for small businesses. A lot of them, salons and barbers especially, run the whole day from WhatsApp and a notebook: someone
                asks for Saturday, three messages later there&apos;s a time, and nobody else on the team knows about it.
              </p>
              <p>
                ServiceBook is the tool I wanted to hand them. One link customers can book from, a diary the whole team can see, and a client list that
                doesn&apos;t live in one person&apos;s phone. It&apos;s free while it&apos;s in early access, and what gets built next comes from the people using it.
              </p>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              <p className="font-medium text-stone-900">Damilola Adebowale, builder of ServiceBook</p>
              <Link to="/roadmap" className="text-sm font-semibold text-stone-900 underline decoration-stone-300 underline-offset-4 hover:decoration-stone-900">
                See what&apos;s coming next
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <CtaBand />
    </MarketingLayout>
  );
}
