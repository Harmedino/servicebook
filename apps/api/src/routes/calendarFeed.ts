import { randomBytes } from "node:crypto";
import { Router } from "express";
import type { CalendarFeedResponse } from "@servicebook/types";
import { Business } from "../models/Business";
import { Booking } from "../models/Booking";
import { Customer } from "../models/Customer";
import { Staff } from "../models/Staff";
import { TimeOff } from "../models/TimeOff";
import { NotFoundError } from "../lib/errors";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth, requireBusiness } from "../middleware/auth";
import { objectIdField } from "../lib/validation";
import { buildCalendar, type IcsEvent } from "../lib/ics";
import { webAppUrl } from "../config/env";

const DAY = 86_400_000;

// ---- Public feed: /api/calendar/:token.ics?staff=<id> -------------------------

export const calendarFeedPublicRouter = Router();

calendarFeedPublicRouter.get(
  "/:file",
  asyncHandler(async (req, res) => {
    const token = req.params.file.replace(/\.ics$/, "");
    const business = /^[A-Za-z0-9_-]{16,64}$/.test(token) ? await Business.findOne({ calendarToken: token }) : null;
    if (!business) throw new NotFoundError("This calendar link isn't valid anymore");

    const staffId = typeof req.query.staff === "string" ? objectIdField.parse(req.query.staff) : undefined;
    const staffMember = staffId ? await Staff.findOne({ _id: staffId, businessId: business.id }) : null;
    if (staffId && !staffMember) throw new NotFoundError("This calendar link isn't valid anymore");

    // A month back and six months ahead keeps the feed small and fast to refresh.
    const now = Date.now();
    const range = { $gt: new Date(now - 30 * DAY), $lt: new Date(now + 180 * DAY) };
    const [bookings, timeOff] = await Promise.all([
      Booking.find({ businessId: business.id, status: { $ne: "CANCELLED" }, startTime: range, ...(staffId ? { staffId } : {}) })
        .sort({ startTime: 1 })
        .limit(5000),
      TimeOff.find({ businessId: business.id, endAt: { $gt: new Date(now - 30 * DAY) }, ...(staffId ? { $or: [{ staffId }, { staffId: null }] } : {}) }),
    ]);
    const customers = await Customer.find({ _id: { $in: bookings.map((booking) => booking.customerId) } }).select("name phone");
    const customerById = new Map(customers.map((customer) => [customer.id, customer]));
    const staffNames = await Staff.find({ _id: { $in: timeOff.flatMap((entry) => (entry.staffId ? [entry.staffId] : [])) } }).select("name");
    const staffName = new Map(staffNames.map((member) => [member.id, member.name]));

    const events: IcsEvent[] = bookings.map((booking) => {
      const customer = customerById.get(booking.customerId.toString());
      return {
        uid: `${booking.id}@servicebook`,
        start: booking.startTime,
        end: booking.endTime,
        summary: `${booking.serviceName ?? "Appointment"} · ${customer?.name ?? "Customer"}`,
        description: [
          staffId ? null : `With ${booking.staffName ?? "staff"}`,
          customer?.phone ? `Phone: ${customer.phone}` : null,
          booking.notes ? `Notes: ${booking.notes}` : null,
          booking.status === "PENDING" ? "Not confirmed yet" : null,
        ]
          .filter(Boolean)
          .join("\n"),
        location: business.address ?? undefined,
        url: `${webAppUrl}/bookings/${booking.id}`,
        status: booking.status === "PENDING" ? "TENTATIVE" : "CONFIRMED",
        updated: booking.updatedAt,
      };
    });
    for (const entry of timeOff) {
      events.push({
        uid: `timeoff-${entry.id}@servicebook`,
        start: entry.startAt,
        end: entry.endAt,
        summary: entry.staffId ? `${staffName.get(entry.staffId.toString()) ?? "Staff"} off` : `${business.name} closed`,
        description: entry.note ?? undefined,
      });
    }

    const name = staffMember ? `${staffMember.name} · ${business.name}` : `${business.name} bookings`;
    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", `inline; filename="${business.slug}${staffMember ? `-${staffMember.id}` : ""}.ics"`);
    res.setHeader("Cache-Control", "private, max-age=300");
    res.send(buildCalendar({ name, timezone: business.timezone, events }));
  }),
);

// ---- Owner: /api/calendar-feed --------------------------------------------------

export const calendarFeedRouter = Router();
calendarFeedRouter.use(requireAuth, requireBusiness);

const newToken = () => randomBytes(18).toString("base64url");

calendarFeedRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const business = req.business!;
    if (!business.calendarToken) {
      await Business.updateOne({ _id: business._id, calendarToken: { $exists: false } }, { $set: { calendarToken: newToken() } });
    }
    const saved = await Business.findById(business._id).select("calendarToken");
    const body: CalendarFeedResponse = { token: saved?.calendarToken ?? "" };
    res.json(body);
  }),
);

/** A new link; calendars subscribed to the old one stop updating. */
calendarFeedRouter.post(
  "/reset",
  asyncHandler(async (req, res) => {
    const token = newToken();
    await Business.updateOne({ _id: req.businessId }, { $set: { calendarToken: token } });
    const body: CalendarFeedResponse = { token };
    res.json(body);
  }),
);
