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
  { status: "shipped", daysAgo: 0, kind: "design", title: "Printable QR poster", description: "An A5 or A4 poster with your logo, colour, QR code and booking link, ready to print for the counter." },
  { status: "planned", kind: "feature", title: "Take deposits with Paystack", description: "Ask for a deposit when someone books, to cut no-shows on long appointments." },
  { status: "shipped", daysAgo: 0, kind: "feature", title: "Staff logins", description: "Invite staff by link. They see only their own appointments, chats and time off." },
  { status: "shipped", daysAgo: 1, kind: "feature", title: "Reviews after appointments", description: "A short review request after each completed booking, shown on your booking page." },
  { status: "shipped", daysAgo: 0, kind: "design", title: "Your own colours on the booking page" },
  { status: "shipped", daysAgo: 0, kind: "feature", title: "Google Calendar sync", description: "Subscribe from Google, Apple or Outlook; one link for everyone or one per staff member." },
  { status: "idea", kind: "feature", title: "Multiple locations under one account" },
  { status: "shipped", daysAgo: 0, kind: "feature", title: "Waitlist when a day is fully booked" },
  { status: "shipped", daysAgo: 0, kind: "feature", title: "Birthday messages to clients" },
  { status: "idea", kind: "feature", title: "Packages and memberships", description: "Sell five sessions at once, or a monthly plan." },
  { status: "shipped", daysAgo: 0, kind: "design", title: "Larger calendar for a tablet at the front desk" },
] as const;

// Shipped since the roadmap first went live: moved to Shipped on existing roadmaps.
const NOW_SHIPPED = [
  "Printable QR poster",
  "Staff logins",
  "Reviews after appointments",
  "Your own colours on the booking page",
  "Google Calendar sync",
  "Waitlist when a day is fully booked",
  "Birthday messages to clients",
  "Larger calendar for a tablet at the front desk",
];

// Added to every roadmap that doesn't have them yet (matched by title).
const ADDED_ITEMS: Array<{ status: string; kind: string; title: string; description?: string; daysAgo?: number }> = [
  { status: "shipped", daysAgo: 0, kind: "feature", title: "Phone alerts for new bookings", description: "Notifications on your phone or computer, even when ServiceBook is closed." },
  { status: "shipped", daysAgo: 0, kind: "feature", title: "Time off and closures", description: "Block days or hours for one person or the whole business; nobody can book them." },
  { status: "shipped", daysAgo: 0, kind: "feature", title: "Customers' own page", description: "Past and upcoming visits, \"Book again\" and no retyping their details." },
  { status: "shipped", daysAgo: 1, kind: "feature", title: "Staff portfolios and ratings", description: "Photos of each person's work and how customers rate them, with \"Book this style\"." },
  { status: "planned", kind: "feature", title: "Mark appointments as paid", description: "Cash, transfer or card, with a daily and monthly takings summary." },
  { status: "planned", kind: "feature", title: "Repeat bookings", description: "Every two weeks with the same person, booked in one go." },
  { status: "idea", kind: "feature", title: "Loyalty stamps", description: "Every sixth visit free, tracked for you." },
  { status: "idea", kind: "feature", title: "Gift cards" },
  { status: "idea", kind: "feature", title: "Earnings per staff member", description: "What each person brought in this week and month, for paying commission." },
  { status: "idea", kind: "feature", title: "Book button on Instagram and Google Maps" },
  { status: "idea", kind: "feature", title: "SMS reminders for customers without WhatsApp" },
  { status: "idea", kind: "design", title: "Before and after photos on a customer's profile" },
];

/** Brings an existing roadmap up to date. Safe to run on every start. */
async function applyRoadmapUpdates(): Promise<void> {
  const now = Date.now();
  await Idea.updateMany({ title: { $in: NOW_SHIPPED }, status: { $ne: "shipped" } }, { $set: { status: "shipped", shippedAt: new Date(now) } });
  for (const [index, item] of ADDED_ITEMS.entries()) {
    // eslint-disable-next-line no-await-in-loop
    await Idea.updateOne(
      { title: item.title },
      {
        $setOnInsert: {
          title: item.title,
          description: item.description,
          kind: item.kind,
          status: item.status,
          shippedAt: item.daysAgo !== undefined ? new Date(now - item.daysAgo * DAY) : undefined,
          createdAt: new Date(now - index * 60_000),
        },
      },
      { upsert: true },
    );
  }
}

/** Fills an empty roadmap once; after that it belongs to its admins and voters. */
export async function ensureRoadmap(): Promise<void> {
  if ((await Idea.estimatedDocumentCount()) > 0) return applyRoadmapUpdates();
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
  await applyRoadmapUpdates();
}
