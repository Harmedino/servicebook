import { Idea } from "../models/Idea";

const DAY = 86_400_000;

// The starting roadmap: what shipped recently, what's being built and planned,
// and a few open questions. Votes start at zero; real votes come from people.
const STARTING_ITEMS = [
  { status: "shipped", daysAgo: 0, kind: "feature", title: "Chat with customers after they book", description: "Every online booking gets its own chat and a private booking page, with an automatic first reply. Customers can also cancel from there." },
  { status: "shipped", daysAgo: 0, kind: "design", title: "New website and a demo salon to try", description: "Separate Home, Features, Solutions and Pricing pages, and a live demo you can book at and then open as the owner." },
  { status: "shipped", daysAgo: 1, kind: "feature", title: "Chat requests from seven apps", description: "WhatsApp, Instagram, Messenger, TikTok, X, Telegram and Snapchat. Customers leave their details first, so every chat is in your Inbox." },
  { status: "shipped", daysAgo: 1, kind: "feature", title: "Customers join your client list by link", description: "A join link and QR code; customers type their own name and number." },
  { status: "shipped", daysAgo: 1, kind: "feature", title: "Booking without choosing a staff member", description: "“Any available” is the default. The owner is booked first, then whoever has the lightest day." },
  { status: "shipped", daysAgo: 2, kind: "feature", title: "Photos for your logo, cover, services and staff" },
  { status: "shipped", daysAgo: 4, kind: "design", title: "Dark mode" },
  { status: "in_progress", kind: "feature", title: "WhatsApp reminders the day before", description: "A reminder message on WhatsApp instead of email, with a link to the customer's booking page." },
  { status: "in_progress", kind: "design", title: "Printable QR poster", description: "An A5 poster with your logo, QR code and booking link, ready to print for the counter." },
  { status: "planned", kind: "feature", title: "Take deposits with Paystack", description: "Ask for a deposit when someone books, to cut no-shows on long appointments." },
  { status: "planned", kind: "feature", title: "Staff logins", description: "Each staff member signs in to see and manage their own schedule." },
  { status: "planned", kind: "feature", title: "Reviews after appointments", description: "A short review request after each completed booking, shown on your booking page." },
  { status: "planned", kind: "design", title: "Your own colours on the booking page" },
  { status: "planned", kind: "feature", title: "Google Calendar sync" },
  { status: "idea", kind: "feature", title: "Multiple locations under one account" },
  { status: "idea", kind: "feature", title: "Waitlist when a day is fully booked" },
  { status: "idea", kind: "feature", title: "Birthday messages to clients" },
  { status: "idea", kind: "feature", title: "Packages and memberships", description: "Sell five sessions at once, or a monthly plan." },
  { status: "idea", kind: "design", title: "Larger calendar for a tablet at the front desk" },
] as const;

/** Fills an empty roadmap once; after that it belongs to its admins and voters. */
export async function ensureRoadmap(): Promise<void> {
  if ((await Idea.estimatedDocumentCount()) > 0) return;
  const now = Date.now();
  await Idea.insertMany(
    STARTING_ITEMS.map((item, index) => ({
      title: item.title,
      description: "description" in item ? item.description : undefined,
      kind: item.kind,
      status: item.status,
      shippedAt: "daysAgo" in item ? new Date(now - item.daysAgo * DAY) : undefined,
      // Keep the listed order stable within a status.
      createdAt: new Date(now - index * 60_000),
    })),
  );
}
