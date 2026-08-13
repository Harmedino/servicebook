import { Router } from "express";
import { z } from "zod";
import type {
  StaffAvailabilityEntry,
  StaffAvailabilityResponse,
  StaffListResponse,
  StaffProfile,
  StaffResponse,
} from "@servicebook/types";
import { Staff, type StaffDocument } from "../models/Staff";
import { Service } from "../models/Service";
import { StaffAvailability, type StaffAvailabilityDocument } from "../models/StaffAvailability";
import { BadRequestError, NotFoundError } from "../lib/errors";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth, requireBusiness } from "../middleware/auth";
import { ensureBusinessHours } from "../lib/businessHours";

const nameField = z.string().trim().min(1, "Staff name is required").max(120, "Name is too long");
const emailField = z.string().trim().toLowerCase().email("Enter a valid email address");
const phoneField = z.string().trim().max(30, "Phone number is too long");
const objectIdField = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid service id");
const serviceIdsField = z.array(objectIdField).max(200);

const createStaffSchema = z.object({
  name: nameField,
  email: emailField.optional(),
  phone: phoneField.optional(),
  serviceIds: serviceIdsField.optional(),
  isActive: z.boolean().optional(),
});

const updateStaffSchema = z
  .object({
    name: nameField.optional(),
    email: emailField.optional(),
    phone: phoneField.optional(),
    serviceIds: serviceIdsField.optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

const listQuerySchema = z.object({
  active: z.enum(["true", "false"]).optional(),
});

// Staff.serviceIds is treated as the single source of truth for the staff<->service
// relationship. Service.staffIds (the reverse array on the Service model) is
// deliberately left unmaintained here rather than kept in sync with a second
// write per assignment — that dual-write was flagged as an unnecessary
// consistency risk during the earlier model review, and nothing currently
// reads Service.staffIds. Reverse lookups ("which staff perform service X")
// can query Staff.find({ serviceIds: X, businessId }) instead.

/** Rejects the request if any service id doesn't exist or belongs to another business. */
async function assertServiceIdsBelongToBusiness(serviceIds: string[], businessId: string): Promise<void> {
  if (serviceIds.length === 0) {
    return;
  }
  const uniqueIds = Array.from(new Set(serviceIds));
  const count = await Service.countDocuments({ _id: { $in: uniqueIds }, businessId });
  if (count !== uniqueIds.length) {
    throw new BadRequestError("One or more services do not belong to your business");
  }
}

function toStaffProfile(staff: StaffDocument): StaffProfile {
  return {
    id: staff.id,
    businessId: staff.businessId.toString(),
    name: staff.name,
    email: staff.email ?? undefined,
    phone: staff.phone ?? undefined,
    avatarUrl: staff.avatarUrl ?? undefined,
    isActive: staff.isActive ?? true,
    serviceIds: staff.serviceIds.map((id) => id.toString()),
    createdAt: staff.createdAt.toISOString(),
    updatedAt: staff.updatedAt.toISOString(),
  };
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const PLACEHOLDER_START_TIME = "09:00";
const PLACEHOLDER_END_TIME = "17:00";

const staffAvailabilityEntrySchema = z
  .object({
    dayOfWeek: z.number().int("dayOfWeek must be a whole number").min(0).max(6),
    isOff: z.boolean(),
    startTime: z.string().regex(TIME_PATTERN, "startTime must be HH:mm (24h)").optional(),
    endTime: z.string().regex(TIME_PATTERN, "endTime must be HH:mm (24h)").optional(),
  })
  .refine((entry) => entry.isOff || (entry.startTime !== undefined && entry.endTime !== undefined), {
    message: "Working days require both a start and end time",
  })
  .refine(
    (entry) =>
      entry.isOff || entry.startTime === undefined || entry.endTime === undefined || entry.startTime < entry.endTime,
    { message: "End time must be later than start time" },
  );

const updateStaffAvailabilitySchema = z
  .object({
    availability: z.array(staffAvailabilityEntrySchema).length(7, "All seven days of the week must be included"),
  })
  .refine((body) => new Set(body.availability.map((entry) => entry.dayOfWeek)).size === 7, {
    message: "Each day of the week must appear exactly once",
  });

function toStaffAvailabilityEntry(entry: StaffAvailabilityDocument): StaffAvailabilityEntry {
  return {
    dayOfWeek: entry.dayOfWeek,
    isOff: entry.isOff ?? false,
    startTime: entry.startTime,
    endTime: entry.endTime,
  };
}

export const staffRouter = Router();

// Every staff route needs a resolved business — apply once for the whole router.
staffRouter.use(requireAuth, requireBusiness);

staffRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const payload = createStaffSchema.parse(req.body);
    const serviceIds = payload.serviceIds ?? [];
    await assertServiceIdsBelongToBusiness(serviceIds, req.businessId as string);

    const staff = await Staff.create({
      businessId: req.businessId,
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      serviceIds,
      isActive: payload.isActive ?? true,
    });

    const body: StaffResponse = { staff: toStaffProfile(staff) };
    res.status(201).json(body);
  }),
);

staffRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const query = listQuerySchema.parse(req.query);

    const filter: Record<string, unknown> = { businessId: req.businessId };
    if (query.active !== undefined) {
      filter.isActive = query.active === "true";
    }

    const staff = await Staff.find(filter).sort({ name: 1 });

    const body: StaffListResponse = { staff: staff.map(toStaffProfile) };
    res.json(body);
  }),
);

staffRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const staff = await Staff.findOne({ _id: req.params.id, businessId: req.businessId });
    if (!staff) {
      // Same 404 whether the id doesn't exist or belongs to another business.
      throw new NotFoundError("Staff member not found");
    }

    const body: StaffResponse = { staff: toStaffProfile(staff) };
    res.json(body);
  }),
);

staffRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const updates = updateStaffSchema.parse(req.body);

    if (updates.serviceIds !== undefined) {
      await assertServiceIdsBelongToBusiness(updates.serviceIds, req.businessId as string);
    }

    const staff = await Staff.findOneAndUpdate(
      { _id: req.params.id, businessId: req.businessId },
      { $set: updates },
      { new: true, runValidators: true },
    );

    if (!staff) {
      throw new NotFoundError("Staff member not found");
    }

    const body: StaffResponse = { staff: toStaffProfile(staff) };
    res.json(body);
  }),
);
