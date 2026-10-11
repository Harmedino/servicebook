import mongoose from "mongoose";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp } from "./app";

const app = createApp();

afterEach(() => {
  vi.restoreAllMocks();
});

describe("health", () => {
  it("reports ok on both paths while the database is connected", async () => {
    for (const path of ["/health", "/api/health"]) {
      const response = await request(app).get(path);
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: "ok" });
    }
  });

  it("reports 503 while the database is down", async () => {
    vi.spyOn(mongoose.connection, "readyState", "get").mockReturnValue(mongoose.ConnectionStates.disconnected);
    const response = await request(app).get("/health");
    expect(response.status).toBe(503);
    expect(response.body).toEqual({ status: "database unavailable" });
  });

  it("answers unknown routes with a JSON 404", async () => {
    const response = await request(app).get("/api/nothing-here");
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });
});
