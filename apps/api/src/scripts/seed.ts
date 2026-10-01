/**
 * Seeds a realistic demo business (owner login: demo@servicebook.app / password123).
 * Safe to re-run: it deletes and recreates only the demo owner's data.
 *
 *   pnpm --filter api seed
 */
import { fromZonedTime } from "date-fns-tz";
import { connectDatabase, disconnectDatabase } from "../lib/database";
import { hashPassword } from "../lib/password";
import { User } from "../models/User";
import { Business } from "../models/Business";
import { BusinessHours } from "../models/BusinessHours";
import { Service } from "../models/Service";
import { Staff } from "../models/Staff";
import { StaffAvailability } from "../models/StaffAvailability";
import { Customer } from "../models/Customer";
import { Booking, type BookingStatus } from "../models/Booking";
import { Enquiry } from "../models/Enquiry";
import { Message } from "../models/Message";
import { Notification } from "../models/Notification";
import { Review } from "../models/Review";
import { WorkPost } from "../models/WorkPost";
import { publicName } from "../lib/ratings";

import { DEMO_EMAIL, DEMO_PASSWORD, DEMO_SLUG } from "../lib/demo";

export { DEMO_EMAIL, DEMO_PASSWORD };
const TIMEZONE = "Africa/Lagos";

const SERVICES = [
  { name: "Signature Haircut", durationMinutes: 45, price: 8000, description: "Consultation, wash, cut and style." },
  { name: "Beard Sculpt & Line-up", durationMinutes: 30, price: 5000, description: "Hot towel, precision line-up and oil." },
  { name: "Knotless Braids", durationMinutes: 180, price: 35000, description: "Mid-back length, hair included." },
  { name: "Gel Manicure", durationMinutes: 60, price: 12000, description: "Shape, cuticle care and long-wear gel." },
  { name: "Full Glam Makeup", durationMinutes: 90, price: 25000, description: "Skin prep, full face and lashes." },
  { name: "Deep Tissue Massage", durationMinutes: 60, price: 20000, description: "Targeted pressure for tension relief." },
];

// Which services each staff member performs (indexes into SERVICES).
const STAFF = [
  {
    name: "Tunde Bakare", email: "tunde@glowstudio.ng", phone: "+234 803 555 0101", services: [0, 1],
    title: "Senior barber",
    bio: "Nine years on the clippers. Clean fades, sharp line-ups and beards that grow in the right direction.",
  },
  {
    name: "Amaka Obi", email: "amaka@glowstudio.ng", phone: "+234 803 555 0102", services: [2, 4],
    title: "Braids & bridal",
    bio: "Knotless, boho and cornrows that don't pull. Books out on Saturdays, so plan ahead for weddings.",
  },
  {
    name: "Zainab Musa", email: "zainab@glowstudio.ng", phone: "+234 803 555 0103", services: [3, 4],
    title: "Nail tech & makeup",
    bio: "Gel sets that last three weeks and soft glam that photographs well.",
  },
  {
    name: "Kelechi Nwosu", email: "kelechi@glowstudio.ng", phone: "+234 803 555 0104", services: [5, 0],
    title: "Massage therapist",
    bio: "Deep tissue and sports massage. Also cuts on busy days.",
  },
];

const FIRST = ["Chioma", "Emeka", "Funmi", "Ibrahim", "Ngozi", "Seyi", "Aisha", "Tobi", "Kemi", "Daniel", "Halima", "Uche", "Bola", "Yemi", "Ada", "Femi", "Nneka", "Sadiq", "Lola", "Chidi"];
const LAST = ["Okafor", "Adeyemi", "Balogun", "Eze", "Lawal", "Okoro", "Bello", "Adebayo", "Nwachukwu", "Ogunleye"];

// Deterministic pseudo-random so the demo looks the same on every seed.
let state = 42;
const rand = () => ((state = (state * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = <T,>(items: T[]): T => items[Math.floor(rand() * items.length)];

function dateKey(offsetDays: number): string {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  return d.toLocaleDateString("en-CA", { timeZone: TIMEZONE });
}

export async function seedDemo(): Promise<void> {
  state = 42;
  const existing = await User.findOne({ email: DEMO_EMAIL });
  if (existing) {
    const business = await Business.findOne({ ownerId: existing.id });
    if (business) {
      const staffIds = (await Staff.find({ businessId: business.id }).select("_id")).map((s) => s._id);
      await Promise.all([
        Booking.deleteMany({ businessId: business.id }),
        Customer.deleteMany({ businessId: business.id }),
        Enquiry.deleteMany({ businessId: business.id }),
        Message.deleteMany({ businessId: business.id }),
        Review.deleteMany({ businessId: business.id }),
        WorkPost.deleteMany({ businessId: business.id }),
        Notification.deleteMany({ businessId: business.id }),
        Service.deleteMany({ businessId: business.id }),
        StaffAvailability.deleteMany({ staffId: { $in: staffIds } }),
        Staff.deleteMany({ businessId: business.id }),
        BusinessHours.deleteMany({ businessId: business.id }),
      ]);
      await business.deleteOne();
    }
    await existing.deleteOne();
  }

  const owner = await User.create({ name: "Ada Nwosu", email: DEMO_EMAIL, passwordHash: await hashPassword(DEMO_PASSWORD) });
  const business = await Business.create({
    ownerId: owner.id,
    name: "Glow Studio Lekki",
    slug: DEMO_SLUG,
    description: "Hair, nails, makeup and massage in the heart of Lekki Phase 1.",
    phone: "+234 803 555 0100",
    email: "hello@glowstudio.ng",
    address: "12 Admiralty Way, Lekki Phase 1, Lagos",
    timezone: TIMEZONE,
    currency: "NGN",
    ownerStaffAnswered: true,
    emailNotificationsEnabled: false,
    socials: {
      instagram: "servicebook_demo_salon",
      tiktok: "servicebook_demo_salon",
      facebook: "servicebook.demo.salon",
      telegram: "servicebook_demo_salon",
      x: "servicebook_demo",
    },
  });

  // Mon-Sat 9:00-19:00, closed Sunday.
  const hours = [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
    businessId: business.id,
    dayOfWeek,
    isClosed: dayOfWeek === 0,
    openTime: "09:00",
    closeTime: "19:00",
  }));
  await BusinessHours.insertMany(hours);

  const services = await Service.insertMany(SERVICES.map((s) => ({ ...s, businessId: business.id })));
  const staff = await Staff.insertMany(
    STAFF.map((s) => ({
      businessId: business.id,
      name: s.name,
      email: s.email,
      phone: s.phone,
      title: s.title,
      bio: s.bio,
      serviceIds: s.services.map((i) => services[i]._id),
    })),
  );
  for (const [i, s] of STAFF.entries()) {
    await Service.updateMany({ _id: { $in: s.services.map((j) => services[j]._id) } }, { $addToSet: { staffIds: staff[i]._id } });
    await StaffAvailability.insertMany(
      hours.map((h) => ({ staffId: staff[i]._id, dayOfWeek: h.dayOfWeek, isOff: h.isClosed, startTime: h.openTime, endTime: h.closeTime })),
    );
  }

  const customers = await Customer.insertMany(
    Array.from({ length: 24 }, (_, i) => {
      const name = `${FIRST[i % FIRST.length]} ${LAST[(i * 3) % LAST.length]}`;
      return {
        businessId: business.id,
        name,
        phone: `+234 80${(i % 9) + 1} 555 ${String(1000 + i * 37).slice(-4)}`,
        email: `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
        notes: i % 5 === 0 ? "Prefers afternoon appointments." : undefined,
        source: i % 4 === 1 ? "link" : i % 3 === 0 ? "booking" : "manual",
      };
    }),
  );

  // Fill each staff member's days with non-overlapping appointments, 45 days back to 14 ahead.
  const bookings = [];
  for (let offset = -45; offset <= 14; offset += 1) {
    const key = dateKey(offset);
    const [y, m, d] = key.split("-").map(Number);
    if (new Date(y, m - 1, d).getDay() === 0) continue;
    for (const [si, member] of STAFF.entries()) {
      let minute = 9 * 60 + Math.floor(rand() * 4) * 30;
      const perDay = offset > 0 ? 1 + Math.floor(rand() * 3) : 2 + Math.floor(rand() * 4);
      for (let n = 0; n < perDay; n += 1) {
        const service = services[pick(member.services)];
        if (minute + service.durationMinutes > 19 * 60) break;
        const hh = String(Math.floor(minute / 60)).padStart(2, "0");
        const mm = String(minute % 60).padStart(2, "0");
        const startTime = fromZonedTime(`${key}T${hh}:${mm}:00`, TIMEZONE);
        const endTime = new Date(startTime.getTime() + service.durationMinutes * 60_000);
        const past = endTime.getTime() < Date.now();
        const roll = rand();
        const status: BookingStatus = past
          ? roll < 0.8 ? "COMPLETED" : roll < 0.92 ? "CANCELLED" : "NO_SHOW"
          : roll < 0.75 ? "CONFIRMED" : roll < 0.95 ? "PENDING" : "CANCELLED";
        bookings.push({
          businessId: business.id,
          staffId: staff[si]._id,
          serviceId: service._id,
          customerId: pick(customers)._id,
          startTime,
          endTime,
          status,
          price: service.price,
          serviceName: service.name,
          staffName: member.name,
          createdAt: new Date(startTime.getTime() - (2 + Math.floor(rand() * 10)) * 86_400_000),
        });
        minute += service.durationMinutes + (rand() < 0.5 ? 30 : 60);
      }
    }
  }
  await Booking.insertMany(bookings);

  // Reviews on most recent completed appointments, so ratings and the showcase have something real in them.
  // Comments that fit the service, so a makeup review never talks about a fade.
  const PRAISE: Record<string, string[]> = {
    "Signature Haircut": ["Best fade I've had in Lagos. He took his time with the line-up.", "Came with a reference photo and it came out exactly like it."],
    "Beard Sculpt & Line-up": ["Beard has never looked this even. The hot towel is a nice touch.", "Sharp line-up, in and out in 30 minutes."],
    "Knotless Braids": ["Neat, fast and no pulling. I'm booking again next month.", "Parts are so clean. Still looks fresh after three weeks."],
    "Gel Manicure": ["Very gentle and the place was spotless.", "Two weeks in and not a single chip."],
    "Full Glam Makeup": ["Soft glam exactly like I asked. Lasted the whole wedding.", "Skin looked like skin, not cake. Loved it."],
    "Deep Tissue Massage": ["Firm pressure, found every knot in my shoulders.", "Walked out feeling ten years younger."],
  };
  const MIXED: Record<number, string[]> = {
    4: ["Great result, I just waited about 15 minutes to start.", "Lovely work. Parking was a bit tight.", ""],
    3: ["Good, but not quite what I asked for."],
  };
  const completed = await Booking.find({ businessId: business.id, status: "COMPLETED" }).sort({ startTime: -1 }).limit(60);
  const reviewDocs = completed
    .filter(() => rand() < 0.7)
    .map((booking) => {
      const roll = rand();
      const rating = roll < 0.72 ? 5 : roll < 0.94 ? 4 : 3;
      const customer = customers.find((entry) => entry._id.equals(booking.customerId));
      // Left a few hours after the appointment, but never in the future.
      const createdAt = new Date(Math.min(booking.endTime.getTime() + (1 + Math.floor(rand() * 20)) * 3_600_000, Date.now() - 10 * 60_000));
      return {
        businessId: business.id,
        bookingId: booking._id,
        staffId: booking.staffId,
        serviceId: booking.serviceId,
        customerId: booking.customerId,
        customerName: publicName(customer?.name ?? "Customer"),
        serviceName: booking.serviceName,
        staffName: booking.staffName,
        rating,
        comment: (rating === 5 ? pick([...(PRAISE[booking.serviceName ?? ""] ?? []), ""]) : pick(MIXED[rating])) || undefined,
        reply: rating < 5 && rand() < 0.6 ? "Thank you for the honest feedback, we're on it." : undefined,
        createdAt,
        updatedAt: createdAt,
      };
    });
  await Review.insertMany(reviewDocs, { timestamps: false } as never);

  // A few booking chats: the automatic welcome, the customer's question and, for some, the salon's reply.
  const inserted = await Booking.find({ businessId: business.id, startTime: { $gt: new Date() }, status: { $in: ["PENDING", "CONFIRMED"] } })
    .sort({ startTime: 1 })
    .limit(3);
  const threads = [
    { ask: "Hi, can I bring a reference photo for the style I want?", reply: "Of course! Send it here or show Amaka when you arrive.", minutesAgo: 190 },
    { ask: "Is there parking close by? Coming from Ajah.", reply: "Yes, free parking right in front of the building.", minutesAgo: 75 },
    { ask: "I might be 10 minutes late because of traffic, is that ok?", reply: null, minutesAgo: 6 },
  ];
  for (const [index, booking] of inserted.entries()) {
    const thread = threads[index];
    const customer = customers.find((entry) => entry._id.equals(booking.customerId));
    const at = (minutes: number) => new Date(Date.now() - minutes * 60_000);
    booking.set("accessToken", `demo${index}${booking.id}`);
    await booking.save();
    const base = { businessId: business.id, bookingId: booking._id, customerId: booking.customerId };
    await Message.insertMany([
      {
        ...base,
        from: "business",
        automated: true,
        body: `Hi ${customer?.name.split(" ")[0] ?? "there"}! Thanks for booking ${booking.serviceName}. Need anything before then? Reply here and we'll get back to you.`,
        readAt: at(thread.minutesAgo),
        createdAt: at(thread.minutesAgo + 30),
      },
      { ...base, from: "customer", body: thread.ask, readAt: thread.reply ? at(thread.minutesAgo - 5) : null, createdAt: at(thread.minutesAgo) },
      ...(thread.reply ? [{ ...base, from: "business", body: thread.reply, readAt: null, createdAt: at(thread.minutesAgo - 6) }] : []),
    ]);
  }

  // Recent activity for the notification bell.
  const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000);
  await Notification.insertMany([
    { businessId: business.id, type: "message", title: "Message from Nneka Nwachukwu", body: "I might be 10 minutes late because of traffic, is that ok?", link: "/inbox?tab=messages", createdAt: ago(6) },
    { businessId: business.id, type: "enquiry", title: "A customer wants to chat on Instagram", body: "Knotless Braids · Do you have space this Saturday morning?", link: "/inbox?tab=requests", createdAt: ago(14) },
    { businessId: business.id, type: "booking", title: "New booking: Signature Haircut", body: "Daniel Adebayo · with Kelechi Nwosu", link: "/bookings", createdAt: ago(75) },
    { businessId: business.id, type: "signup", title: "Yemi Ogunleye joined your client list", body: "From your join link", link: "/customers?sort=newest", createdAt: ago(160), readAt: ago(120) },
    { businessId: business.id, type: "cancellation", title: "Tobi Lawal cancelled", body: "Gel Manicure · tomorrow", link: "/bookings", createdAt: ago(300), readAt: ago(200) },
  ]);

  // A few chats started from the booking page, so the Inbox isn't empty.
  const enquiries = [
    { channel: "instagram", minutesAgo: 14, status: "new", service: 2, message: "Do you have space this Saturday morning? Mid-back length." },
    { channel: "whatsapp", minutesAgo: 95, status: "new", service: 4, message: "Bridal trial before my wedding in December. How much for two looks?" },
    { channel: "tiktok", minutesAgo: 60 * 5, status: "contacted", service: 3, message: "Saw your nail video! Can I get the same design?" },
    { channel: "whatsapp", minutesAgo: 60 * 26, status: "booked", service: 0, message: "" },
    { channel: "facebook", minutesAgo: 60 * 50, status: "closed", service: undefined, message: "Are you open on public holidays?" },
  ] as const;
  await Enquiry.insertMany(
    enquiries.map((entry, index) => {
      const customer = customers[(index * 5 + 3) % customers.length];
      const service = entry.service === undefined ? undefined : services[entry.service];
      const createdAt = new Date(Date.now() - entry.minutesAgo * 60_000);
      return {
        businessId: business.id,
        customerId: customer._id,
        channel: entry.channel,
        reference: `SB-${["K7Q2M", "R4TXN", "H9WJ3", "P2LZD", "F6CUV"][index]}`,
        name: customer.name,
        phone: customer.phone,
        serviceId: service?._id,
        serviceName: service?.name,
        message: entry.message || undefined,
        status: entry.status,
        createdAt,
        updatedAt: createdAt,
      };
    }),
  );
  console.log(`Seeded ${business.name}: ${services.length} services, ${staff.length} staff, ${customers.length} customers, ${bookings.length} bookings.`);
  console.log(`Log in with ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

const DEMO_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * Keeps the public demo usable without anyone running the seed by hand:
 * creates it when missing, and rebuilds it every day, or sooner if visitors
 * have paused online booking, renamed it or deleted most of its services.
 */
export async function ensureDemo(): Promise<void> {
  const owner = await User.findOne({ email: DEMO_EMAIL });
  const business = owner ? await Business.findOne({ ownerId: owner.id }) : null;
  if (business) {
    const [upcoming, services, reviewed] = await Promise.all([
      Booking.exists({ businessId: business.id, startTime: { $gt: new Date(Date.now() + 3 * 86_400_000) } }),
      Service.countDocuments({ businessId: business.id, isActive: true }),
      Review.exists({ businessId: business.id }),
    ]);
    const fresh = Date.now() - business.createdAt.getTime() < DEMO_MAX_AGE_MS;
    const intact = business.isPublicBookingEnabled && business.name === "Glow Studio Lekki" && business.slug === DEMO_SLUG;
    if (fresh && intact && upcoming && reviewed && services >= 3) return;
  } else if (await Business.exists({ slug: DEMO_SLUG })) {
    return; // Someone else owns the demo's slug; leave their business alone.
  }
  await seedDemo();
}

// Run directly: `tsx src/scripts/seed.ts`
if (process.argv[1]?.endsWith("seed.ts") || process.argv[1]?.endsWith("seed.js")) {
  connectDatabase()
    .then(seedDemo)
    .then(disconnectDatabase)
    .catch((error: unknown) => {
      console.error(error);
      process.exit(1);
    });
}
