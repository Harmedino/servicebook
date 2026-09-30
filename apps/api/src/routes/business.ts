import { Router } from "express";
import { z } from "zod";
import { socialLinksSchema, toSocialLinks } from "../lib/socials";
import type {
  BusinessHoursEntry,
  BusinessHoursResponse,
  BusinessProfile,
  BusinessResponse,
  MyBusinessResponse,
} from "@servicebook/types";
import { Business, type BusinessDocument } from "../models/Business";
import { BusinessHours, type BusinessHoursDocument } from "../models/BusinessHours";
import { ConflictError, NotFoundError, UnauthorizedError } from "../lib/errors";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth, requireBusiness } from "../middleware/auth";
import { slugify } from "../lib/slugify";
import { imageRefField } from "../lib/validation";
import { ensureBusinessHours } from "../lib/businessHours";

// Accept any zone the runtime can format in. Intl.supportedValuesOf("timeZone")
// omits "UTC" and legacy aliases (e.g. Asia/Calcutta) that browsers still report,
// which made onboarding fail for users whose device is set to one of them.
function isValidTimezone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

const nameField = z.string().trim().min(1, "Business name is required").max(120, "Business name is too long");
const emailField = z.string().trim().toLowerCase().email("Enter a valid email address");
const phoneField = z.string().trim().max(30, "Phone number is too long");
const descriptionField = z.string().trim().max(1000, "Description is too long");
const addressField = z.string().trim().max(300, "Address is too long");
const websiteField = z.string().trim().url("Enter a valid website URL");

export const SUPPORTED_CURRENCIES = ["NGN", "USD", "GBP", "EUR", "GHS", "KES", "ZAR", "CAD"] as const;
const currencyField = z.enum(SUPPORTED_CURRENCIES);
const timezoneField = z
  .string()
  .trim()
  .refine(isValidTimezone, "Unrecognized timezone");

const createBusinessSchema = z.object({
  name: nameField,
  email: emailField.optional(),
  phone: phoneField.optional(),
  description: descriptionField.optional(),
  timezone: timezoneField.optional(),
  currency: currencyField.optional(),
});

const updateBusinessSchema = z
  .object({
    name: nameField.optional(),
    email: emailField.optional(),
    phone: phoneField.optional(),
    description: descriptionField.optional(),
    address: addressField.optional(),
    website: websiteField.optional(),
    socials: socialLinksSchema.optional(),
    timezone: timezoneField.optional(),
    logoUrl: imageRefField.optional(),
    coverImageUrl: imageRefField.optional(),
    currency: currencyField.optional(),
    isPublicBookingEnabled: z.boolean().optional(),
    emailNotificationsEnabled: z.boolean().optional(),
    notifyCustomerOnBooking: z.boolean().optional(),
    notifyCustomerReminder: z.boolean().optional(),
    notifyOwnerOnBooking: z.boolean().optional(),
  })
  .strict();

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const PLACEHOLDER_OPEN_TIME = "09:00";
const PLACEHOLDER_CLOSE_TIME = "17:00";

const businessHourEntrySchema = z
  .object({
    dayOfWeek: z.number().int("dayOfWeek must be a whole number").min(0).max(6),
    isClosed: z.boolean(),
    openTime: z.string().regex(TIME_PATTERN, "openTime must be HH:mm (24h)").optional(),
    closeTime: z.string().regex(TIME_PATTERN, "closeTime must be HH:mm (24h)").optional(),
  })
  .refine((entry) => entry.isClosed || (entry.openTime !== undefined && entry.closeTime !== undefined), {
    message: "Open days require both an opening and closing time",
  })
  .refine(
    (entry) =>
      entry.isClosed || entry.openTime === undefined || entry.closeTime === undefined || entry.openTime < entry.closeTime,
    { message: "Closing time must be later than opening time" },
  );

const updateBusinessHoursSchema = z
  .object({
    hours: z.array(businessHourEntrySchema).length(7, "All seven days of the week must be included"),
  })
  .refine((body) => new Set(body.hours.map((entry) => entry.dayOfWeek)).size === 7, {
    message: "Each day of the week must appear exactly once",
  });

function toBusinessHoursEntry(entry: BusinessHoursDocument): BusinessHoursEntry {
  return {
    dayOfWeek: entry.dayOfWeek,
    isClosed: entry.isClosed ?? false,
    openTime: entry.openTime,
    closeTime: entry.closeTime,
  };
}

async function generateUniqueSlug(name: string): Promise<string> {
  const base = slugify(name) || "business";
  let candidate = base;
  let suffix = 2;
  // eslint-disable-next-line no-await-in-loop
  while (await Business.exists({ slug: candidate })) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

function toBusinessProfile(business: BusinessDocument): BusinessProfile {
  return {
    id: business.id,
    ownerId: business.ownerId.toString(),
    name: business.name,
    slug: business.slug,
    description: business.description ?? undefined,
    phone: business.phone ?? undefined,
    email: business.email ?? undefined,
    address: business.address ?? undefined,
    website: business.website ?? undefined,
    socials: toSocialLinks(business.socials),
    timezone: business.timezone,
    logoUrl: business.logoUrl || undefined,
    coverImageUrl: business.coverImageUrl || undefined,
    currency: business.currency ?? "USD",
    isPublicBookingEnabled: business.isPublicBookingEnabled ?? true,
    emailNotificationsEnabled: business.emailNotificationsEnabled ?? true,
    notifyCustomerOnBooking: business.notifyCustomerOnBooking ?? true,
    notifyCustomerReminder: business.notifyCustomerReminder ?? true,
    notifyOwnerOnBooking: business.notifyOwnerOnBooking ?? true,
    createdAt: business.createdAt.toISOString(),
    updatedAt: business.updatedAt.toISOString(),
  };
}

export const businessRouter = Router();

businessRouter.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new UnauthorizedError();
    }

    const payload = createBusinessSchema.parse(req.body);

    const existing = await Business.findOne({ ownerId: req.user.id });
    if (existing) {
      throw new ConflictError("You already have a business");
    }

    const slug = await generateUniqueSlug(payload.name);

    const business = await Business.create({
      ownerId: req.user.id,
      name: payload.name,
      slug,
      email: payload.email,
      phone: payload.phone,
      description: payload.description,
      timezone: payload.timezone ?? "UTC",
      currency: payload.currency ?? "USD",
    });

    const body: BusinessResponse = { business: toBusinessProfile(business) };
    res.status(201).json(body);
  }),
);

businessRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new UnauthorizedError();
    }

    const business = await Business.findOne({ ownerId: req.user.id });

    const body: MyBusinessResponse = { business: business ? toBusinessProfile(business) : null };
    res.json(body);
  }),
);

businessRouter.patch(
  "/",
  requireAuth,
  requireBusiness,
  asyncHandler(async (req, res) => {
    const updates = updateBusinessSchema.parse(req.body);

    const business = await Business.findByIdAndUpdate(
      req.businessId,
      { $set: updates },
      { new: true, runValidators: true },
    );

    if (!business) {
      throw new NotFoundError("Business not found");
    }

    const body: BusinessResponse = { business: toBusinessProfile(business) };
    res.json(body);
  }),
);

businessRouter.get(
  "/hours",
  requireAuth,
  requireBusiness,
  asyncHandler(async (req, res) => {
    const hours = await ensureBusinessHours(req.businessId as string);

    const body: BusinessHoursResponse = { hours: hours.map(toBusinessHoursEntry) };
    res.json(body);
  }),
);

businessRouter.put(
  "/hours",
  requireAuth,
  requireBusiness,
  asyncHandler(async (req, res) => {
    const { hours } = updateBusinessHoursSchema.parse(req.body);

    const operations = hours.map((entry) => ({
      updateOne: {
        filter: { businessId: req.businessId, dayOfWeek: entry.dayOfWeek },
        update: {
          $set: {
            isClosed: entry.isClosed,
            openTime: entry.openTime ?? PLACEHOLDER_OPEN_TIME,
            closeTime: entry.closeTime ?? PLACEHOLDER_CLOSE_TIME,
          },
        },
        upsert: true,
      },
    }));

    await BusinessHours.bulkWrite(operations);

    const updated = await BusinessHours.find({ businessId: req.businessId }).sort({ dayOfWeek: 1 });
    const body: BusinessHoursResponse = { hours: updated.map(toBusinessHoursEntry) };
    res.json(body);
  }),
);
