import { Router } from "express";
import { z } from "zod";
import { fromZonedTime } from "date-fns-tz";
import type { TimeOffCreatedResponse, TimeOffListResponse, TimeOffProfile } from "@servicebook/types";
import { TimeOff, type TimeOffDocument } from "../models/TimeOff";
import { Staff } from "../models/Staff";
import { Booking } from "../models/Booking";
import { Customer } from "../models/Customer";
import { BadRequestError, NotFoundError } from "../lib/errors";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth, requireBusiness } from "../middleware/auth";
import { objectIdField } from "../lib/validation";
import { localDayStartUtc, nextDateKey } from "../lib/bookingEngine";

const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date");
const timeField = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Pick a time");

const timeOffSchema = z
  .object({
    staffId: objectIdField.optional(),
    startDate: dateField,
    endDate: dateField,
    startTime: timeField.optional(),
    endTime: timeField.optional(),
    note: z.string().trim().max(200, "Keep the note under 200 characters").optional(),
  })
  .refine((value) => Boolean(value.startTime) === Boolean(value.endTime), {
    message: "Set both a start and an end time, or neither for whole days",
    path: ["endTime"],
  })
  .refine((value) => value.endDate >= value.startDate, { message: "The last day can't be before the first day", path: ["endDate"] });

async function toProfiles(entries: TimeOffDocument[]): Promise<TimeOffProfile[]> {
  const staff = await Staff.find({ _id: { $in: entries.flatMap((entry) => (entry.staffId ? [entry.staffId] : [])) } }).select("name");
  const nameById = new Map(staff.map((member) => [member.id, member.name]));
  return entries.map((entry) => ({
    id: entry.id,
    staffId: entry.staffId?.toString(),
    staffName: entry.staffId ? nameById.get(entry.staffId.toString()) : undefined,
    allDay: entry.allDay ?? true,
    startDate: entry.startDate,
    endDate: entry.endDate,
    startTime: entry.startTime ?? undefined,
    endTime: entry.endTime ?? undefined,
    startAt: entry.startAt.toISOString(),
    endAt: entry.endAt.toISOString(),
    note: entry.note ?? undefined,
  }));
}

export const timeOffRouter = Router();
timeOffRouter.use(requireAuth, requireBusiness);

/** Current and upcoming time off (plus the last 30 days), soonest first. ?staffId= narrows it to one person. */
timeOffRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const filter: Record<string, unknown> = { businessId: req.businessId, endAt: { $gt: new Date(Date.now() - 30 * 86_400_000) } };
    if (typeof req.query.staffId === "string") {
      filter.$or = [{ staffId: objectIdField.parse(req.query.staffId) }, { staffId: null }];
    }
    const entries = await TimeOff.find(filter).sort({ startAt: 1 }).limit(200);
    const body: TimeOffListResponse = { timeOff: await toProfiles(entries) };
    res.json(body);
  }),
);

timeOffRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = timeOffSchema.parse(req.body);
    const business = req.business!;
    if (input.staffId && !(await Staff.exists({ _id: input.staffId, businessId: req.businessId }))) {
      throw new BadRequestError("Pick someone from your team");
    }

    const allDay = !input.startTime;
    const startAt = allDay ? localDayStartUtc(input.startDate, business.timezone) : fromZonedTime(`${input.startDate}T${input.startTime}:00`, business.timezone);
    const endAt = allDay
      ? localDayStartUtc(nextDateKey(input.endDate), business.timezone)
      : fromZonedTime(`${input.endDate}T${input.endTime}:00`, business.timezone);
    if (endAt <= startAt) throw new BadRequestError("The end has to be after the start");
    if (endAt.getTime() - startAt.getTime() > 366 * 86_400_000) throw new BadRequestError("Time off can be at most a year at a time");

    const entry = await TimeOff.create({
      businessId: req.businessId,
      staffId: input.staffId ?? null,
      startAt,
      endAt,
      allDay,
      startDate: input.startDate,
      endDate: input.endDate,
      startTime: input.startTime,
      endTime: input.endTime,
      note: input.note || undefined,
    });

    // Appointments already booked in that time stay put; the owner is told so they can move them.
    const clashing = await Booking.find({
      businessId: req.businessId,
      ...(input.staffId ? { staffId: input.staffId } : {}),
      status: { $in: ["PENDING", "CONFIRMED"] },
      startTime: { $lt: endAt },
      endTime: { $gt: startAt },
    })
      .sort({ startTime: 1 })
      .limit(50);
    const customers = await Customer.find({ _id: { $in: clashing.map((booking) => booking.customerId) } }).select("name");
    const customerName = new Map(customers.map((customer) => [customer.id, customer.name]));

    const [profile] = await toProfiles([entry]);
    const body: TimeOffCreatedResponse = {
      timeOff: profile,
      clashes: clashing.map((booking) => ({
        id: booking.id,
        customerName: customerName.get(booking.customerId.toString()) ?? "Customer",
        serviceName: booking.serviceName ?? "Appointment",
        staffName: booking.staffName ?? "",
        startTime: booking.startTime.toISOString(),
      })),
    };
    res.status(201).json(body);
  }),
);

timeOffRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const result = await TimeOff.deleteOne({ _id: objectIdField.parse(req.params.id), businessId: req.businessId });
    if (result.deletedCount === 0) throw new NotFoundError("Time off not found");
    res.status(204).end();
  }),
);
