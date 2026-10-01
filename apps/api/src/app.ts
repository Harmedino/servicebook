import express from "express";
import cors from "cors";
import helmet from "helmet";
import mongoose from "mongoose";
import morgan from "morgan";
import { allowedOrigins, env, isProduction } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { authRouter } from "./routes/auth";
import { businessRouter } from "./routes/business";
import { servicesRouter } from "./routes/services";
import { staffRouter } from "./routes/staff";
import { customersRouter } from "./routes/customers";
import { bookingsRouter } from "./routes/bookings";
import { publicBookingRouter } from "./routes/publicBooking";
import { dashboardRouter } from "./routes/dashboard";
import { uploadsRouter } from "./routes/uploads";
import { enquiriesRouter } from "./routes/enquiries";
import { roadmapRouter } from "./routes/roadmap";
import { notificationsRouter } from "./routes/notifications";
import { publicShowcaseRouter, reviewsRouter, showcaseRouter } from "./routes/showcase";
import { timeOffRouter } from "./routes/timeOff";
import { waitlistRouter } from "./routes/waitlist";
import { calendarFeedPublicRouter, calendarFeedRouter } from "./routes/calendarFeed";
import { customerPortalLinkRouter, publicCustomerPortalRouter } from "./routes/customerPortal";
import { bookingMessagesRouter, conversationsRouter, publicBookingChatRouter } from "./routes/bookingChat";

export function createApp() {
  const app = express();

  // Render (and most hosts) put one proxy in front of the app. Trusting it makes
  // req.ip the real client IP, so rate limits apply per visitor instead of every
  // request sharing the proxy's IP and locking everyone out together.
  if (isProduction) {
    app.set("trust proxy", 1);
  }

  app.use(helmet());
  app.use(
    cors({
      // Auth uses a Bearer token (no cookies), so credentials aren't required,
      // but they're harmless with an explicit origin allow-list.
      origin: allowedOrigins,
      credentials: true,
    }),
  );
  app.use(express.json());
  if (env.NODE_ENV !== "test") {
    app.use(morgan(env.NODE_ENV === "development" ? "dev" : "combined"));
  }

  const health = (_req: express.Request, res: express.Response) => {
    const databaseUp = mongoose.connection.readyState === 1;
    res.status(databaseUp ? 200 : 503).json({ status: databaseUp ? "ok" : "database unavailable" });
  };
  app.get("/health", health);
  app.get("/api/health", health);

  app.use("/api/auth", authRouter);
  app.use("/api/business", businessRouter);
  app.use("/api/services", servicesRouter);
  app.use("/api/staff", staffRouter);
  app.use("/api/customers", customerPortalLinkRouter);
  app.use("/api/customers", customersRouter);
  app.use("/api/bookings/:id/messages", bookingMessagesRouter);
  app.use("/api/bookings", bookingsRouter);
  app.use("/api/conversations", conversationsRouter);
  app.use("/api/public/bookings", publicBookingChatRouter);
  app.use("/api/public/customers", publicCustomerPortalRouter);
  app.use("/api/public/businesses/:slug", publicShowcaseRouter);
  app.use("/api/public", publicBookingRouter);
  app.use("/api/dashboard", dashboardRouter);
  app.use("/api/uploads", uploadsRouter);
  app.use("/api/enquiries", enquiriesRouter);
  app.use("/api/roadmap", roadmapRouter);
  app.use("/api/notifications", notificationsRouter);
  app.use("/api/showcase", showcaseRouter);
  app.use("/api/time-off", timeOffRouter);
  app.use("/api/waitlist", waitlistRouter);
  app.use("/api/calendar-feed", calendarFeedRouter);
  app.use("/api/calendar", calendarFeedPublicRouter);
  app.use("/api/reviews", reviewsRouter);

  // Feature routers mount here as they're built (payments, notifications, ...).

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
