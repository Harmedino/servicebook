import { useState, type ReactNode } from "react";
import { CalendarPlus, Check, Copy, Inbox, Scissors, Search, Users } from "lucide-react";
import type { BookingStatus, ChatMessage } from "@servicebook/types";
import { MarketingLayout } from "../../components/marketing/MarketingLayout";
import { Button, buttonClassName } from "../../components/ui/Button";
import { Badge, BookingStatusBadge } from "../../components/ui/Badge";
import { Avatar } from "../../components/ui/Avatar";
import { EmptyState } from "../../components/ui/EmptyState";
import { FormField } from "../../components/FormField";
import { Toggle } from "../../components/Toggle";
import { ServiceThumb } from "../../components/ServiceThumb";
import { ChatThread } from "../../components/chat/ChatThread";
import { LogoMark } from "../../components/Logo";

const SECTIONS = [
  { id: "principles", label: "Principles" },
  { id: "colour", label: "Colour" },
  { id: "type", label: "Type" },
  { id: "buttons", label: "Buttons" },
  { id: "forms", label: "Forms" },
  { id: "status", label: "Status" },
  { id: "people", label: "People & services" },
  { id: "chat", label: "Chat" },
  { id: "states", label: "Empty & loading" },
  { id: "icons", label: "Icons & motion" },
  { id: "writing", label: "Writing" },
];

const COLOURS: { group: string; tokens: { name: string; value: string; note?: string; dark?: boolean }[] }[] = [
  {
    group: "Brand",
    tokens: [
      { name: "ink", value: "#0c1a14", note: "Header, sidebar, dark panels", dark: true },
      { name: "ink-700", value: "#1b3528", note: "Raised on ink", dark: true },
      { name: "highlight", value: "#c5f36b", note: "One main action, on ink only" },
      { name: "paper", value: "#f6f5f0", note: "Website background" },
      { name: "surface", value: "#ffffff", note: "Cards, sheets, inputs" },
    ],
  },
  {
    group: "Green",
    tokens: [
      { name: "brand-50", value: "#ecfdf3" },
      { name: "brand-100", value: "#d1fae1" },
      { name: "brand-300", value: "#6ddda3" },
      { name: "brand-500", value: "#16a263", note: "Charts" },
      { name: "brand-600", value: "#0f8250", note: "Buttons, links", dark: true },
      { name: "brand-700", value: "#0e6843", note: "Text on green tints", dark: true },
      { name: "brand-900", value: "#0e442f", dark: true },
    ],
  },
  {
    group: "Neutral",
    tokens: [
      { name: "stone-50", value: "#fafaf9", note: "App background" },
      { name: "stone-100", value: "#f5f5f4" },
      { name: "stone-200", value: "#e7e5e4", note: "Borders" },
      { name: "stone-400", value: "#a8a29e", note: "Hints" },
      { name: "stone-500", value: "#78716c", note: "Secondary text", dark: true },
      { name: "stone-700", value: "#44403c", dark: true },
      { name: "stone-900", value: "#1c1917", note: "Main text", dark: true },
    ],
  },
];

const STATUSES: BookingStatus[] = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"];

const SAMPLE_CHAT: ChatMessage[] = [
  { id: "1", from: "business", body: "Hi Chioma! Thanks for booking Knotless braids with Amaka on Sat 3 Oct at 10:30. Need anything before then? Reply here.", automated: true, createdAt: new Date(Date.now() - 3_600_000).toISOString() },
  { id: "2", from: "customer", body: "Can I bring a reference photo?", automated: false, createdAt: new Date(Date.now() - 3_000_000).toISOString() },
  { id: "3", from: "business", body: "Yes please, bring it along.", automated: false, createdAt: new Date(Date.now() - 2_900_000).toISOString() },
];

const WRITING: { do: string; dont: string }[] = [
  { do: "Booking confirmed for Sat 3 Oct, 10:30.", dont: "Your appointment has been successfully scheduled!" },
  { do: "Couldn't load customers. Refresh the page.", dont: "Oops! Something went wrong 😬" },
  { do: "Add staff", dont: "Supercharge your team" },
  { do: "Customers pick a time that's really free.", dont: "Seamless, effortless, powerful scheduling." },
  { do: "3 bookings waiting for you to confirm", dont: "You have pending items that require your attention" },
];

function Section({ id, title, intro, children }: { id: string; title: string; intro?: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-stone-200 py-12 first:border-t-0 first:pt-0">
      <h2 className="text-2xl font-semibold tracking-tight text-stone-900">{title}</h2>
      {intro && <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-stone-600">{intro}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Swatch({ name, value, note, dark }: { name: string; value: string; note?: string; dark?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        });
      }}
      className="group overflow-hidden rounded-2xl border border-stone-200 bg-surface text-left"
      title={`Copy ${value}`}
    >
      <span className="flex h-20 items-end justify-end p-2" style={{ backgroundColor: value }}>
        <span className={`rounded-md px-1.5 py-0.5 text-[11px] opacity-0 transition group-hover:opacity-100 ${dark ? "bg-white/15 text-white" : "bg-black/10 text-black"}`}>
          {copied ? <Check className="h-3 w-3" aria-hidden="true" /> : <Copy className="h-3 w-3" aria-hidden="true" />}
        </span>
      </span>
      <span className="block px-3 py-2.5">
        <span className="block text-sm font-medium text-stone-900">{name}</span>
        <span className="block font-mono text-xs text-stone-500">{value}</span>
        {note && <span className="mt-0.5 block text-xs text-stone-500">{note}</span>}
      </span>
    </button>
  );
}

export function DesignPage() {
  const [toggle, setToggle] = useState(true);
  const [field, setField] = useState("Glow Studio Lekki");

  return (
    <MarketingLayout>
      <section className="bg-ink">
        <div className="mx-auto max-w-6xl px-4 pb-12 pt-12 sm:px-6 sm:pb-14 sm:pt-16 lg:px-8">
          <div className="flex items-center gap-3">
            <LogoMark className="h-10 w-10" onDark />
            <p className="text-sm text-white/60">ServiceBook</p>
          </div>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white sm:text-6xl">Design system</h1>
          <p className="mt-4 max-w-xl text-base text-white/65 sm:text-lg">
            The colours, type, components and writing rules ServiceBook is built from. Every new screen starts here, so the product keeps feeling like one
            thing.
          </p>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[180px_minmax(0,1fr)] lg:px-8">
        <nav className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 lg:sticky lg:top-24 lg:mx-0 lg:flex-col lg:self-start lg:px-0" aria-label="Sections">
          {SECTIONS.map((section) => (
            <a key={section.id} href={`#${section.id}`} className="shrink-0 rounded-lg px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100 hover:text-stone-900">
              {section.label}
            </a>
          ))}
        </nav>

        <div className="min-w-0">
          <Section id="principles" title="Principles">
            <ol className="grid gap-x-10 gap-y-6 sm:grid-cols-2">
              {[
                ["Show the work", "Screens lead with the customer's name, the time and the money. Decoration comes last, if at all."],
                ["One loud colour", "Lime appears only on ink, and only on the single most important action on that screen."],
                ["Plain words", "Say what happens: “Cancel booking”, not “Manage appointment”. See the writing rules below."],
                ["Phones first", "Every screen is designed at 375px wide, then given more room. Nothing scrolls sideways."],
              ].map(([title, body], index) => (
                <li key={title} className="flex gap-4">
                  <span className="font-display text-2xl font-semibold text-stone-300">{index + 1}</span>
                  <span>
                    <span className="block font-semibold text-stone-900">{title}</span>
                    <span className="mt-1 block text-[15px] leading-relaxed text-stone-600">{body}</span>
                  </span>
                </li>
              ))}
            </ol>
          </Section>

          <Section id="colour" title="Colour" intro="Tokens live in index.css. Dark mode swaps the neutral and tint values; component code never changes. Click a swatch to copy it.">
            <div className="space-y-8">
              {COLOURS.map((group) => (
                <div key={group.group}>
                  <p className="text-sm font-medium text-stone-500">{group.group}</p>
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {group.tokens.map((token) => (
                      <Swatch key={token.name} {...token} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section id="type" title="Type" intro="Bricolage Grotesque for headings and numbers, Geist for everything else. Both are self-hosted variable fonts.">
            <div className="divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-surface">
              {[
                ["Display · 56", "font-display text-5xl font-semibold tracking-tight sm:text-[3.5rem]", "Online booking"],
                ["Heading · 28", "font-display text-[1.75rem] font-semibold tracking-tight", "Good evening, Ada"],
                ["Title · 18", "text-lg font-semibold", "Knotless braids with Amaka"],
                ["Body · 15/16", "text-base", "Customers pick a time that's really free."],
                ["Small · 13", "text-[13px] text-stone-500", "Revenue this month"],
                ["Mono · 13", "font-mono text-[13px]", "/book/glow-studio-lekki"],
              ].map(([label, className, sample]) => (
                <div key={label} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-baseline sm:gap-6">
                  <span className="w-28 shrink-0 text-xs text-stone-400">{label}</span>
                  <span className={`min-w-0 truncate text-stone-900 ${className}`}>{sample}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section id="buttons" title="Buttons" intro="One primary button per view. Secondary for the alternatives, ghost for low-stakes actions, danger only for things that can't be undone.">
            <div className="space-y-5 rounded-2xl border border-stone-200 bg-surface p-5">
              <div className="flex flex-wrap items-center gap-3">
                <Button>Save changes</Button>
                <Button variant="secondary">Reschedule</Button>
                <Button variant="ghost">Skip</Button>
                <Button variant="danger">Cancel booking</Button>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm">Small</Button>
                <Button size="md">Medium</Button>
                <Button size="lg">Large</Button>
                <Button isLoading>Saving…</Button>
                <Button disabled>Disabled</Button>
              </div>
              <div className="flex flex-wrap items-center gap-3 rounded-xl bg-ink p-4">
                <span className="inline-flex h-11 items-center rounded-full bg-highlight px-5 text-sm font-semibold text-ink">On ink: the one main action</span>
                <span className="inline-flex h-11 items-center rounded-full border border-white/20 px-5 text-sm font-medium text-white">Secondary on ink</span>
              </div>
            </div>
            <p className="mt-3 font-mono text-xs text-stone-500">{buttonClassName("primary", "md")}</p>
          </Section>

          <Section id="forms" title="Forms" intro="Labels above fields, errors under them in plain language. Inputs are 16px on phones so iOS doesn't zoom.">
            <div className="grid gap-5 rounded-2xl border border-stone-200 bg-surface p-5 sm:grid-cols-2">
              <FormField label="Business name" type="text" value={field} onChange={setField} />
              <FormField label="Email" type="email" value="not-an-email" onChange={() => undefined} error="Enter a valid email address" />
              <label className="block">
                <span className="text-sm font-medium text-stone-700">Search</span>
                <span className="relative mt-1 block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" aria-hidden="true" />
                  <input readOnly placeholder="Search customers…" className="w-full rounded-lg border border-stone-300 bg-surface py-2 pl-9 pr-3 text-sm" />
                </span>
              </label>
              <div className="flex items-center justify-between gap-4 rounded-xl border border-stone-200 p-3">
                <span className="text-sm text-stone-700">Online booking is on</span>
                <Toggle checked={toggle} onChange={setToggle} label="Online booking" />
              </div>
            </div>
          </Section>

          <Section id="status" title="Status" intro="Every booking status has one colour, used the same way everywhere: badges, calendar blocks and list accents.">
            <div className="flex flex-wrap gap-2 rounded-2xl border border-stone-200 bg-surface p-5">
              {STATUSES.map((status) => (
                <BookingStatusBadge key={status} status={status} />
              ))}
              <span className="mx-2 w-px self-stretch bg-stone-200" />
              <Badge tone="brand">Joined via link</Badge>
              <Badge tone="neutral">Inactive</Badge>
            </div>
          </Section>

          <Section id="people" title="People & services" intro="Photos when there are some; otherwise initials for people and a two-letter monogram for services. Never an emoji or a clip-art icon.">
            <div className="flex flex-wrap items-end gap-6 rounded-2xl border border-stone-200 bg-surface p-5">
              {(["xs", "sm", "md", "lg"] as const).map((size) => (
                <div key={size} className="flex flex-col items-center gap-2">
                  <Avatar name="Amaka Obi" size={size} />
                  <span className="text-xs text-stone-400">{size}</span>
                </div>
              ))}
              <span className="w-px self-stretch bg-stone-200" />
              {["Knotless Braids", "Gel Manicure", "Deep Tissue Massage"].map((name) => (
                <div key={name} className="flex flex-col items-center gap-2">
                  <ServiceThumb name={name} className="h-14 w-14 rounded-2xl" />
                  <span className="text-xs text-stone-400">{name.split(" ")[0]}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section id="chat" title="Chat" intro="The same thread component on both sides. Your own messages are ink on the right; the other side is grey on the left. Automatic messages say so.">
            <div className="max-w-md rounded-2xl border border-stone-200 bg-surface p-4">
              <ChatThread messages={SAMPLE_CHAT} me="business" onSend={async () => undefined} timezone="Africa/Lagos" disabled disabledText="Preview only" className="h-[320px]" />
            </div>
          </Section>

          <Section id="states" title="Empty & loading" intro="Empty states say what will appear and how to make it happen. Loading uses a shimmer shaped like the content, not a spinner in the middle of the page.">
            <div className="grid gap-4 sm:grid-cols-2">
              <EmptyState icon={Inbox} title="No messages yet" description="When a customer writes before their visit, it shows up here." />
              <div className="space-y-3 rounded-xl border border-stone-200 bg-surface p-5">
                {[0, 1, 2].map((row) => (
                  <div key={row} className="flex items-center gap-3">
                    <span className="skeleton-shimmer h-10 w-10 rounded-full bg-stone-200/70" />
                    <span className="flex-1 space-y-2">
                      <span className="skeleton-shimmer block h-3 w-2/3 rounded bg-stone-200/70" />
                      <span className="skeleton-shimmer block h-3 w-1/3 rounded bg-stone-200/70" />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Section>

          <Section id="icons" title="Icons & motion">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-stone-200 bg-surface p-5">
                <div className="flex gap-4 text-stone-800">
                  {[CalendarPlus, Users, Scissors, Inbox].map((Icon, index) => (
                    <Icon key={index} className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
                  ))}
                </div>
                <p className="mt-4 text-sm leading-relaxed text-stone-600">
                  Lucide line icons at 1.75 stroke, in the text colour. No coloured tiles behind icons; brand logos only for the chat apps they stand for.
                </p>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-surface p-5">
                <ul className="space-y-2 text-sm text-stone-600">
                  <li>
                    <span className="font-medium text-stone-900">200ms</span> for hovers, toggles and tabs
                  </li>
                  <li>
                    <span className="font-medium text-stone-900">Springs</span> for sheets and anything you can drag
                  </li>
                  <li>
                    <span className="font-medium text-stone-900">Once</span>: things fade in as they scroll into view, never again
                  </li>
                  <li>Reduced-motion settings turn all of it off.</li>
                </ul>
              </div>
            </div>
          </Section>

          <Section id="writing" title="Writing" intro="Most of what makes software feel generated is the wording. These rules apply to every label, message and page.">
            <ul className="grid gap-x-10 gap-y-3 text-[15px] text-stone-700 sm:grid-cols-2">
              {[
                "Say what happens, not how great it is.",
                "Use the customer's words: booking, time, WhatsApp, DM.",
                "Names, times and amounts beat adjectives.",
                "Sentence case everywhere, including buttons.",
                "No emoji in the interface. Customers can use them in chat.",
                "Errors say what went wrong and what to do next.",
              ].map((rule) => (
                <li key={rule} className="border-l-2 border-stone-200 pl-3">
                  {rule}
                </li>
              ))}
            </ul>
            <div className="mt-8 overflow-hidden rounded-2xl border border-stone-200">
              <div className="grid grid-cols-2 bg-stone-50 text-sm font-medium">
                <p className="px-4 py-2.5 text-emerald-800">Write this</p>
                <p className="px-4 py-2.5 text-red-700">Not this</p>
              </div>
              {WRITING.map((row) => (
                <div key={row.do} className="grid grid-cols-2 border-t border-stone-200 bg-surface text-sm">
                  <p className="px-4 py-3 text-stone-900">{row.do}</p>
                  <p className="px-4 py-3 text-stone-400 line-through decoration-stone-300">{row.dont}</p>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </div>
    </MarketingLayout>
  );
}
