import { Router } from "express";
import { z } from "zod";
import mongoose from "mongoose";
import type { AvailableSlotsResponse, BookingListResponse, BookingProfile, BookingResponse } from "@servicebook/types";
import { Booking, type BookingDocument } from "../models/Booking";
import { Customer } from "../models/Customer";
import { Service } from "../models/Service";
import { Staff } from "../models/Staff";
import { BadRequestError, ConflictError, NotFoundError, UnauthorizedError } from "../lib/errors";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth, requireBusiness } from "../middleware/auth";
import { objectIdField } from "../lib/validation";
import {
  computeAvailableSlots,
  createValidatedBooking,
  findConflictMessage,
  localDayStartUtc,
  nextDateKey,
  validateBookingWindow,
} from "../lib/bookingEngine";

const BOOKING_STATUSES = ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"] as const;
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
});

const availableSlotsQuerySchema = z.object({
  serviceId: objectIdField,
  staffId: objectIdField,
  date: dateKeyField,
});

/** Batch-resolves customer/service/staff names for display, without storing them on the booking document. */
async function toBookingProfiles(bookings: BookingDocument[]): Promise<BookingProfile[]> {
  const customerIds = [...new Set(bookings.map((booking) => booking.customerId.toString()))];
  const serviceIds = [...new Set(bookings.map((booking) => booking.serviceId.toString()))];
  const staffIds = [...new Set(bookings.map((booking) => booking.staffId.toString()))];

  const [customers, services, staffMembers] = await Promise.all([
    Customer.find({ _id: { $in: customerIds } }),
    Service.find({ _id: { $in: serviceIds } }),
    Staff.find({ _id: { $in: staffIds } }),
  ]);

  const customerNameById = new Map(customers.map((customer) => [customer.id, customer.name]));
  const serviceNameById = new Map(services.map((service) => [service.id, service.name]));
  const staffNameById = new Map(staffMembers.map((staff) => [staff.id, staff.name]));

  return bookings.map((booking) => ({
    id: booking.id,
    businessId: booking.businessId.toString(),
    customerId: booking.customerId.toString(),
    customerName: customerNameById.get(booking.customerId.toString()) ?? "Unknown customer",
    serviceId: booking.serviceId.toString(),
    serviceName: serviceNameById.get(booking.serviceId.toString()) ?? "Unknown service",
    staffId: booking.staffId.toString(),
    staffName: staffNameById.get(booking.staffId.toString()) ?? "Unknown staff",
    startTime: booking.startTime.toISOString(),
    endTime: booking.endTime.toISOString(),
    status: booking.status,
    notes: booking.notes ?? undefined,
    createdAt: booking.createdAt.toISOString(),
    updatedAt: booking.updatedAt.toISOString(),
  }));
}

export const bookingsRouter = Router();

bookingsRouter.use(requireAuth, requireBusiness);

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
    if (query.customerId) {
      filter.customerId = query.customerId;
    }
    if (query.startDate || query.endDate) {
      // Calendar range fetch: only download the days actually being displayed.
      const startKey = query.startDate ?? query.endDate ?? query.date;
      const endKey = query.endDate ?? query.startDate ?? query.date;
      if (startKey && endKey) {
        filter.startTime = {
          $gte: localDayStartUtc(startKey, req.business.timezone),
          $lt: localDayStartUtc(nextDateKey(endKey), req.business.timezone),
        };
      }
    } else if (query.date) {
      filter.startTime = {
        $gte: localDayStartUtc(query.date, req.business.timezone),
        $lt: localDayStartUtc(nextDateKey(query.date), req.business.timezone),
      };
    }

    const bookings = await Booking.find(filter).sort({ startTime: 1 });
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

    const updates = updateBookingSchema.parse(req.body);

    const existingBooking = await Booking.findOne({ _id: req.params.id, businessId: req.businessId });
    if (!existingBooking) {
      throw new NotFoundError("Booking not found");
    }

    const isRescheduling = updates.staffId !== undefined || updates.serviceId !== undefined || updates.startTime !== undefined;

    const staffId = updates.staffId ?? existingBooking.staffId.toString();
    const serviceId = updates.serviceId ?? existingBooking.serviceId.toString();
    const startTime = updates.startTime ? new Date(updates.startTime) : existingBooking.startTime;
    let endTime = existingBooking.endTime;

    if (isRescheduling) {
      const service = await Service.findOne({ _id: serviceId, businessId: req.businessId });
      if (!service) {
        throw new BadRequestError("Service not found");
      }
      if (!service.isActive) {
        throw new BadRequestError("This service is no longer offered");
      }

      const staff = await Staff.findOne({ _id: staffId, businessId: req.businessId });
      if (!staff) {
        throw new BadRequestError("Staff member not found");
      }
      if (!staff.isActive) {
        throw new BadRequestError("This staff member is no longer active");
      }
      if (!staff.serviceIds.some((id) => id.toString() === serviceId)) {
        throw new BadRequestError("This staff member doesn't provide the selected service");
      }

      endTime = new Date(startTime.getTime() + service.durationMinutes * 60_000);

      await validateBookingWindow({
        businessId: req.businessId,
        business: req.business,
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
            businessId: req.businessId as string,
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

    const [profile] = await toBookingProfiles([updatedBooking]);
    const body: BookingResponse = { booking: profile };
    res.json(body);
  }),
);
