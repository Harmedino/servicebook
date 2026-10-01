import { staffRatings } from "../lib/ratings";
import { Router } from "express";
import { z } from "zod";
import { imageRefField } from "../lib/validation";
import { formatInTimeZone } from "date-fns-tz";
import type {
  StaffAvailabilityEntry,
  StaffAvailabilityResponse,
  StaffListResponse,
  OwnerStaffResponse,
  StaffProfile,
  StaffResponse,
  RatingSummary,
  StaffAccess,
} from "@servicebook/types";
import { Staff, type StaffDocument } from "../models/Staff";
import { Service } from "../models/Service";
import { Booking } from "../models/Booking";
import { StaffAvailability, type StaffAvailabilityDocument } from "../models/StaffAvailability";
import { BadRequestError, NotFoundError, UnauthorizedError } from "../lib/errors";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth, requireBusiness } from "../middleware/auth";
import { ensureBusinessHours } from "../lib/businessHours";
import { ensureStaffAvailability } from "../lib/staffAvailability";
import { localDayStartUtc, nextDateKey } from "../lib/bookingEngine";
import { objectIdField } from "../lib/validation";

const nameField = z.string().trim().min(1, "Staff name is required").max(120, "Name is too long");
const emailField = z.string().trim().toLowerCase().email("Enter a valid email address");
const phoneField = z.string().trim().max(30, "Phone number is too long");
const serviceIdsField = z.array(objectIdField).max(200);

const titleField = z.string().trim().max(60, "Keep the title under 60 characters");
const bioField = z.string().trim().max(400, "Keep the bio under 400 characters");
const locationField = z.string().trim().max(160, "Keep the location under 160 characters");

const createStaffSchema = z.object({
  name: nameField,
  title: titleField.optional(),
  bio: bioField.optional(),
  location: locationField.optional(),
  email: emailField.optional(),
  phone: phoneField.optional(),
  avatarUrl: imageRefField.optional(),
  serviceIds: serviceIdsField.optional(),
  isActive: z.boolean().optional(),
});

const updateStaffSchema = z
  .object({
    name: nameField.optional(),
    title: titleField.optional(),
    bio: bioField.optional(),
    location: locationField.optional(),
    email: emailField.optional(),
    phone: phoneField.optional(),
    avatarUrl: imageRefField.optional(),
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

/** How this person signs in: as the owner, with their own login, invited, or not at all. */
function accessOf(staff: StaffDocument, ownerId: string): StaffAccess {
  if (staff.userId?.toString() === ownerId) return "owner";
  if (staff.userId) return "active";
  if (staff.inviteToken && staff.inviteExpiresAt && staff.inviteExpiresAt > new Date()) return "invited";
  return "none";
}

function toStaffProfile(staff: StaffDocument, ownerId: string, todayAppointmentCount?: number, rating?: RatingSummary): StaffProfile {
  return {
    id: staff.id,
    businessId: staff.businessId.toString(),
    name: staff.name,
    email: staff.email ?? undefined,
    phone: staff.phone ?? undefined,
    avatarUrl: staff.avatarUrl || undefined,
    title: staff.title || undefined,
    bio: staff.bio || undefined,
    location: staff.location || undefined,
    isActive: staff.isActive ?? true,
    isOwner: staff.userId?.toString() === ownerId,
    access: accessOf(staff, ownerId),
    serviceIds: staff.serviceIds.map((id) => id.toString()),
    todayAppointmentCount,
    rating: rating?.rating,
    reviewCount: rating?.count ?? 0,
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
      title: payload.title || undefined,
      bio: payload.bio || undefined,
      location: payload.location || undefined,
      email: payload.email,
      phone: payload.phone,
      avatarUrl: payload.avatarUrl || undefined,
      serviceIds,
      isActive: payload.isActive ?? true,
    });

    const body: StaffResponse = { staff: toStaffProfile(staff, req.business!.ownerId.toString()) };
    res.status(201).json(body);
  }),
);

staffRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    if (!req.business) {
      throw new UnauthorizedError();
    }

    const query = listQuerySchema.parse(req.query);

    const filter: Record<string, unknown> = { businessId: req.businessId };
    if (query.active !== undefined) {
      filter.isActive = query.active === "true";
    }

    const staff = await Staff.find(filter).sort({ name: 1 });

    // One aggregation for every staff member's today count, instead of a
    // query per row — bounded to this business, uses the business's own
    // timezone so "today" lines up with the owner's actual calendar day.
    const todayKey = formatInTimeZone(new Date(), req.business.timezone, "yyyy-MM-dd");
    const todayStart = localDayStartUtc(todayKey, req.business.timezone);
    const todayEnd = localDayStartUtc(nextDateKey(todayKey), req.business.timezone);
    const todayCounts = await Booking.aggregate<{ _id: unknown; count: number }>([
      {
        $match: {
          businessId: req.business._id,
          startTime: { $gte: todayStart, $lt: todayEnd },
          status: { $ne: "CANCELLED" },
        },
      },
      { $group: { _id: "$staffId", count: { $sum: 1 } } },
    ]);
    const todayCountByStaffId = new Map(
      todayCounts.map((entry) => [(entry._id as { toString(): string }).toString(), entry.count]),
    );

    const ratings = await staffRatings(req.business.id);
    const body: StaffListResponse = {
      staff: staff.map((member) => toStaffProfile(member, req.business!.ownerId.toString(), todayCountByStaffId.get(member.id) ?? 0, ratings.get(member.id))),
    };
    res.json(body);
  }),
);

const ownerStaffSchema = z.object({ isStaff: z.boolean() });

/** The owner's own staff profile, if they take appointments, and whether they've been asked. */
staffRouter.get(
  "/me",
  asyncHandler(async (req, res) => {
    const staff = await Staff.findOne({ businessId: req.businessId, userId: req.user?.id });
    const body: OwnerStaffResponse = {
      staff: staff ? toStaffProfile(staff, req.business!.ownerId.toString()) : null,
      answered: Boolean(req.business?.ownerStaffAnswered) || Boolean(staff),
    };
    res.json(body);
  }),
);

/**
 * One-tap answer to "do you also take appointments?". Yes adds the owner as
 * a staff member who performs every active service, working the business's
 * hours. Safe to repeat: an existing owner profile is reused and reactivated.
 */
staffRouter.post(
  "/me",
  asyncHandler(async (req, res) => {
    const { isStaff } = ownerStaffSchema.parse(req.body);
    if (!req.business || !req.user) {
      throw new UnauthorizedError();
    }

    let staff = await Staff.findOne({ businessId: req.businessId, userId: req.user.id });
    if (isStaff) {
      const services = await Service.find({ businessId: req.businessId, isActive: true }).select("_id");
      const serviceIds = services.map((service) => service._id);
      if (staff) {
        staff.isActive = true;
        staff.set("serviceIds", Array.from(new Set([...staff.serviceIds.map(String), ...serviceIds.map(String)])));
        await staff.save();
      } else {
        staff = await Staff.create({
          businessId: req.businessId,
          userId: req.user.id,
          name: req.user.name,
          email: req.user.email,
          serviceIds,
        });
      }
      await ensureStaffAvailability(staff.id, req.businessId as string);
    }

    req.business.set("ownerStaffAnswered", true);
    await req.business.save();

    const body: OwnerStaffResponse = { staff: staff ? toStaffProfile(staff, req.business!.ownerId.toString()) : null, answered: true };
    res.status(isStaff ? 201 : 200).json(body);
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

    const body: StaffResponse = { staff: toStaffProfile(staff, req.business!.ownerId.toString()) };
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

    const body: StaffResponse = { staff: toStaffProfile(staff, req.business!.ownerId.toString()) };
    res.json(body);
  }),
);

staffRouter.get(
  "/:staffId/availability",
  asyncHandler(async (req, res) => {
    const staff = await Staff.findOne({ _id: req.params.staffId, businessId: req.businessId });
    if (!staff) {
      throw new NotFoundError("Staff member not found");
    }

    const availability = await ensureStaffAvailability(staff.id, req.businessId as string);

    const body: StaffAvailabilityResponse = { availability: availability.map(toStaffAvailabilityEntry) };
    res.json(body);
  }),
);

staffRouter.put(
  "/:staffId/availability",
  asyncHandler(async (req, res) => {
    const staff = await Staff.findOne({ _id: req.params.staffId, businessId: req.businessId });
    if (!staff) {
      throw new NotFoundError("Staff member not found");
    }

    const { availability } = updateStaffAvailabilitySchema.parse(req.body);

    const businessHours = await ensureBusinessHours(req.businessId as string);
    const businessHoursByDay = new Map(businessHours.map((day) => [day.dayOfWeek, day]));

    for (const entry of availability) {
      if (entry.isOff) {
        continue;
      }

      const dayHours = businessHoursByDay.get(entry.dayOfWeek);
      if (!dayHours || dayHours.isClosed) {
        throw new BadRequestError(
          `The business is closed on ${DAY_NAMES[entry.dayOfWeek]}, so staff can't be available that day`,
        );
      }

      const { startTime, endTime } = entry;
      if (startTime === undefined || endTime === undefined) {
        throw new BadRequestError("Working days require both a start and end time");
      }

      if (startTime < dayHours.openTime || endTime > dayHours.closeTime) {
        throw new BadRequestError(
          `${DAY_NAMES[entry.dayOfWeek]} availability must be within business hours (${dayHours.openTime}-${dayHours.closeTime})`,
        );
      }
    }

    const operations = availability.map((entry) => ({
      updateOne: {
        filter: { staffId: staff.id, dayOfWeek: entry.dayOfWeek },
        update: {
          $set: {
            isOff: entry.isOff,
            startTime: entry.startTime ?? PLACEHOLDER_START_TIME,
            endTime: entry.endTime ?? PLACEHOLDER_END_TIME,
          },
        },
        upsert: true,
      },
    }));

    await StaffAvailability.bulkWrite(operations);

    const updated = await StaffAvailability.find({ staffId: staff.id }).sort({ dayOfWeek: 1 });
    const body: StaffAvailabilityResponse = { availability: updated.map(toStaffAvailabilityEntry) };
    res.json(body);
  }),
);
