import { Router } from "express";
import { z } from "zod";
import type { BusinessProfile, BusinessResponse, MyBusinessResponse } from "@servicebook/types";
import { Business, type BusinessDocument } from "../models/Business";
import { ConflictError, NotFoundError, UnauthorizedError } from "../lib/errors";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth, requireBusiness } from "../middleware/auth";
import { slugify } from "../lib/slugify";

const VALID_TIMEZONES = new Set(
  typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : ["UTC"],
);

const nameField = z.string().trim().min(1, "Business name is required").max(120, "Business name is too long");
const emailField = z.string().trim().toLowerCase().email("Enter a valid email address");
const phoneField = z.string().trim().max(30, "Phone number is too long");
const descriptionField = z.string().trim().max(1000, "Description is too long");
const addressField = z.string().trim().max(300, "Address is too long");
const logoUrlField = z.string().trim().url("Enter a valid URL");
const timezoneField = z
  .string()
  .trim()
  .refine((value) => VALID_TIMEZONES.has(value), "Unrecognized timezone");

const createBusinessSchema = z.object({
  name: nameField,
  email: emailField.optional(),
  phone: phoneField.optional(),
  description: descriptionField.optional(),
  timezone: timezoneField.optional(),
});

const updateBusinessSchema = z
  .object({
    name: nameField.optional(),
    email: emailField.optional(),
    phone: phoneField.optional(),
    description: descriptionField.optional(),
    address: addressField.optional(),
    timezone: timezoneField.optional(),
    logoUrl: logoUrlField.optional(),
  })
  .strict();

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
    description: business.description,
    phone: business.phone,
    email: business.email,
    address: business.address,
    timezone: business.timezone,
    logoUrl: business.logoUrl,
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
