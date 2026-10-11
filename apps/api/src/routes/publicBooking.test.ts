import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../app";
import { ensureStaffAvailability } from "../lib/staffAvailability";
import { Booking } from "../models/Booking";
import { Customer } from "../models/Customer";
import { Message } from "../models/Message";
import { Notification } from "../models/Notification";
import type { BusinessAttributes, BusinessDocument } from "../models/Business";
import { daysFromToday, localTime, makeHours, makeOwnerAndBusiness, makeService, makeStaff } from "../test/factories";

const app = createApp();
const DATE = daysFromToday(14);

async function makeShop(overrides: Partial<BusinessAttributes> = {}) {
  const { business } = await makeOwnerAndBusiness(overrides);
  await makeHours(business, "09:00", "17:00");
  const service = await makeService(business, { name: "Beard trim", durationMinutes: 60, price: 25 });
  const { staff } = await makeStaff(business, { name: "Jamie Barber", services: [service] });
  return { business, service, staff };
}

let phoneSequence = 0;
function bookingRequest(business: BusinessDocument, body: { serviceId: string; staffId?: string; time: string; name?: string; phone?: string }) {
  phoneSequence += 1;
  return request(app)
    .post(`/api/public/businesses/${business.slug}/bookings`)
    .send({
      serviceId: body.serviceId,
      staffId: body.staffId,
      startTime: localTime(business, DATE, body.time).toISOString(),
      customer: { name: body.name ?? "Taylor Visitor", phone: body.phone ?? `+1202555${String(phoneSequence).padStart(4, "0")}`, email: "taylor@example.com" },
    });
}

describe("POST /api/public/businesses/:slug/bookings", () => {
  it("books a new customer and starts the booking's chat", async () => {
    const { business, service, staff } = await makeShop();

    const response = await bookingRequest(business, { serviceId: service.id, staffId: staff.id, time: "10:00", phone: "+12025550100" });

    expect(response.status).toBe(201);
    const { confirmation } = response.body;
    expect(confirmation).toMatchObject({
      serviceName: "Beard trim",
      staffName: "Jamie Barber",
      startTime: localTime(business, DATE, "10:00").toISOString(),
      endTime: localTime(business, DATE, "11:00").toISOString(),
      customerName: "Taylor Visitor",
      status: "PENDING",
    });
    expect(confirmation.accessToken).toEqual(expect.any(String));

    const customer = await Customer.findOne({ businessId: business._id, phone: "+12025550100" });
    expect(customer).toMatchObject({ name: "Taylor Visitor", email: "taylor@example.com", source: "booking" });
    const booking = await Booking.findOne({ businessId: business._id });
    expect(booking).toMatchObject({ status: "PENDING", price: 25, serviceName: "Beard trim", staffName: "Jamie Barber", accessToken: confirmation.accessToken });
    expect(booking?.customerId.toString()).toBe(customer?.id);
    expect(await Message.countDocuments({ bookingId: booking?._id, automated: true })).toBe(1);
    expect(await Notification.countDocuments({ businessId: business._id, type: "booking" })).toBe(1);
  });

  it("matches a returning customer by phone instead of adding a second record", async () => {
    const { business, service, staff } = await makeShop();

    expect((await bookingRequest(business, { serviceId: service.id, staffId: staff.id, time: "10:00", phone: "+12025550111" })).status).toBe(201);
    expect((await bookingRequest(business, { serviceId: service.id, staffId: staff.id, time: "14:00", phone: "+12025550111" })).status).toBe(201);

    expect(await Customer.countDocuments({ businessId: business._id })).toBe(1);
    expect(await Booking.countDocuments({ businessId: business._id })).toBe(2);
  });

  it("refuses a time that overlaps the staff member's other booking", async () => {
    const { business, service, staff } = await makeShop();
    expect((await bookingRequest(business, { serviceId: service.id, staffId: staff.id, time: "10:00" })).status).toBe(201);

    const response = await bookingRequest(business, { serviceId: service.id, staffId: staff.id, time: "10:30" });

    expect(response.status).toBe(409);
    expect(response.body.error).toMatchObject({ code: "CONFLICT", message: "This staff member already has a booking that overlaps this time" });
    expect(await Booking.countDocuments({ businessId: business._id })).toBe(1);
  });

  it("refuses times outside business hours", async () => {
    const { business, service, staff } = await makeShop();

    for (const time of ["08:00", "16:30"]) {
      const response = await bookingRequest(business, { serviceId: service.id, staffId: staff.id, time });
      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe("This time is outside business hours (09:00-17:00)");
    }
    expect(await Booking.countDocuments({ businessId: business._id })).toBe(0);
  });

  it("refuses a time in the past", async () => {
    const { business, service, staff } = await makeShop();
    const yesterday = new Date(Date.now() - 86_400_000);

    const response = await request(app)
      .post(`/api/public/businesses/${business.slug}/bookings`)
      .send({ serviceId: service.id, staffId: staff.id, startTime: yesterday.toISOString(), customer: { name: "Taylor", phone: "+12025550199" } });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe("Bookings can't be created in the past");
  });

  it("with no preference, books whoever is free", async () => {
    const { business, service, staff } = await makeShop();
    await makeStaff(business, { name: "Robin Barber", services: [service] });
    expect((await bookingRequest(business, { serviceId: service.id, staffId: staff.id, time: "10:00" })).status).toBe(201);

    const response = await bookingRequest(business, { serviceId: service.id, staffId: "any", time: "10:00" });

    expect(response.status).toBe(201);
    expect(response.body.confirmation.staffName).toBe("Robin Barber");
  });

  it("refuses booking, staff and availability requests while online booking is off", async () => {
    const { business, service, staff } = await makeShop({ isPublicBookingEnabled: false });
    const base = `/api/public/businesses/${business.slug}`;

    const booking = await bookingRequest(business, { serviceId: service.id, staffId: staff.id, time: "10:00" });
    expect(booking.status).toBe(403);
    expect(booking.body.error.message).toBe("Online booking is currently unavailable");
    expect((await request(app).get(`${base}/availability`).query({ serviceId: service.id, date: DATE })).status).toBe(403);
    expect((await request(app).get(`${base}/staff`).query({ serviceId: service.id })).status).toBe(403);

    const page = await request(app).get(base);
    expect(page.status).toBe(200);
    expect(page.body).toMatchObject({ bookingEnabled: false, services: [] });
    expect(await Booking.countDocuments({ businessId: business._id })).toBe(0);
  });

  it("answers 404 for an unknown business", async () => {
    const response = await request(app).get("/api/public/businesses/no-such-shop");
    expect(response.status).toBe(404);
  });
});

// Needs real transactions: CI runs this against a MongoDB replica set.
describe.runIf(process.env.MONGODB_REPLICA_SET === "1")("simultaneous bookings (replica set)", () => {
  it("gives one slot to exactly one of two simultaneous requests", async () => {
    const { business, service, staff } = await makeShop();
    // A staff member's availability is copied from the business hours the
    // first time it's read. Do that now, or the two requests race to copy it
    // and the loser's duplicate-key 409 would hide whether the booking lock works.
    await ensureStaffAvailability(staff.id, business.id);

    const responses = await Promise.all([
      bookingRequest(business, { serviceId: service.id, staffId: staff.id, time: "11:00", name: "First Visitor" }),
      bookingRequest(business, { serviceId: service.id, staffId: staff.id, time: "11:00", name: "Second Visitor" }),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
    const refused = responses.find((response) => response.status === 409);
    expect(refused?.body.error).toMatchObject({ code: "CONFLICT", message: "This staff member already has a booking that overlaps this time" });
    expect(await Booking.countDocuments({ staffId: staff._id, status: { $ne: "CANCELLED" } })).toBe(1);
  });
});
