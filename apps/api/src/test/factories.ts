import { randomBytes } from "node:crypto";
import { vi } from "vitest";
import { fromZonedTime } from "date-fns-tz";
import { User, type UserDocument, type UserRole } from "../models/User";
import { Business, type BusinessAttributes, type BusinessDocument } from "../models/Business";
import { Service, type ServiceAttributes, type ServiceDocument } from "../models/Service";
import { Staff, type StaffAttributes } from "../models/Staff";
import { Customer, type CustomerAttributes } from "../models/Customer";
import { BusinessHours } from "../models/BusinessHours";
import { hashPassword } from "../lib/password";
import { signAccessToken } from "../lib/jwt";

/** The password of every user the factories create. */
export const TEST_PASSWORD = "test-password-42";

let sequence = 0;
function nextId(): string {
  sequence += 1;
  return `${sequence}${randomBytes(3).toString("hex")}`;
}

// bcrypt is slow on purpose, so one hash serves every factory user.
let passwordHash: Promise<string> | undefined;

async function makeUser(role: UserRole, name: string): Promise<UserDocument> {
  passwordHash ??= hashPassword(TEST_PASSWORD);
  return User.create({ name, email: `user-${nextId()}@example.com`, passwordHash: await passwordHash, role });
}

/** An owner login and their business: New York time, online booking on. */
export async function makeOwnerAndBusiness(overrides: Partial<BusinessAttributes> = {}) {
  const owner = await makeUser("OWNER", "Sam Owner");
  const id = nextId();
  const business = await Business.create({
    ownerId: owner._id,
    name: `Test Shop ${id}`,
    slug: `test-shop-${id}`,
    timezone: "America/New_York",
    currency: "USD",
    ...overrides,
  });
  return { owner, business };
}

export function makeService(business: BusinessDocument, overrides: Partial<ServiceAttributes> = {}): Promise<ServiceDocument> {
  return Service.create({ businessId: business._id, name: "Haircut", durationMinutes: 60, price: 40, ...overrides });
}

/** A staff member who offers `services`; `withLogin` also gives them a STAFF login. */
export async function makeStaff(
  business: BusinessDocument,
  { services = [], withLogin = false, ...overrides }: { services?: ServiceDocument[]; withLogin?: boolean } & Partial<StaffAttributes> = {},
) {
  const name = overrides.name ?? "Alex Staff";
  const user = withLogin ? await makeUser("STAFF", name) : undefined;
  const staff = await Staff.create({
    businessId: business._id,
    name,
    serviceIds: services.map((service) => service._id),
    userId: user?._id,
    ...overrides,
  });
  return { staff, user };
}

export function makeCustomer(business: BusinessDocument, overrides: Partial<CustomerAttributes> = {}) {
  sequence += 1;
  return Customer.create({
    businessId: business._id,
    name: "Jordan Customer",
    phone: `+1555${String(sequence).padStart(7, "0")}`,
    ...overrides,
  });
}

/**
 * The same opening hours every day except `closedDays` (0 = Sunday). Call it
 * before anything reads a staff member's availability: that is copied from
 * the business hours the first time it is read.
 */
export async function makeHours(business: BusinessDocument, open = "09:00", close = "17:00", closedDays: number[] = []) {
  await BusinessHours.deleteMany({ businessId: business._id });
  return BusinessHours.insertMany(
    Array.from({ length: 7 }, (_, dayOfWeek) => ({
      businessId: business._id,
      dayOfWeek,
      openTime: open,
      closeTime: close,
      isClosed: closedDays.includes(dayOfWeek),
    })),
  );
}

/** The Authorization header the web app sends for this user. */
export function authHeader(user: UserDocument): { Authorization: string } {
  return { Authorization: `Bearer ${signAccessToken({ userId: user.id })}` };
}

/**
 * Fixes "now". Only Date is faked: timers, the database driver and supertest
 * keep running. Undo it with vi.useRealTimers().
 */
export function freezeTime(iso: string): void {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(iso));
}

/** A wall-clock time in the business's time zone, as a UTC instant. */
export function localTime(business: BusinessDocument, dateKey: string, time: string): Date {
  return fromZonedTime(`${dateKey}T${time}:00`, business.timezone);
}

/** The calendar date `days` from today, as YYYY-MM-DD (UTC; tests use days far enough ahead). */
export function daysFromToday(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}
