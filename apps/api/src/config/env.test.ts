import { afterEach, describe, expect, it, vi } from "vitest";
import { parseEnv } from "./env";

const productionEnv = {
  NODE_ENV: "production",
  MONGODB_URI: "mongodb+srv://user:secret@cluster.example.net/shop",
  JWT_SECRET: "a-production-secret-that-is-long-enough-1234567890",
  CORS_ORIGIN: "https://theshop.com",
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.resetModules();
});

describe("DB_TRANSACTIONS", () => {
  it("defaults to on", () => {
    expect(parseEnv(productionEnv).env.DB_TRANSACTIONS).toBe("on");
    expect(parseEnv({}).env.DB_TRANSACTIONS).toBe("on");
  });

  it("can be off in tests", () => {
    expect(parseEnv({ NODE_ENV: "test", DB_TRANSACTIONS: "off" }).env.DB_TRANSACTIONS).toBe("off");
  });

  it("can't be off in production", () => {
    expect(() => parseEnv({ ...productionEnv, DB_TRANSACTIONS: "off" })).toThrow(/DB_TRANSACTIONS can only be off in tests/);
  });

  it("can't be off in development", () => {
    expect(() => parseEnv({ NODE_ENV: "development", DB_TRANSACTIONS: "off" })).toThrow(/DB_TRANSACTIONS/);
  });

  it("only accepts on or off", () => {
    expect(() => parseEnv({ NODE_ENV: "test", DB_TRANSACTIONS: "false" })).toThrow(/DB_TRANSACTIONS/);
  });
});

describe("loading the env module", () => {
  it("throws instead of exiting the process when NODE_ENV=test", async () => {
    const exit = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
    vi.stubEnv("MONGODB_URI", "postgres://not-mongo");
    vi.resetModules();

    await expect(import("./env")).rejects.toThrow(/MONGODB_URI must start with mongodb:\/\//);
    expect(exit).not.toHaveBeenCalled();
  });
});
