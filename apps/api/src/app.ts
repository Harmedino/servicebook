import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { authRouter } from "./routes/auth";
import { businessRouter } from "./routes/business";
import { servicesRouter } from "./routes/services";
import { staffRouter } from "./routes/staff";
import { customersRouter } from "./routes/customers";
import { bookingsRouter } from "./routes/bookings";
import { publicBookingRouter } from "./routes/publicBooking";
import { dashboardRouter } from "./routes/dashboard";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN.split(",").map((origin) => origin.trim()),
      credentials: true,
    }),
  );
  app.use(express.json());
  if (env.NODE_ENV !== "test") {
    app.use(morgan(env.NODE_ENV === "development" ? "dev" : "combined"));
  }

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/business", businessRouter);
  app.use("/api/services", servicesRouter);
  app.use("/api/staff", staffRouter);
  app.use("/api/customers", customersRouter);
  app.use("/api/bookings", bookingsRouter);
  app.use("/api/public", publicBookingRouter);
  app.use("/api/dashboard", dashboardRouter);

  // Feature routers mount here as they're built (payments, notifications, ...).

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
