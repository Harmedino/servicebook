import { createApp } from "./app";
import { env } from "./config/env";
import { connectDatabase, disconnectDatabase } from "./lib/database";
import { startReminderScheduler, stopReminderScheduler } from "./services/reminderScheduler";

async function main() {
  await connectDatabase();

  const app = createApp();

  // No host argument: listens on all interfaces, which Render requires.
  const server = app.listen(env.PORT, () => {
    console.log(`API listening on port ${env.PORT} (${env.NODE_ENV})`);
  });

  startReminderScheduler();

  async function shutdown(signal: string) {
    console.log(`${signal} received, shutting down`);
    stopReminderScheduler();
    server.close();
    await disconnectDatabase();
    process.exit(0);
  }

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((error: unknown) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
