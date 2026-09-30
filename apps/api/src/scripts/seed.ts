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

export const DEMO_EMAIL = "demo@servicebook.app";
export const DEMO_PASSWORD = "password123";
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
  { name: "Tunde Bakare", email: "tunde@glowstudio.ng", phone: "+234 803 555 0101", services: [0, 1] },
  { name: "Amaka Obi", email: "amaka@glowstudio.ng", phone: "+234 803 555 0102", services: [2, 4] },
  { name: "Zainab Musa", email: "zainab@glowstudio.ng", phone: "+234 803 555 0103", services: [3, 4] },
  { name: "Kelechi Nwosu", email: "kelechi@glowstudio.ng", phone: "+234 803 555 0104", services: [5, 0] },
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
  const existing = await User.findOne({ email: DEMO_EMAIL });
  if (existing) {
    const business = await Business.findOne({ ownerId: existing.id });
    if (business) {
      const staffIds = (await Staff.find({ businessId: business.id }).select("_id")).map((s) => s._id);
      await Promise.all([
        Booking.deleteMany({ businessId: business.id }),
        Customer.deleteMany({ businessId: business.id }),
        Service.deleteMany({ businessId: business.id }),
        StaffAvailability.deleteMany({ staffId: { $in: staffIds } }),
        Staff.deleteMany({ businessId: business.id }),
        BusinessHours.deleteMany({ businessId: business.id }),
      ]);
      await business.deleteOne();
    }
    await existing.deleteOne();
  }

  const owner = await User.create({ name: "Demo Owner", email: DEMO_EMAIL, passwordHash: await hashPassword(DEMO_PASSWORD) });
  const business = await Business.create({
    ownerId: owner.id,
    name: "Glow Studio Lekki",
    slug: "glow-studio-lekki",
    description: "Hair, nails, makeup and massage in the heart of Lekki Phase 1.",
    phone: "+234 803 555 0100",
    email: "hello@glowstudio.ng",
    address: "12 Admiralty Way, Lekki Phase 1, Lagos",
    timezone: TIMEZONE,
    currency: "NGN",
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
  console.log(`Seeded ${business.name}: ${services.length} services, ${staff.length} staff, ${customers.length} customers, ${bookings.length} bookings.`);
  console.log(`Log in with ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
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
