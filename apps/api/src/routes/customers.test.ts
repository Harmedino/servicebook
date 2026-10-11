import mongoose from "mongoose";
import request from "supertest";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createApp } from "../app";
import { Customer } from "../models/Customer";
import type { BusinessDocument } from "../models/Business";
import type { UserDocument } from "../models/User";
import { authHeader, freezeTime, makeCustomer, makeOwnerAndBusiness } from "../test/factories";

const app = createApp();

let owner: UserDocument;
let business: BusinessDocument;

beforeAll(async () => {
  ({ owner, business } = await makeOwnerAndBusiness());
});

afterEach(() => {
  vi.useRealTimers();
});

/** The customer list groups bookings with $max, which FerretDB lacks (CI's MongoDB has it). */
async function databaseHasGroupMax(): Promise<boolean> {
  try {
    await mongoose.connection.collection("customers").aggregate([{ $group: { _id: null, latest: { $max: "$createdAt" } } }]).toArray();
    return true;
  } catch {
    return false;
  }
}

describe("customers", () => {
  it("adds a customer and refuses a second one with the same phone", async () => {
    const created = await request(app)
      .post("/api/customers")
      .set(authHeader(owner))
      .send({ name: "Avery Client", phone: "+12025550142", email: "Avery@Example.com", birthday: "07-04" });

    expect(created.status).toBe(201);
    expect(created.body.customer).toMatchObject({ name: "Avery Client", phone: "+12025550142", email: "avery@example.com", birthday: "07-04", source: "manual" });

    const duplicate = await request(app).post("/api/customers").set(authHeader(owner)).send({ name: "Someone Else", phone: "+12025550142" });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.message).toBe("A customer with this phone number already exists");
  });

  it("rejects invalid details", async () => {
    const response = await request(app).post("/api/customers").set(authHeader(owner)).send({ name: "", phone: "+12025550143", email: "nope" });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(Object.keys(response.body.error.details)).toEqual(expect.arrayContaining(["name", "email"]));
  });

  it("updates details, clears a birthday, and refuses a phone that's taken", async () => {
    const customer = await makeCustomer(business, { birthday: "12-25" });
    const taken = await makeCustomer(business);

    const updated = await request(app).patch(`/api/customers/${customer.id}`).set(authHeader(owner)).send({ name: "New Name", birthday: "" });
    expect(updated.status).toBe(200);
    expect(updated.body.customer.name).toBe("New Name");
    expect(updated.body.customer.birthday).toBeUndefined();

    const clash = await request(app).patch(`/api/customers/${customer.id}`).set(authHeader(owner)).send({ phone: taken.phone });
    expect(clash.status).toBe(409);
  });

  it("keeps each business's customers to itself", async () => {
    const { owner: otherOwner, business: otherBusiness } = await makeOwnerAndBusiness();
    const theirs = await makeCustomer(otherBusiness, { name: "Not Yours" });

    expect((await request(app).get(`/api/customers/${theirs.id}`).set(authHeader(owner))).status).toBe(404);
    expect((await request(app).patch(`/api/customers/${theirs.id}`).set(authHeader(owner)).send({ name: "Mine now" })).status).toBe(404);
    expect((await Customer.findById(theirs.id))?.name).toBe("Not Yours");
    expect((await request(app).get(`/api/customers/${theirs.id}`).set(authHeader(otherOwner))).status).toBe(200);
  });

  it("lists birthdays in the coming week, soonest first", async () => {
    freezeTime("2026-06-10T16:00:00Z"); // 10 June in New York
    const { owner: birthdayOwner, business: birthdayShop } = await makeOwnerAndBusiness();
    await makeCustomer(birthdayShop, { name: "In Three Days", birthday: "06-13" });
    await makeCustomer(birthdayShop, { name: "Today", birthday: "06-10" });
    await makeCustomer(birthdayShop, { name: "Next Month", birthday: "07-10" });

    const response = await request(app).get("/api/customers/birthdays").set(authHeader(birthdayOwner));

    expect(response.status).toBe(200);
    expect(response.body.birthdays.map((entry: { name: string; daysAway: number }) => [entry.name, entry.daysAway])).toEqual([
      ["Today", 0],
      ["In Three Days", 3],
    ]);
  });

  it("searches and pages the list", async (context) => {
    if (!(await databaseHasGroupMax())) context.skip();
    const { owner: listOwner, business: listShop } = await makeOwnerAndBusiness();
    await makeCustomer(listShop, { name: "Alice Abbott" });
    await makeCustomer(listShop, { name: "Bob Barker", email: "bob@example.com" });
    await makeCustomer(listShop, { name: "Carla Abbott" });

    const search = await request(app).get("/api/customers").query({ q: "abbott", sort: "name" }).set(authHeader(listOwner));
    expect(search.status).toBe(200);
    expect(search.body.customers.map((customer: { name: string }) => customer.name)).toEqual(["Alice Abbott", "Carla Abbott"]);

    const page = await request(app).get("/api/customers").query({ sort: "name", limit: 2, page: 2 }).set(authHeader(listOwner));
    expect(page.body.customers.map((customer: { name: string }) => customer.name)).toEqual(["Carla Abbott"]);
    expect(page.body.pagination).toEqual({ page: 2, limit: 2, total: 3, totalPages: 2 });
  });
});
