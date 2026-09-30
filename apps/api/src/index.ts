import { createApp } from "./app";
import { env } from "./config/env";
import { connectDatabase, disconnectDatabase } from "./lib/database";
import { startReminderScheduler, stopReminderScheduler } from "./services/reminderScheduler";
import { ensureDemo } from "./scripts/seed";
import { ensureRoadmap } from "./lib/roadmapSeed";

async function main() {
  await connectDatabase();

  await ensureRoadmap().catch((error: unknown) => console.warn("Roadmap was not seeded:", error));

  if (env.SEED_DEMO) {
    // The demo powers the website's demo buttons; never block start-up on it.
    const refreshDemo = () => ensureDemo().catch((error: unknown) => console.warn("Demo business was not seeded:", error));
    await refreshDemo();
    setInterval(() => void refreshDemo(), 60 * 60 * 1000).unref();
  }

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
