import { formatInTimeZone } from "date-fns-tz";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../app";
import { Booking } from "../models/Booking";
import type { BusinessDocument } from "../models/Business";
import type { ServiceDocument } from "../models/Service";
import { authHeader, freezeTime, localTime, makeCustomer, makeHours, makeOwnerAndBusiness, makeService, makeStaff } from "../test/factories";

// Slots are offered every 30 minutes; a 60-minute service in 09:00-17:00 hours
// can start at 09:00, 09:30, ..., 16:00.
const FULL_DAY = 15;

const app = createApp();

afterEach(() => {
  vi.useRealTimers();
});

async function makeShop(timezone: string) {
  const { owner, business } = await makeOwnerAndBusiness({ timezone });
  await makeHours(business, "09:00", "17:00");
  const service = await makeService(business, { durationMinutes: 60 });
  const { staff } = await makeStaff(business, { services: [service] });
  return { owner, business, service, staff };
}

async function publicSlots(business: BusinessDocument, service: ServiceDocument, date: string, staffId?: string): Promise<string[]> {
  const response = await request(app)
    .get(`/api/public/businesses/${business.slug}/availability`)
    .query({ serviceId: service.id, date, ...(staffId ? { staffId } : {}) });
  expect(response.status).toBe(200);
  return response.body.slots;
}

describe("availability across daylight-saving changes", () => {
  it.each([
    // New York: clocks go forward on 8 March 2026 and back on 1 November 2026.
    { timezone: "America/New_York", date: "2026-03-07", first: "2026-03-07T14:00:00.000Z", last: "2026-03-07T21:00:00.000Z" },
    { timezone: "America/New_York", date: "2026-03-08", first: "2026-03-08T13:00:00.000Z", last: "2026-03-08T20:00:00.000Z" },
    { timezone: "America/New_York", date: "2026-10-31", first: "2026-10-31T13:00:00.000Z", last: "2026-10-31T20:00:00.000Z" },
    { timezone: "America/New_York", date: "2026-11-01", first: "2026-11-01T14:00:00.000Z", last: "2026-11-01T21:00:00.000Z" },
    // London: forward on 29 March 2026, back on 25 October 2026.
    { timezone: "Europe/London", date: "2026-03-28", first: "2026-03-28T09:00:00.000Z", last: "2026-03-28T16:00:00.000Z" },
    { timezone: "Europe/London", date: "2026-03-29", first: "2026-03-29T08:00:00.000Z", last: "2026-03-29T15:00:00.000Z" },
    { timezone: "Europe/London", date: "2026-10-24", first: "2026-10-24T08:00:00.000Z", last: "2026-10-24T15:00:00.000Z" },
    { timezone: "Europe/London", date: "2026-10-25", first: "2026-10-25T09:00:00.000Z", last: "2026-10-25T16:00:00.000Z" },
  ])("$timezone on $date keeps 09:00-16:00 local starts", async ({ timezone, date, first, last }) => {
    freezeTime("2026-01-05T12:00:00Z");
    const { business, service, staff } = await makeShop(timezone);

    const slots = await publicSlots(business, service, date, staff.id);

    expect(slots).toHaveLength(FULL_DAY);
    expect(slots[0]).toBe(first);
    expect(slots.at(-1)).toBe(last);
  });

  it("finds bookings on the 25-hour day the clocks go back", async () => {
    freezeTime("2026-01-05T12:00:00Z");
    const { owner, business, service, staff } = await makeShop("America/New_York");
    const customer = await makeCustomer(business);
    await Booking.create({
      businessId: business._id,
      staffId: staff._id,
      serviceId: service._id,
      customerId: customer._id,
      startTime: localTime(business, "2026-11-01", "16:00"),
      endTime: localTime(business, "2026-11-01", "17:00"),
    });

    const response = await request(app)
      .get("/api/bookings/available-slots")
      .query({ serviceId: service.id, staffId: staff.id, date: "2026-11-01" })
      .set(authHeader(owner));

    expect(response.status).toBe(200);
    expect(response.body.slots).toHaveLength(FULL_DAY - 2);
    expect(response.body.slots).not.toContain("2026-11-01T20:30:00.000Z"); // 15:30 EST
    expect(response.body.slots).not.toContain("2026-11-01T21:00:00.000Z"); // 16:00 EST
  });
});

describe("availability rules", () => {
  // Monday 2026-01-12 in New York (EST, UTC-5).
  const DATE = "2026-01-12";

  it("hides slots that overlap a staff member's time off, and only theirs", async () => {
    freezeTime("2026-01-05T12:00:00Z");
    const { owner, business, service, staff } = await makeShop("America/New_York");
    const { staff: colleague } = await makeStaff(business, { name: "Pat Colleague", services: [service] });

    const timeOff = await request(app)
      .post("/api/time-off")
      .set(authHeader(owner))
      .send({ staffId: staff.id, startDate: DATE, endDate: DATE, startTime: "12:00", endTime: "14:00" });
    expect(timeOff.status).toBe(201);

    const slots = await publicSlots(business, service, DATE, staff.id);
    // 11:30-12:30 and 13:30-14:30 overlap; 11:00-12:00 and 14:00-15:00 only touch it.
    expect(slots.map((slot) => formatInTimeZone(slot, business.timezone, "HH:mm"))).toEqual([
      "09:00", "09:30", "10:00", "10:30", "11:00", "14:00", "14:30", "15:00", "15:30", "16:00",
    ]);
    expect(await publicSlots(business, service, DATE, colleague.id)).toHaveLength(FULL_DAY);
  });

  it("offers nothing on a day the whole business is closed", async () => {
    freezeTime("2026-01-05T12:00:00Z");
    const { owner, business, service, staff } = await makeShop("America/New_York");

    const closure = await request(app).post("/api/time-off").set(authHeader(owner)).send({ startDate: DATE, endDate: DATE });
    expect(closure.status).toBe(201);

    expect(await publicSlots(business, service, DATE, staff.id)).toEqual([]);
    expect(await publicSlots(business, service, "2026-01-13", staff.id)).toHaveLength(FULL_DAY);
  });

  it("offers nothing on a day the business doesn't open", async () => {
    freezeTime("2026-01-05T12:00:00Z");
    const { business, service, staff } = await makeShop("America/New_York");
    await makeHours(business, "09:00", "17:00", [0]);

    expect(await publicSlots(business, service, "2026-01-11", staff.id)).toEqual([]); // a Sunday
  });

  it("hides slots that have already started", async () => {
    freezeTime("2026-01-12T16:10:00Z"); // 11:10 in New York
    const { business, service, staff } = await makeShop("America/New_York");

    const today = await publicSlots(business, service, DATE, staff.id);
    expect(today[0]).toBe("2026-01-12T16:30:00.000Z"); // 11:30
    expect(today).toHaveLength(10);
    expect(await publicSlots(business, service, "2026-01-11", staff.id)).toEqual([]);
  });

  it("with no staff preference, offers a time when anyone who does the service is free", async () => {
    freezeTime("2026-01-05T12:00:00Z");
    const { business, service, staff } = await makeShop("America/New_York");
    await makeStaff(business, { name: "Pat Colleague", services: [service] });
    const customer = await makeCustomer(business);
    await Booking.create({
      businessId: business._id,
      staffId: staff._id,
      serviceId: service._id,
      customerId: customer._id,
      startTime: localTime(business, DATE, "10:00"),
      endTime: localTime(business, DATE, "11:00"),
    });

    expect(await publicSlots(business, service, DATE, staff.id)).not.toContain("2026-01-12T15:00:00.000Z");
    expect(await publicSlots(business, service, DATE)).toContain("2026-01-12T15:00:00.000Z");
    expect(await publicSlots(business, service, DATE, "any")).toHaveLength(FULL_DAY);
  });
});
