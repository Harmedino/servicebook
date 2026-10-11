import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../app";
import { Staff } from "../models/Staff";
import { User, type UserDocument } from "../models/User";
import type { BusinessDocument } from "../models/Business";
import { TEST_PASSWORD, authHeader, makeOwnerAndBusiness, makeStaff } from "../test/factories";

const app = createApp();

let owner: UserDocument;
let business: BusinessDocument;

beforeAll(async () => {
  ({ owner, business } = await makeOwnerAndBusiness());
});

describe("POST /api/auth/login", () => {
  it("signs in with the right password and never returns the hash", async () => {
    const response = await request(app).post("/api/auth/login").send({ email: owner.email.toUpperCase(), password: TEST_PASSWORD });

    expect(response.status).toBe(200);
    expect(response.body.user).toEqual({ id: owner.id, name: owner.name, email: owner.email, role: "OWNER" });
    expect(typeof response.body.token).toBe("string");
    expect(JSON.stringify(response.body)).not.toContain("passwordHash");

    const me = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${response.body.token}`);
    expect(me.status).toBe(200);
    expect(me.body.user.id).toBe(owner.id);
  });

  it("gives the same answer for a wrong password and an unknown email", async () => {
    const wrongPassword = await request(app).post("/api/auth/login").send({ email: owner.email, password: "not-the-password1" });
    const unknownEmail = await request(app).post("/api/auth/login").send({ email: "nobody@example.com", password: TEST_PASSWORD });

    for (const response of [wrongPassword, unknownEmail]) {
      expect(response.status).toBe(401);
      expect(response.body.error).toMatchObject({ code: "UNAUTHORIZED", message: "Invalid email or password" });
    }
  });

  it("rejects a malformed request", async () => {
    const response = await request(app).post("/api/auth/login").send({ email: "not-an-email" });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("refuses a missing or forged token", async () => {
    expect((await request(app).get("/api/auth/me")).status).toBe(401);
    expect((await request(app).get("/api/auth/me").set("Authorization", "Bearer forged.token.value")).status).toBe(401);
  });
});

describe("staff invites", () => {
  async function inviteFor(name: string) {
    const { staff } = await makeStaff(business, { name, email: `${name.toLowerCase()}@example.com` });
    const response = await request(app).post(`/api/team/${staff.id}/invite`).set(authHeader(owner));
    expect(response.status).toBe(201);
    return { staff, token: response.body.token as string };
  }

  it("shows the invite, then turns it into a staff login exactly once", async () => {
    const { staff, token } = await inviteFor("Riley");

    const info = await request(app).get(`/api/auth/invites/${token}`);
    expect(info.status).toBe(200);
    expect(info.body).toEqual({ businessName: business.name, staffName: "Riley", email: "riley@example.com" });

    const accepted = await request(app).post(`/api/auth/invites/${token}/accept`).send({ email: "riley.login@example.com", password: "riley-password-1" });
    expect(accepted.status).toBe(201);
    expect(accepted.body.user).toMatchObject({ name: "Riley", email: "riley.login@example.com", role: "STAFF", staffId: staff.id });

    const updated = await Staff.findById(staff.id);
    expect(updated?.userId?.toString()).toBe(accepted.body.user.id);
    expect(updated?.inviteToken).toBeUndefined();

    const login = await request(app).post("/api/auth/login").send({ email: "riley.login@example.com", password: "riley-password-1" });
    expect(login.status).toBe(200);
    expect(login.body.user).toMatchObject({ role: "STAFF", staffId: staff.id });

    const again = await request(app).post(`/api/auth/invites/${token}/accept`).send({ email: "riley.again@example.com", password: "riley-password-1" });
    expect(again.status).toBe(404);
    expect(await User.exists({ email: "riley.again@example.com" })).toBeNull();
  });

  it("refuses an expired invite", async () => {
    const { staff, token } = await inviteFor("Morgan");
    await Staff.updateOne({ _id: staff._id }, { $set: { inviteExpiresAt: new Date(Date.now() - 1000) } });

    expect((await request(app).get(`/api/auth/invites/${token}`)).status).toBe(404);
  });

  it("refuses an email that already has a login", async () => {
    const { token } = await inviteFor("Casey");
    const response = await request(app).post(`/api/auth/invites/${token}/accept`).send({ email: owner.email, password: "casey-password-1" });

    expect(response.status).toBe(409);
  });
});
