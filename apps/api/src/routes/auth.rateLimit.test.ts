import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../app";
import { TEST_PASSWORD, makeOwnerAndBusiness } from "../test/factories";

// A file of its own: the limiter counts per IP for the whole process, and every
// supertest request comes from the same address.
describe("failed sign-in limit", () => {
  it("allows 10 failed attempts per 15 minutes, then refuses even the right password", async () => {
    const app = createApp();
    const { owner } = await makeOwnerAndBusiness();
    const attempt = (password: string) => request(app).post("/api/auth/login").send({ email: owner.email, password });

    // Successful sign-ins don't count towards the limit.
    expect((await attempt(TEST_PASSWORD)).status).toBe(200);
    for (let failure = 1; failure <= 10; failure += 1) {
      expect((await attempt("wrong-password-1")).status).toBe(401);
    }

    const limited = await attempt(TEST_PASSWORD);
    expect(limited.status).toBe(429);
    expect(limited.body.error.code).toBe("RATE_LIMITED");
  });
});
