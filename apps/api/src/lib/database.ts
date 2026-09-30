import mongoose from "mongoose";
import { env } from "../config/env";

mongoose.set("strictQuery", true);

let connectPromise: Promise<typeof mongoose> | null = null;

/** Connects to MongoDB. Safe to call multiple times — reuses the in-flight or existing connection. */
export function connectDatabase(): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) {
    return Promise.resolve(mongoose);
  }

  if (!connectPromise) {
    connectPromise = mongoose
      .connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 15_000 })
      .then(async (connection) => {
        const { host, name } = connection.connection;
        console.log(`MongoDB connected: ${host}/${name}`);
        await warnIfNotReplicaSet();
        return connection;
      })
      .catch((error: unknown) => {
        connectPromise = null;
        const reason = error instanceof Error ? error.message : String(error);
        throw new Error(
          `Could not connect to MongoDB (${reason}). Check MONGODB_URI and, on Atlas, that Network Access allows 0.0.0.0/0.`,
        );
      });
  }

  return connectPromise;
}

/** Booking creation uses multi-document transactions, which need a replica set (every Atlas cluster is one). */
async function warnIfNotReplicaSet(): Promise<void> {
  try {
    const hello = await mongoose.connection.db?.admin().command({ hello: 1 });
    if (hello && !hello.setName && hello.msg !== "isdbgrid") {
      console.warn(
        "MongoDB is not a replica set: creating bookings will fail because it needs transactions. Use MongoDB Atlas or a local replica set.",
      );
    }
  } catch {
    // Not fatal: some managed users can't run admin commands.
  }
}

export async function disconnectDatabase(): Promise<void> {
  connectPromise = null;
  await mongoose.disconnect();
}

mongoose.connection.on("error", (error) => {
  console.error("MongoDB connection error:", error);
});

mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB disconnected");
});
