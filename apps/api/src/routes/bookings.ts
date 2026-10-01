import { announceOpening } from "../lib/waitlist";
import { Router } from "express";
import { z } from "zod";
import mongoose from "mongoose";
import type { AvailableSlotsResponse, BookingListResponse, BookingProfile, BookingResponse } from "@servicebook/types";
import { Booking, type BookingDocument } from "../models/Booking";
import { Customer } from "../models/Customer";
import { Service, type ServiceDocument } from "../models/Service";
import { Staff, type StaffDocument } from "../models/Staff";
import { BadRequestError, ConflictError, NotFoundError, UnauthorizedError, ForbiddenError } from "../lib/errors";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth, requireBusiness } from "../middleware/auth";
import { escapeRegExp, objectIdField } from "../lib/validation";
import {
  computeAvailableSlots,
  createValidatedBooking,
  findConflictMessage,
  localDayStartUtc,
  nextDateKey,
  resolveBookableServiceAndStaff,
  validateBookingWindow,
} from "../lib/bookingEngine";
import { notifyBookingCancelled, notifyBookingConfirmed, notifyBookingRescheduled } from "../services/notifications";
import { askForReview } from "../lib/bookingChat";

const BOOKING_STATUSES = ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"] as const;
type BookingStatusValue = (typeof BOOKING_STATUSES)[number];

// Cancelled/completed/no-show are terminal: the appointment slot is history,
// not an active booking, so it can no longer move or change status further.
const FINAL_STATUSES = new Set<BookingStatusValue>(["CANCELLED", "COMPLETED", "NO_SHOW"]);

// A small, explicit rule set rather than allowing any status to jump to any
// other — e.g. a confirmed booking can't silently go back to pending.
const ALLOWED_STATUS_TRANSITIONS: Record<BookingStatusValue, BookingStatusValue[]> = {
  PENDING: ["CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"],
  CONFIRMED: ["COMPLETED", "CANCELLED", "NO_SHOW"],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};
const dateKeyField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD");

const createBookingSchema = z.object({
  customerId: objectIdField,
  serviceId: objectIdField,
  staffId: objectIdField,
  startTime: z.string().datetime({ message: "startTime must be an ISO 8601 datetime" }),
  notes: z.string().trim().max(2000).optional(),
});

const updateBookingSchema = z
  .object({
    status: z.enum(BOOKING_STATUSES).optional(),
    notes: z.string().trim().max(2000).optional(),
    staffId: objectIdField.optional(),
    serviceId: objectIdField.optional(),
    startTime: z.string().datetime().optional(),
  })
  .strict();

const listQuerySchema = z.object({
  date: dateKeyField.optional(),
  startDate: dateKeyField.optional(),
  endDate: dateKeyField.optional(),
  status: z.enum(BOOKING_STATUSES).optional(),
  staffId: objectIdField.optional(),
  customerId: objectIdField.optional(),
  serviceId: objectIdField.optional(),
  q: z.string().trim().max(200).optional(),
});

const availableSlotsQuerySchema = z.object({
  serviceId: objectIdField,
  staffId: objectIdField,
  date: dateKeyField,
});

/** Batch-resolves customer/service/staff names for display, without storing them on the booking document. */
export async function toBookingProfiles(bookings: BookingDocument[]): Promise<BookingProfile[]> {
  const customerIds = [...new Set(bookings.map((booking) => booking.customerId.toString()))];
  const serviceIds = [...new Set(bookings.map((booking) => booking.serviceId.toString()))];
  const staffIds = [...new Set(bookings.map((booking) => booking.staffId.toString()))];

  const [customers, services, staffMembers] = await Promise.all([
    Customer.find({ _id: { $in: customerIds } }),
    Service.find({ _id: { $in: serviceIds } }),
    Staff.find({ _id: { $in: staffIds } }),
  ]);

  const customerById = new Map(customers.map((customer) => [customer.id, customer]));
  const serviceNameById = new Map(services.map((service) => [service.id, service.name]));
  const staffNameById = new Map(staffMembers.map((staff) => [staff.id, staff.name]));

  return bookings.map((booking) => {
    const customer = customerById.get(booking.customerId.toString());
    return {
    id: booking.id,
    businessId: booking.businessId.toString(),
    customerId: booking.customerId.toString(),
    customerName: customer?.name ?? "Unknown customer",
    customerPhone: customer?.phone ?? undefined,
    customerEmail: customer?.email ?? undefined,
    serviceId: booking.serviceId.toString(),
    // Prefer the snapshot taken at booking time (protects history from later
    // renames); fall back to a live lookup for bookings created before these
    // fields existed.
    serviceName: booking.serviceName ?? serviceNameById.get(booking.serviceId.toString()) ?? "Unknown service",
    staffId: booking.staffId.toString(),
    staffName: booking.staffName ?? staffNameById.get(booking.staffId.toString()) ?? "Unknown staff",
    startTime: booking.startTime.toISOString(),
    endTime: booking.endTime.toISOString(),
    status: booking.status,
    notes: booking.notes ?? undefined,
    price: booking.price ?? undefined,
    createdAt: booking.createdAt.toISOString(),
    updatedAt: booking.updatedAt.toISOString(),
    };
  });
}

export const bookingsRouter = Router();

bookingsRouter.use(requireAuth, requireBusiness);

// Staff only ever see and book their own appointments: their id replaces any
// staffId sent for lists, free times and new bookings, and a booking that
// isn't theirs doesn't exist as far as they're concerned.
bookingsRouter.use(
  asyncHandler(async (req, _res, next) => {
    const scope = req.staffScope;
    if (!scope) return next();
    if (req.method === "GET" && (req.path === "/" || req.path === "/available-slots")) {
      req.query.staffId = scope;
    } else if (req.method === "POST" && req.path === "/") {
      req.body = { ...req.body, staffId: scope };
    } else {
      const id = req.path.split("/")[1];
      if (/^[0-9a-f]{24}$/.test(id)) {
        const own = await Booking.exists({ _id: id, businessId: req.businessId, staffId: scope });
        if (!own) throw new NotFoundError("Booking not found");
        if (req.method === "PATCH" && req.body?.staffId && req.body.staffId !== scope) {
          throw new ForbiddenError("Only the owner can move a booking to someone else");
        }
      }
    }
    next();
  }),
);

bookingsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    if (!req.business || !req.businessId) {
      throw new UnauthorizedError();
    }

    const payload = createBookingSchema.parse(req.body);

    const customer = await Customer.findOne({ _id: payload.customerId, businessId: req.businessId });
    if (!customer) {
      throw new BadRequestError("Customer not found");
    }

    const { booking } = await createValidatedBooking({
      businessId: req.businessId,
      business: req.business,
      serviceId: payload.serviceId,
      staffId: payload.staffId,
      customer,
      startTime: new Date(payload.startTime),
      notes: payload.notes,
    });

    const [profile] = await toBookingProfiles([booking]);
    const body: BookingResponse = { booking: profile };
    res.status(201).json(body);
  }),
);

bookingsRouter.get(
  "/available-slots",
  asyncHandler(async (req, res) => {
    if (!req.business || !req.businessId) {
      throw new UnauthorizedError();
    }

    const query = availableSlotsQuerySchema.parse(req.query);

    const service = await Service.findOne({ _id: query.serviceId, businessId: req.businessId });
    if (!service || !service.isActive) {
      throw new BadRequestError("Service not found");
    }

    const staff = await Staff.findOne({ _id: query.staffId, businessId: req.businessId });
    if (!staff || !staff.isActive) {
      throw new BadRequestError("Staff member not found");
    }
    if (!staff.serviceIds.some((id) => id.toString() === query.serviceId)) {
      throw new BadRequestError("This staff member doesn't provide the selected service");
    }

    const slots = await computeAvailableSlots({
      businessId: req.businessId,
      business: req.business,
      staffId: query.staffId,
      serviceDurationMinutes: service.durationMinutes,
      dateKey: query.date,
    });

    const body: AvailableSlotsResponse = { slots: slots.map((slot) => slot.toISOString()) };
    res.json(body);
  }),
);

bookingsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    if (!req.business) {
      throw new UnauthorizedError();
    }

    const query = listQuerySchema.parse(req.query);

    const filter: Record<string, unknown> = { businessId: req.businessId };
    if (query.status) {
      filter.status = query.status;
    }
    if (query.staffId) {
      filter.staffId = query.staffId;
    }
    if (query.serviceId) {
      filter.serviceId = query.serviceId;
    }
    if (query.q) {
      // Search by customer name/phone/email: resolve matching customers first
      // (business-scoped, indexed), then filter bookings by their ids — no
      // client-side scan over every booking.
      const pattern = new RegExp(escapeRegExp(query.q), "i");
      const matchingCustomers = await Customer.find({
        businessId: req.businessId,
        $or: [{ name: pattern }, { phone: pattern }, { email: pattern }],
      }).select("_id");
      filter.customerId = { $in: matchingCustomers.map((customer) => customer._id) };
    } else if (query.customerId) {
      filter.customerId = query.customerId;
    }
    if (query.startDate && query.endDate) {
      // Closed range (e.g. calendar week/month view): only the days actually displayed.
      filter.startTime = {
        $gte: localDayStartUtc(query.startDate, req.business.timezone),
        $lt: localDayStartUtc(nextDateKey(query.endDate), req.business.timezone),
      };
    } else if (query.startDate) {
      // Open-ended "from this date onward" (e.g. Upcoming/This week start).
      filter.startTime = { $gte: localDayStartUtc(query.startDate, req.business.timezone) };
    } else if (query.endDate) {
      // Open-ended "up to this date" (e.g. Past).
      filter.startTime = { $lt: localDayStartUtc(nextDateKey(query.endDate), req.business.timezone) };
    } else if (query.date) {
      filter.startTime = {
        $gte: localDayStartUtc(query.date, req.business.timezone),
        $lt: localDayStartUtc(nextDateKey(query.date), req.business.timezone),
      };
    }

    // A safety cap, not pagination — the date filters above already bound
    // most queries to a handful of days; this just protects an unbounded
    // query from pulling a business's entire booking history. Queries with
    // no lower bound (Past/All) sort newest-first so the cap keeps the most
    // relevant 500 rather than the 500 oldest.
    const sortDirection = query.startDate ? 1 : -1;
    const bookings = await Booking.find(filter).sort({ startTime: sortDirection }).limit(500);
    if (sortDirection === -1) {
      bookings.reverse();
    }
    const body: BookingListResponse = { bookings: await toBookingProfiles(bookings) };
    res.json(body);
  }),
);

bookingsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const booking = await Booking.findOne({ _id: req.params.id, businessId: req.businessId });
    if (!booking) {
      throw new NotFoundError("Booking not found");
    }

    const [profile] = await toBookingProfiles([booking]);
    const body: BookingResponse = { booking: profile };
    res.json(body);
  }),
);

bookingsRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    if (!req.business || !req.businessId) {
      throw new UnauthorizedError();
    }
    const business = req.business;
    const businessId = req.businessId;

    const updates = updateBookingSchema.parse(req.body);

    const existingBooking = await Booking.findOne({ _id: req.params.id, businessId });
    if (!existingBooking) {
      throw new NotFoundError("Booking not found");
    }
    const previousStartTime = existingBooking.startTime;
    const previousEndTime = existingBooking.endTime;
    const previousStatus = existingBooking.status;

    const isRescheduling = updates.staffId !== undefined || updates.serviceId !== undefined || updates.startTime !== undefined;

    // A cancelled or completed booking is history, not an active appointment
    // — normal editing must not be able to move it or reopen it. Notes are
    // still editable (harmless), but nothing else.
    if (FINAL_STATUSES.has(previousStatus) && (isRescheduling || (updates.status !== undefined && updates.status !== previousStatus))) {
      throw new BadRequestError(
        `This booking is already ${previousStatus.toLowerCase()} and can't be ${isRescheduling ? "rescheduled" : "changed"}`,
      );
    }

    // A small explicit rule set for everything else — e.g. a confirmed
    // booking can't be silently moved back to pending.
    if (
      updates.status !== undefined &&
      updates.status !== previousStatus &&
      !ALLOWED_STATUS_TRANSITIONS[previousStatus].includes(updates.status)
    ) {
      throw new BadRequestError(`Can't change status from ${previousStatus.toLowerCase()} to ${updates.status.toLowerCase()}`);
    }

    const staffId = updates.staffId ?? existingBooking.staffId.toString();
    const serviceId = updates.serviceId ?? existingBooking.serviceId.toString();
    const startTime = updates.startTime ? new Date(updates.startTime) : existingBooking.startTime;
    let endTime = existingBooking.endTime;

    let rescheduledService: ServiceDocument | null = null;
    let rescheduledStaff: StaffDocument | null = null;

    if (isRescheduling) {
      const resolved = await resolveBookableServiceAndStaff({ businessId, serviceId, staffId });
      rescheduledService = resolved.service;
      rescheduledStaff = resolved.staff;

      endTime = new Date(startTime.getTime() + rescheduledService.durationMinutes * 60_000);

      await validateBookingWindow({
        businessId,
        business,
        staffId,
        startTime,
        endTime,
      });
    }

    const session = await mongoose.startSession();
    let updatedBooking: BookingDocument | null = null;
    try {
      await session.withTransaction(async () => {
        if (isRescheduling) {
          const conflictMessage = await findConflictMessage({
            businessId,
            staffId,
            customerId: existingBooking.customerId.toString(),
            startTime,
            endTime,
            excludeBookingId: existingBooking.id,
            session,
          });
          if (conflictMessage) {
            throw new ConflictError(conflictMessage);
          }
        }

        const setFields: Record<string, unknown> = {};
        if (updates.status !== undefined) {
          setFields.status = updates.status;
        }
        if (updates.notes !== undefined) {
          setFields.notes = updates.notes;
        }
        if (isRescheduling) {
          setFields.staffId = staffId;
          setFields.serviceId = serviceId;
          setFields.startTime = startTime;
          setFields.endTime = endTime;
          // Mirrors endTime above: a reschedule re-derives the booking's
          // operational details from the service's current state, same as
          // duration does. A service edit alone (PATCH /api/services/:id)
          // never touches any Booking document, so untouched bookings keep
          // their original price snapshot regardless of later service edits —
          // only an explicit reschedule of *this* booking re-syncs it.
          setFields.price = rescheduledService!.price;
          setFields.serviceName = rescheduledService!.name;
          setFields.staffName = rescheduledStaff!.name;
        }

        updatedBooking = await Booking.findByIdAndUpdate(
          existingBooking.id,
          { $set: setFields },
          { new: true, runValidators: true, session },
        );
      });
    } finally {
      await session.endSession();
    }

    if (!updatedBooking) {
      throw new NotFoundError("Booking not found");
    }
    const confirmedBooking: BookingDocument = updatedBooking;

    const isNewlyCancelled = previousStatus !== "CANCELLED" && confirmedBooking.status === "CANCELLED";
    // Only a plain status change PENDING -> CONFIRMED triggers this — a
    // reschedule that happens to also confirm the booking is covered by the
    // reschedule notification instead, so the customer gets one email, not two.
    const isNewlyConfirmed = !isRescheduling && previousStatus === "PENDING" && confirmedBooking.status === "CONFIRMED";

    // Fire-and-forget, after the transaction — same reasoning as booking
    // creation: email I/O must never block the response or affect the
    // already-committed update.
    if (isNewlyCancelled || isRescheduling || isNewlyConfirmed) {
      void (async () => {
        try {
          const customer = await Customer.findById(confirmedBooking.customerId);
          if (!customer) {
            return;
          }
          const service = rescheduledService ?? (await Service.findById(confirmedBooking.serviceId));
          const staff = rescheduledStaff ?? (await Staff.findById(confirmedBooking.staffId));
          if (!service || !staff) {
            return;
          }

          const ctx = { business, customer, service, staff, booking: confirmedBooking };
          if (isNewlyCancelled) {
            await notifyBookingCancelled(ctx);
            await announceOpening(confirmedBooking, business);
          } else if (isRescheduling) {
            await notifyBookingRescheduled(ctx, { startTime: previousStartTime, endTime: previousEndTime });
          } else if (isNewlyConfirmed) {
            await notifyBookingConfirmed(ctx);
          }
        } catch (error) {
          console.error(`Booking-update notification failed for booking ${confirmedBooking.id}:`, error);
        }
      })();
    }

    if (updates.status === "COMPLETED" && previousStatus !== "COMPLETED") {
      await askForReview(confirmedBooking).catch((error: unknown) => console.warn("Review request failed:", error));
    }

    const [profile] = await toBookingProfiles([confirmedBooking]);
    const body: BookingResponse = { booking: profile };
    res.json(body);
  }),
);
