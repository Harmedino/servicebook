import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../app";
import { Booking } from "../models/Booking";
import { Staff } from "../models/Staff";
import { authHeader, daysFromToday, localTime, makeCustomer, makeHours, makeOwnerAndBusiness, makeService, makeStaff } from "../test/factories";

const app = createApp();
const DATE = daysFromToday(14);

async function makeShop() {
  const { owner, business } = await makeOwnerAndBusiness();
  await makeHours(business, "09:00", "17:00");
  const service = await makeService(business, { name: "Colour", durationMinutes: 90, price: 80 });
  const { staff } = await makeStaff(business, { name: "Jamie Stylist", services: [service] });
  const customer = await makeCustomer(business, { name: "Lee Regular" });
  const createBooking = (time: string, customerId = customer.id) =>
    request(app)
      .post("/api/bookings")
      .set(authHeader(owner))
      .send({ customerId, serviceId: service.id, staffId: staff.id, startTime: localTime(business, DATE, time).toISOString() });
  return { owner, business, service, staff, customer, createBooking };
}

describe("POST /api/bookings", () => {
  it("books an existing customer for the service's length", async () => {
    const { business, createBooking } = await makeShop();

    const response = await createBooking("10:00");

    expect(response.status).toBe(201);
    expect(response.body.booking).toMatchObject({
      customerName: "Lee Regular",
      serviceName: "Colour",
      staffName: "Jamie Stylist",
      status: "PENDING",
      price: 80,
      startTime: localTime(business, DATE, "10:00").toISOString(),
      endTime: localTime(business, DATE, "11:30").toISOString(),
    });
  });

  it("refuses a customer from another business", async () => {
    const { createBooking } = await makeShop();
    const { business: otherBusiness } = await makeOwnerAndBusiness();
    const stranger = await makeCustomer(otherBusiness);

    const response = await createBooking("10:00", stranger.id);

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe("Customer not found");
  });
});

describe("PATCH /api/bookings/:id", () => {
  it("moves a booking through the allowed statuses only", async () => {
    const { owner, createBooking } = await makeShop();
    const { booking } = (await createBooking("10:00")).body;
    const setStatus = (status: string) => request(app).patch(`/api/bookings/${booking.id}`).set(authHeader(owner)).send({ status });

    expect((await setStatus("CONFIRMED")).body.booking.status).toBe("CONFIRMED");

    const backToPending = await setStatus("PENDING");
    expect(backToPending.status).toBe(400);
    expect(backToPending.body.error.message).toBe("Can't change status from confirmed to pending");

    expect((await setStatus("COMPLETED")).body.booking.status).toBe("COMPLETED");

    const reopen = await setStatus("CANCELLED");
    expect(reopen.status).toBe(400);
    expect(reopen.body.error.message).toBe("This booking is already completed and can't be changed");
  });

  it("reschedules to a free time and recomputes the end", async () => {
    const { owner, business, createBooking } = await makeShop();
    const { booking } = (await createBooking("10:00")).body;

    const response = await request(app)
      .patch(`/api/bookings/${booking.id}`)
      .set(authHeader(owner))
      .send({ startTime: localTime(business, DATE, "14:00").toISOString() });

    expect(response.status).toBe(200);
    expect(response.body.booking).toMatchObject({
      startTime: localTime(business, DATE, "14:00").toISOString(),
      endTime: localTime(business, DATE, "15:30").toISOString(),
    });
  });

  it("refuses to reschedule onto another booking or outside hours", async () => {
    const { owner, business, customer, createBooking } = await makeShop();
    const { booking } = (await createBooking("10:00")).body;
    const other = await makeCustomer(business, { name: "Kim Other" });
    expect((await createBooking("13:00", other.id)).status).toBe(201);
    const moveTo = (time: string) =>
      request(app).patch(`/api/bookings/${booking.id}`).set(authHeader(owner)).send({ startTime: localTime(business, DATE, time).toISOString() });

    const clash = await moveTo("12:00");
    expect(clash.status).toBe(409);
    expect(clash.body.error.message).toBe("This staff member already has a booking that overlaps this time");

    const late = await moveTo("16:00");
    expect(late.status).toBe(400);
    expect(late.body.error.message).toBe("This time is outside business hours (09:00-17:00)");

    const unchanged = await Booking.findById(booking.id);
    expect(unchanged?.startTime.toISOString()).toBe(localTime(business, DATE, "10:00").toISOString());
    expect(unchanged?.customerId.toString()).toBe(customer.id);
  });

  it("cancels a booking and frees its time", async () => {
    const { owner, service, staff, createBooking } = await makeShop();
    const { booking } = (await createBooking("10:00")).body;
    const slots = async () =>
      (await request(app).get("/api/bookings/available-slots").query({ serviceId: service.id, staffId: staff.id, date: DATE }).set(authHeader(owner))).body
        .slots as string[];
    expect(await slots()).not.toContain(booking.startTime);

    const response = await request(app).patch(`/api/bookings/${booking.id}`).set(authHeader(owner)).send({ status: "CANCELLED" });

    expect(response.status).toBe(200);
    expect(response.body.booking.status).toBe("CANCELLED");
    expect(await slots()).toContain(booking.startTime);
  });

  it("locks the staff member's schedule for every booking and reschedule, without editing their profile", async () => {
    const { owner, business, staff, createBooking } = await makeShop();
    const { booking } = (await createBooking("10:00")).body;
    const moved = await request(app)
      .patch(`/api/bookings/${booking.id}`)
      .set(authHeader(owner))
      .send({ startTime: localTime(business, DATE, "14:00").toISOString() });
    expect(moved.status).toBe(200);

    const after = await Staff.findById(staff.id);
    expect(after?.scheduleVersion).toBe(2);
    expect(after?.updatedAt).toEqual(staff.updatedAt);
  });

  it("can't see or change another business's booking", async () => {
    const { createBooking } = await makeShop();
    const { booking } = (await createBooking("10:00")).body;
    const { owner: otherOwner } = await makeOwnerAndBusiness();

    expect((await request(app).get(`/api/bookings/${booking.id}`).set(authHeader(otherOwner))).status).toBe(404);
    const patch = await request(app).patch(`/api/bookings/${booking.id}`).set(authHeader(otherOwner)).send({ status: "CANCELLED" });
    expect(patch.status).toBe(404);
    expect((await Booking.findById(booking.id))?.status).toBe("PENDING");
  });
});
