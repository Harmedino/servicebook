import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import type {
  ApiErrorBody,
  AvailableSlotsResponse,
  PublicBookingConfirmation,
  PublicBookingConfirmationResponse,
  PublicBusinessResponse,
  PublicStaffListResponse,
} from "@servicebook/types";
import { Business } from "../models/Business";
import { Service } from "../models/Service";
import { Staff } from "../models/Staff";
import { Customer, type CustomerDocument } from "../models/Customer";
import { BadRequestError, ForbiddenError, NotFoundError, isDuplicateKeyError } from "../lib/errors";
import { asyncHandler } from "../utils/asyncHandler";
import { objectIdField } from "../lib/validation";
import { computeAvailableSlots, createValidatedBooking } from "../lib/bookingEngine";

// Public pages involve several GET requests as a customer clicks through
// steps, so this is deliberately more generous than the auth rate limit —
// just a basic counter-measure against abuse, not a full security system.
const publicRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: { message: "Too many requests. Please try again later.", code: "RATE_LIMITED" },
  } satisfies ApiErrorBody,
});

const dateKeyField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD");

const staffQuerySchema = z.object({
  serviceId: objectIdField,
});

const availabilityQuerySchema = z.object({
  serviceId: objectIdField,
  staffId: objectIdField,
  date: dateKeyField,
});

const publicCreateBookingSchema = z.object({
  serviceId: objectIdField,
  staffId: objectIdField,
  startTime: z.string().datetime({ message: "startTime must be an ISO 8601 datetime" }),
  notes: z.string().trim().max(2000).optional(),
  customer: z.object({
    name: z.string().trim().min(1, "Name is required").max(120),
    phone: z.string().trim().min(1, "Phone number is required").max(30),
    email: z.string().trim().toLowerCase().email("Enter a valid email address").optional(),
  }),
});

async function resolveBusinessBySlug(slug: string) {
  const business = await Business.findOne({ slug });
  if (!business) {
    throw new NotFoundError("Business not found");
  }
  return business;
}

/** Rejects staff/availability/booking-creation requests while the owner has public booking turned off — hiding the service list on the info page isn't enough, the API must actually refuse these too. */
function assertPublicBookingEnabled(business: { isPublicBookingEnabled: boolean }): void {
  if (!business.isPublicBookingEnabled) {
    throw new ForbiddenError("Online booking is currently unavailable");
  }
}

/** Finds an existing customer for this business by phone, or creates one — never a global customer. */
async function findOrCreateCustomer(
  businessId: string,
  input: { name: string; phone: string; email?: string },
): Promise<CustomerDocument> {
  const existing = await Customer.findOne({ businessId, phone: input.phone });
  if (existing) {
    return existing;
  }

  try {
    return await Customer.create({ businessId, name: input.name, phone: input.phone, email: input.email });
  } catch (error) {
    // Two simultaneous public bookings from the same new customer — the
    // {businessId, phone} unique index caught the race. Use the record the
    // other request just created instead of failing this booking.
    if (isDuplicateKeyError(error)) {
      const winner = await Customer.findOne({ businessId, phone: input.phone });
      if (winner) {
        return winner;
      }
    }
    throw error;
  }
}

export const publicBookingRouter = Router();

publicBookingRouter.use(publicRateLimit);

publicBookingRouter.get(
  "/businesses/:slug",
  asyncHandler(async (req, res) => {
    const business = await resolveBusinessBySlug(req.params.slug);
    const bookingEnabled = business.isPublicBookingEnabled;
    // Booking is still off even if this list were non-empty — don't bother
    // fetching services the customer won't be able to book anyway.
    const services = bookingEnabled
      ? await Service.find({ businessId: business.id, isActive: true }).sort({ name: 1 })
      : [];

    const body: PublicBusinessResponse = {
      business: {
        name: business.name,
        slug: business.slug,
        description: business.description ?? undefined,
        timezone: business.timezone,
        logoUrl: business.logoUrl ?? undefined,
        currency: business.currency ?? "USD",
        phone: business.phone ?? undefined,
        email: business.email ?? undefined,
        address: business.address ?? undefined,
        website: business.website ?? undefined,
      },
      services: services.map((service) => ({
        id: service.id,
        name: service.name,
        description: service.description ?? undefined,
        durationMinutes: service.durationMinutes,
        price: service.price,
      })),
      bookingEnabled,
    };
    res.json(body);
  }),
);

publicBookingRouter.get(
  "/businesses/:slug/staff",
  asyncHandler(async (req, res) => {
    const business = await resolveBusinessBySlug(req.params.slug);
    assertPublicBookingEnabled(business);
    const query = staffQuerySchema.parse(req.query);

    const service = await Service.findOne({ _id: query.serviceId, businessId: business.id, isActive: true });
    if (!service) {
      throw new BadRequestError("This service is no longer available");
    }

    const staff = await Staff.find({
      businessId: business.id,
      isActive: true,
      serviceIds: query.serviceId,
    }).sort({ name: 1 });

    const body: PublicStaffListResponse = {
      staff: staff.map((member) => ({ id: member.id, name: member.name })),
    };
    res.json(body);
  }),
);

publicBookingRouter.get(
  "/businesses/:slug/availability",
  asyncHandler(async (req, res) => {
    const business = await resolveBusinessBySlug(req.params.slug);
    assertPublicBookingEnabled(business);
    const query = availabilityQuerySchema.parse(req.query);

    const service = await Service.findOne({ _id: query.serviceId, businessId: business.id, isActive: true });
    if (!service) {
      throw new BadRequestError("This service is no longer available");
    }

    const staff = await Staff.findOne({ _id: query.staffId, businessId: business.id, isActive: true });
    if (!staff) {
      throw new BadRequestError("This staff member is no longer available");
    }
    if (!staff.serviceIds.some((id) => id.toString() === query.serviceId)) {
      throw new BadRequestError("This staff member doesn't provide the selected service");
    }

    const slots = await computeAvailableSlots({
      businessId: business.id,
      business,
      staffId: query.staffId,
      serviceDurationMinutes: service.durationMinutes,
      dateKey: query.date,
    });

    const body: AvailableSlotsResponse = { slots: slots.map((slot) => slot.toISOString()) };
    res.json(body);
  }),
);

publicBookingRouter.post(
  "/businesses/:slug/bookings",
  asyncHandler(async (req, res) => {
    const business = await resolveBusinessBySlug(req.params.slug);
    assertPublicBookingEnabled(business);
    const payload = publicCreateBookingSchema.parse(req.body);

    const customer = await findOrCreateCustomer(business.id, payload.customer);

    // Everything from here — service/staff ownership, active checks, the
    // staff/service relationship, duration, business hours, staff
    // availability, and conflict detection — runs through the exact same
    // function POST /api/bookings uses. The public flow cannot bypass a
    // rule the internal flow enforces because it's the same code, not a
    // re-implementation of it.
    const { booking, service, staff } = await createValidatedBooking({
      businessId: business.id,
      business,
      serviceId: payload.serviceId,
      staffId: payload.staffId,
      customer,
      startTime: new Date(payload.startTime),
      notes: payload.notes,
    });

    const confirmation: PublicBookingConfirmation = {
      serviceName: service.name,
      staffName: staff.name,
      startTime: booking.startTime.toISOString(),
      endTime: booking.endTime.toISOString(),
      customerName: customer.name,
      customerEmail: customer.email ?? undefined,
      status: booking.status,
    };

    const body: PublicBookingConfirmationResponse = { confirmation };
    res.status(201).json(body);
  }),
);
