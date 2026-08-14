import { Router } from "express";
import { z } from "zod";
import type { ServiceListResponse, ServiceProfile, ServiceResponse } from "@servicebook/types";
import { Service, type ServiceDocument } from "../models/Service";
import { Staff } from "../models/Staff";
import { BadRequestError, NotFoundError } from "../lib/errors";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth, requireBusiness } from "../middleware/auth";
import { objectIdField } from "../lib/validation";

const nameField = z.string().trim().min(1, "Service name is required").max(120, "Service name is too long");
const descriptionField = z.string().trim().max(1000, "Description is too long");
const priceField = z
  .number()
  .min(0, "Price must be zero or greater")
  .max(100_000, "Price is unreasonably large")
  .multipleOf(0.01, "Price can have at most 2 decimal places");
const durationField = z
  .number()
  .int("Duration must be a whole number of minutes")
  .min(1, "Duration must be at least 1 minute")
  .max(1440, "Duration must be less than 24 hours");
const staffIdsField = z.array(objectIdField).max(200);

const createServiceSchema = z.object({
  name: nameField,
  description: descriptionField.optional(),
  price: priceField,
  durationMinutes: durationField,
  isActive: z.boolean().optional(),
  staffIds: staffIdsField.optional(),
});

const updateServiceSchema = z
  .object({
    name: nameField.optional(),
    description: descriptionField.optional(),
    price: priceField.optional(),
    durationMinutes: durationField.optional(),
    isActive: z.boolean().optional(),
    staffIds: staffIdsField.optional(),
  })
  .strict();

const listQuerySchema = z.object({
  active: z.enum(["true", "false"]).optional(),
});

/** Rejects the request if any staff id doesn't exist or belongs to another business — never trust staff ids from the client. */
async function assertStaffIdsBelongToBusiness(staffIds: string[], businessId: string): Promise<void> {
  if (staffIds.length === 0) {
    return;
  }
  const uniqueIds = Array.from(new Set(staffIds));
  const count = await Staff.countDocuments({ _id: { $in: uniqueIds }, businessId });
  if (count !== uniqueIds.length) {
    throw new BadRequestError("One or more staff members do not belong to your business");
  }
}

/**
 * Staff.serviceIds is the single source of truth for the staff<->service
 * relationship (see the note in staff.ts) — Service.staffIds is never
 * written to. Assigning staff from the service side means writing the
 * inverse side: adding this service to the newly-selected staff and
 * removing it from anyone deselected, so both views of the relationship
 * (staff-first and service-first) always agree with the one stored copy.
 */
async function syncStaffAssignments(serviceId: string, businessId: string, staffIds: string[]): Promise<void> {
  await assertStaffIdsBelongToBusiness(staffIds, businessId);

  const currentlyAssigned = await Staff.find({ businessId, serviceIds: serviceId }).select("_id");
  const currentIds = new Set(currentlyAssigned.map((staff) => staff.id));
  const nextIds = new Set(staffIds);

  const toAdd = staffIds.filter((id) => !currentIds.has(id));
  const toRemove = [...currentIds].filter((id) => !nextIds.has(id));

  if (toAdd.length > 0) {
    await Staff.updateMany({ _id: { $in: toAdd }, businessId }, { $addToSet: { serviceIds: serviceId } });
  }
  if (toRemove.length > 0) {
    await Staff.updateMany({ _id: { $in: toRemove }, businessId }, { $pull: { serviceIds: serviceId } });
  }
}

/** Batch-resolves which staff perform each service, without ever reading the unmaintained Service.staffIds field. */
async function loadStaffIdsByService(serviceIds: string[], businessId: string): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>(serviceIds.map((id) => [id, []]));
  if (serviceIds.length === 0) {
    return map;
  }
  const staffMembers = await Staff.find({ businessId, serviceIds: { $in: serviceIds } }).select("_id serviceIds");
  for (const staff of staffMembers) {
    for (const serviceId of staff.serviceIds) {
      const key = serviceId.toString();
      if (map.has(key)) {
        map.get(key)!.push(staff.id);
      }
    }
  }
  return map;
}

function toServiceProfile(service: ServiceDocument, staffIds: string[]): ServiceProfile {
  return {
    id: service.id,
    businessId: service.businessId.toString(),
    name: service.name,
    description: service.description ?? undefined,
    durationMinutes: service.durationMinutes,
    price: service.price,
    isActive: service.isActive ?? true,
    staffIds,
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

    if (payload.staffIds) {
      await assertStaffIdsBelongToBusiness(payload.staffIds, req.businessId as string);
    }

    const service = await Service.create({
      businessId: req.businessId,
      name: payload.name,
      description: payload.description,
      price: payload.price,
      durationMinutes: payload.durationMinutes,
      isActive: payload.isActive ?? true,
    });

    if (payload.staffIds && payload.staffIds.length > 0) {
      await Staff.updateMany(
        { _id: { $in: payload.staffIds }, businessId: req.businessId },
        { $addToSet: { serviceIds: service.id } },
      );
    }

    const body: ServiceResponse = { service: toServiceProfile(service, payload.staffIds ?? []) };
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
    const staffIdsByService = await loadStaffIdsByService(
      services.map((service) => service.id),
      req.businessId as string,
    );

    const body: ServiceListResponse = {
      services: services.map((service) => toServiceProfile(service, staffIdsByService.get(service.id) ?? [])),
    };
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

    const staffIdsByService = await loadStaffIdsByService([service.id], req.businessId as string);

    const body: ServiceResponse = { service: toServiceProfile(service, staffIdsByService.get(service.id) ?? []) };
    res.json(body);
  }),
);

servicesRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const { staffIds, ...updates } = updateServiceSchema.parse(req.body);

    // Validate staff ownership before writing anything — a rejected staffIds
    // list must not leave the other fields (name/price/etc.) partially saved.
    if (staffIds !== undefined) {
      await assertStaffIdsBelongToBusiness(staffIds, req.businessId as string);
    }

    const service = await Service.findOneAndUpdate(
      { _id: req.params.id, businessId: req.businessId },
      { $set: updates },
      { new: true, runValidators: true },
    );

    if (!service) {
      throw new NotFoundError("Service not found");
    }

    if (staffIds !== undefined) {
      await syncStaffAssignments(service.id, req.businessId as string, staffIds);
    }

    const staffIdsByService = await loadStaffIdsByService([service.id], req.businessId as string);

    const body: ServiceResponse = { service: toServiceProfile(service, staffIdsByService.get(service.id) ?? []) };
    res.json(body);
  }),
);

// Soft delete: the Booking model references serviceId, and Service already
// has `isActive` for exactly this purpose. Hard-deleting would orphan any
// booking's service reference and corrupt historical booking data, so DELETE
// deactivates instead of removing the document. There is deliberately no
// hard-delete endpoint in this milestone.
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

    const staffIdsByService = await loadStaffIdsByService([service.id], req.businessId as string);

    const body: ServiceResponse = { service: toServiceProfile(service, staffIdsByService.get(service.id) ?? []) };
    res.json(body);
  }),
);
