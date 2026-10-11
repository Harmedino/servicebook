import { describe, expect, it } from "vitest";
import { env } from "../config/env";
import { AppSetting } from "../models/AppSetting";
import { withTransaction } from "./database";

describe.runIf(env.DB_TRANSACTIONS === "off")("withTransaction with DB_TRANSACTIONS=off", () => {
  it("runs the callback without a session and returns its result", async () => {
    const result = await withTransaction(async (session) => {
      expect(session).toBeNull();
      return "done";
    });
    expect(result).toBe("done");
  });
});

// Needs real transactions: CI runs this against a MongoDB replica set.
describe.runIf(process.env.MONGODB_REPLICA_SET === "1")("withTransaction (replica set)", () => {
  it("commits the callback's writes and returns its result", async () => {
    const result = await withTransaction(async (session) => {
      expect(session?.inTransaction()).toBe(true);
      await AppSetting.create([{ key: "transaction-commit", value: 1 }], { session });
      return "committed";
    });

    expect(result).toBe("committed");
    expect(await AppSetting.exists({ key: "transaction-commit" })).not.toBeNull();
  });

  it("rolls back every write when the callback throws", async () => {
    await expect(
      withTransaction(async (session) => {
        await AppSetting.create([{ key: "transaction-rollback", value: 1 }], { session });
        throw new Error("changed my mind");
      }),
    ).rejects.toThrow("changed my mind");

    expect(await AppSetting.exists({ key: "transaction-rollback" })).toBeNull();
  });
});
