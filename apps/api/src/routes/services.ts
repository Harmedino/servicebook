import { Router } from "express";
import { z } from "zod";
import type { ServiceListResponse, ServiceProfile, ServiceResponse } from "@servicebook/types";
import { Service, type ServiceDocument } from "../models/Service";
import { NotFoundError } from "../lib/errors";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth, requireBusiness } from "../middleware/auth";

const nameField = z.string().trim().min(1, "Service name is required").max(120, "Service name is too long");
const descriptionField = z.string().trim().max(1000, "Description is too long");
const priceField = z.number().min(0, "Price must be zero or greater");
const durationField = z
  .number()
  .int("Duration must be a whole number of minutes")
  .min(1, "Duration must be at least 1 minute")
  .max(1440, "Duration must be less than 24 hours");

const createServiceSchema = z.object({
  name: nameField,
  description: descriptionField.optional(),
  price: priceField,
  durationMinutes: durationField,
  isActive: z.boolean().optional(),
});

const updateServiceSchema = z
  .object({
    name: nameField.optional(),
    description: descriptionField.optional(),
    price: priceField.optional(),
    durationMinutes: durationField.optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

const listQuerySchema = z.object({
  active: z.enum(["true", "false"]).optional(),
});

function toServiceProfile(service: ServiceDocument): ServiceProfile {
  return {
    id: service.id,
    businessId: service.businessId.toString(),
    name: service.name,
    description: service.description ?? undefined,
    durationMinutes: service.durationMinutes,
    price: service.price,
    isActive: service.isActive ?? true,
    createdAt: service.createdAt.toISOString(),
    updatedAt: service.updatedAt.toISOString(),
  };
}

export const servicesRouter = Router();

// Every service route needs a resolved business — apply once for the whole router.
servicesRouter.use(requireAuth, requireBusiness);

servicesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const payload = createServiceSchema.parse(req.body);

    const service = await Service.create({
      businessId: req.businessId,
      name: payload.name,
      description: payload.description,
      price: payload.price,
      durationMinutes: payload.durationMinutes,
      isActive: payload.isActive ?? true,
    });

    const body: ServiceResponse = { service: toServiceProfile(service) };
    res.status(201).json(body);
  }),
);

servicesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const query = listQuerySchema.parse(req.query);

    const filter: Record<string, unknown> = { businessId: req.businessId };
    if (query.active !== undefined) {
      filter.isActive = query.active === "true";
    }

    const services = await Service.find(filter).sort({ name: 1 });

    const body: ServiceListResponse = { services: services.map(toServiceProfile) };
    res.json(body);
  }),
);

servicesRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const service = await Service.findOne({ _id: req.params.id, businessId: req.businessId });
    if (!service) {
      // Same 404 whether the id doesn't exist or belongs to another business —
      // never reveal that a service exists in another tenant.
      throw new NotFoundError("Service not found");
    }

    const body: ServiceResponse = { service: toServiceProfile(service) };
    res.json(body);
  }),
);

servicesRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const updates = updateServiceSchema.parse(req.body);

    const service = await Service.findOneAndUpdate(
      { _id: req.params.id, businessId: req.businessId },
      { $set: updates },
      { new: true, runValidators: true },
    );

    if (!service) {
      throw new NotFoundError("Service not found");
    }

    const body: ServiceResponse = { service: toServiceProfile(service) };
    res.json(body);
  }),
);

// Soft delete: no booking routes exist yet, but the Booking model already
// references serviceId, and Service already has `isActive` for exactly this
// purpose. Hard-deleting would orphan any future booking's service reference,
// so DELETE deactivates instead of removing the document. There is
// deliberately no hard-delete endpoint in this milestone.
servicesRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const service = await Service.findOneAndUpdate(
      { _id: req.params.id, businessId: req.businessId },
      { $set: { isActive: false } },
      { new: true },
    );

    if (!service) {
      throw new NotFoundError("Service not found");
    }

    const body: ServiceResponse = { service: toServiceProfile(service) };
    res.json(body);
  }),
);
