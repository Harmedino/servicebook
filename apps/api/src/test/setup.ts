import { randomBytes } from "node:crypto";
import mongoose from "mongoose";
import { afterAll, beforeAll } from "vitest";

// Runs before every test file. config/env.ts reads process.env once, when it is
// first imported, so the test settings go in first and app code is only
// imported inside the hooks below.

/** Puts the suffix on the URI's database name, keeping hosts and query options. */
function withDatabaseSuffix(uri: string, suffix: string): string {
  const match = /^(mongodb(?:\+srv)?:\/\/[^/?]+)\/?([^?]*)(\?.*)?$/.exec(uri);
  if (!match) {
    throw new Error(`MONGODB_TEST_URI must be a mongodb:// connection string, got "${uri}"`);
  }
  const [, hosts, name, query = ""] = match;
  return `${hosts}/${name || "sbx_test"}${suffix}${query}`;
}

process.env.NODE_ENV = "test";
// env.ts also loads apps/api/.env; tests must never send real email from a developer's settings.
process.env.EMAIL_PROVIDER = "console";
// Each file gets its own database, so files never see each other's data.
process.env.MONGODB_URI = withDatabaseSuffix(
  process.env.MONGODB_TEST_URI ?? "mongodb://127.0.0.1:27017/sbx_test",
  `_${randomBytes(4).toString("hex")}`,
);
// Transactions need a replica set (CI sets MONGODB_REPLICA_SET=1). Elsewhere, such as on FerretDB, tests run without them.
if (process.env.MONGODB_REPLICA_SET !== "1") {
  process.env.DB_TRANSACTIONS = "off";
}

beforeAll(async () => {
  const { connectDatabase } = await import("../lib/database");
  await connectDatabase();
  // Tests rely on unique indexes, and an index build still running at the end
  // would recreate the database after it is dropped.
  await Promise.all(
    mongoose.modelNames().map((name) =>
      mongoose
        .model(name)
        .init()
        .catch((error: unknown) => console.warn(`Indexes for ${name} were not built:`, error instanceof Error ? error.message : error)),
    ),
  );
});

afterAll(async () => {
  const { disconnectDatabase } = await import("../lib/database");
  await mongoose.connection.dropDatabase();
  await disconnectDatabase();
});
