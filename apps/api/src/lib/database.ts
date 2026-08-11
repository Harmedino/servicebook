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
    connectPromise = mongoose.connect(env.MONGODB_URI).catch((error: unknown) => {
      connectPromise = null;
      throw error;
    });
  }

  return connectPromise;
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
