import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../app";
import { Booking } from "../models/Booking";
import { Staff } from "../models/Staff";
import type { BusinessDocument } from "../models/Business";
import type { CustomerDocument } from "../models/Customer";
import type { ServiceDocument } from "../models/Service";
import type { StaffDocument } from "../models/Staff";
import type { UserDocument } from "../models/User";
import { authHeader, daysFromToday, localTime, makeCustomer, makeHours, makeOwnerAndBusiness, makeService, makeStaff } from "../test/factories";
import { staffMayCall } from "./staffAccess";

const app = createApp();
const DATE = daysFromToday(14);

let owner: UserDocument;
let business: BusinessDocument;
let service: ServiceDocument;
let customer: CustomerDocument;
let me: StaffDocument;
let myLogin: UserDocument;
let colleague: StaffDocument;

beforeAll(async () => {
  ({ owner, business } = await makeOwnerAndBusiness());
  await makeHours(business, "09:00", "17:00");
  service = await makeService(business);
  customer = await makeCustomer(business);
  const mine = await makeStaff(business, { name: "Drew Staff", services: [service], withLogin: true });
  me = mine.staff;
  myLogin = mine.user!;
  ({ staff: colleague } = await makeStaff(business, { name: "Pat Colleague", services: [service] }));
});

function bookFor(staff: StaffDocument, time: string) {
  return request(app)
    .post("/api/bookings")
    .set(authHeader(owner))
    .send({ customerId: customer.id, serviceId: service.id, staffId: staff.id, startTime: localTime(business, DATE, time).toISOString() });
}

describe("staffMayCall", () => {
  it.each([
    ["GET", "/api/bookings", true],
    ["PATCH", "/api/bookings/0123456789abcdef01234567", true],
    ["POST", "/api/customers", true],
    ["PATCH", "/api/customers/0123456789abcdef01234567", false],
    ["PATCH", "/api/business", false],
    ["GET", "/api/dashboard", false],
    ["POST", "/api/services", false],
    ["POST", "/api/team/0123456789abcdef01234567/invite", false],
  ])("%s %s → %s", (method, path, allowed) => {
    expect(staffMayCall(method, path)).toBe(allowed);
  });
});

describe("a staff login", () => {
  it("is refused the owner's routes", async () => {
    const requests = [
      request(app).patch("/api/business").send({ name: "Taken over" }),
      request(app).get("/api/dashboard"),
      request(app).post("/api/services").send({ name: "Free cuts", durationMinutes: 30, price: 0 }),
      request(app).post(`/api/team/${colleague.id}/invite`),
      request(app).delete(`/api/team/${colleague.id}/access`),
      request(app).patch(`/api/customers/${customer.id}`).send({ name: "Renamed" }),
    ];
    for (const pending of requests) {
      const response = await pending.set(authHeader(myLogin));
      expect(response.status).toBe(403);
      expect(response.body.error.message).toBe("Only the business owner can do this");
    }
  });

  it("can look up customers and services", async () => {
    expect((await request(app).get(`/api/customers/${customer.id}`).set(authHeader(myLogin))).status).toBe(200);
    expect((await request(app).get("/api/services").set(authHeader(myLogin))).status).toBe(200);
  });

  it("only sees their own bookings, whatever staffId it asks for", async () => {
    const mine = (await bookFor(me, "09:00")).body.booking;
    const theirs = (await bookFor(colleague, "10:00")).body.booking;

    const list = await request(app).get("/api/bookings").query({ staffId: colleague.id }).set(authHeader(myLogin));
    expect(list.status).toBe(200);
    expect(list.body.bookings.map((booking: { id: string }) => booking.id)).toEqual([mine.id]);

    expect((await request(app).get(`/api/bookings/${mine.id}`).set(authHeader(myLogin))).status).toBe(200);
    expect((await request(app).get(`/api/bookings/${theirs.id}`).set(authHeader(myLogin))).status).toBe(404);
    const cancelTheirs = await request(app).patch(`/api/bookings/${theirs.id}`).set(authHeader(myLogin)).send({ status: "CANCELLED" });
    expect(cancelTheirs.status).toBe(404);
    expect((await Booking.findById(theirs.id))?.status).toBe("PENDING");
  });

  it("books only for themselves and can't hand a booking to someone else", async () => {
    const created = await request(app)
      .post("/api/bookings")
      .set(authHeader(myLogin))
      .send({ customerId: customer.id, serviceId: service.id, staffId: colleague.id, startTime: localTime(business, DATE, "11:00").toISOString() });
    expect(created.status).toBe(201);
    expect(created.body.booking.staffId).toBe(me.id);

    const handOver = await request(app).patch(`/api/bookings/${created.body.booking.id}`).set(authHeader(myLogin)).send({ staffId: colleague.id });
    expect(handOver.status).toBe(403);
  });

  it("loses access as soon as their staff profile is turned off", async () => {
    await Staff.updateOne({ _id: me._id }, { $set: { isActive: false } });
    try {
      const response = await request(app).get("/api/bookings").set(authHeader(myLogin));
      expect(response.status).toBe(403);
      expect(response.body.error.message).toBe("Your access to this business has been removed");
    } finally {
      await Staff.updateOne({ _id: me._id }, { $set: { isActive: true } });
    }
  });
});
