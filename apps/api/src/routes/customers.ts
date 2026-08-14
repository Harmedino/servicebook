import { Router } from "express";
import { z } from "zod";
import type { CustomerListResponse, CustomerProfile, CustomerResponse } from "@servicebook/types";
import { Customer, type CustomerDocument } from "../models/Customer";
import { ConflictError, NotFoundError } from "../lib/errors";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth, requireBusiness } from "../middleware/auth";
import { escapeRegExp } from "../lib/validation";

const nameField = z.string().trim().min(1, "Customer name is required").max(120, "Name is too long");
const phoneField = z.string().trim().min(1, "Phone number is required").max(30, "Phone number is too long");
const emailField = z.string().trim().toLowerCase().email("Enter a valid email address");
const notesField = z.string().trim().max(2000, "Notes are too long");

const createCustomerSchema = z.object({
  name: nameField,
  phone: phoneField,
  email: emailField.optional(),
  notes: notesField.optional(),
});

const updateCustomerSchema = z
  .object({
    name: nameField.optional(),
    phone: phoneField.optional(),
    email: emailField.optional(),
    notes: notesField.optional(),
  })
  .strict();

const listQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
});

function toCustomerProfile(customer: CustomerDocument): CustomerProfile {
  return {
    id: customer.id,
    businessId: customer.businessId.toString(),
    name: customer.name,
    phone: customer.phone,
    email: customer.email ?? undefined,
    notes: customer.notes ?? undefined,
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString(),
  };
}

export const customersRouter = Router();

// Every customer route needs a resolved business — apply once for the whole router.
customersRouter.use(requireAuth, requireBusiness);

// No delete/deactivate endpoint in this milestone. Unlike Service/Staff,
// Customer has no active/status field, and Bookings (the reason a "soft"
// removal would matter) don't exist yet either. Adding a lifecycle field
// just to support deletion ahead of that real requirement would be
// inventing a mechanism before it's needed — revisit once Bookings
// reference customers and the actual constraint is known.

customersRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const payload = createCustomerSchema.parse(req.body);

    const existing = await Customer.findOne({ businessId: req.businessId, phone: payload.phone });
    if (existing) {
      throw new ConflictError("A customer with this phone number already exists");
    }

    const customer = await Customer.create({
      businessId: req.businessId,
      name: payload.name,
      phone: payload.phone,
      email: payload.email,
      notes: payload.notes,
    });

    const body: CustomerResponse = { customer: toCustomerProfile(customer) };
    res.status(201).json(body);
  }),
);

customersRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const query = listQuerySchema.parse(req.query);

    const filter: Record<string, unknown> = { businessId: req.businessId };
    if (query.q) {
      const pattern = new RegExp(escapeRegExp(query.q), "i");
      filter.$or = [{ name: pattern }, { email: pattern }, { phone: pattern }];
    }

    const customers = await Customer.find(filter).sort({ name: 1 });

    const body: CustomerListResponse = { customers: customers.map(toCustomerProfile) };
    res.json(body);
  }),
);

customersRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const customer = await Customer.findOne({ _id: req.params.id, businessId: req.businessId });
    if (!customer) {
      // Same 404 whether the id doesn't exist or belongs to another business.
      throw new NotFoundError("Customer not found");
    }

    const body: CustomerResponse = { customer: toCustomerProfile(customer) };
    res.json(body);
  }),
);

customersRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const updates = updateCustomerSchema.parse(req.body);

    if (updates.phone !== undefined) {
      const existing = await Customer.findOne({
        businessId: req.businessId,
        phone: updates.phone,
        _id: { $ne: req.params.id },
      });
      if (existing) {
        throw new ConflictError("A customer with this phone number already exists");
      }
    }

    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, businessId: req.businessId },
      { $set: updates },
      { new: true, runValidators: true },
    );

    if (!customer) {
      throw new NotFoundError("Customer not found");
    }

    const body: CustomerResponse = { customer: toCustomerProfile(customer) };
    res.json(body);
  }),
);
