import { formatInTimeZone } from "date-fns-tz";
import { Router } from "express";
import { z } from "zod";
import type {
  UpcomingBirthdaysResponse, CustomerListResponse, CustomerProfile, CustomerResponse, CustomerSource } from "@servicebook/types";
import { Customer, type CustomerDocument } from "../models/Customer";
import { Booking } from "../models/Booking";
import { ConflictError, NotFoundError } from "../lib/errors";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth, requireBusiness } from "../middleware/auth";
import { escapeRegExp } from "../lib/validation";

const nameField = z.string().trim().min(1, "Customer name is required").max(120, "Name is too long");
const phoneField = z.string().trim().min(1, "Phone number is required").max(30, "Phone number is too long");
const emailField = z.string().trim().toLowerCase().email("Enter a valid email address");
const notesField = z.string().trim().max(2000, "Notes are too long");
// "" clears it.
const birthdayField = z.union([z.string().regex(/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, "Pick a day and month"), z.literal("")]);

const createCustomerSchema = z.object({
  name: nameField,
  phone: phoneField,
  email: emailField.optional(),
  notes: notesField.optional(),
  birthday: birthdayField.optional(),
});

const updateCustomerSchema = z
  .object({
    name: nameField.optional(),
    phone: phoneField.optional(),
    email: emailField.optional(),
    notes: notesField.optional(),
    birthday: birthdayField.optional(),
  })
  .strict();

const listQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(25),
  sort: z.enum(["recent", "newest", "oldest", "name"]).default("recent"),
  filter: z.enum(["all", "upcoming", "past"]).default("all"),
});

interface CustomerStats {
  appointmentCount: number;
  lastAppointmentAt: Date;
}

export function toCustomerProfile(customer: CustomerDocument, stats?: CustomerStats): CustomerProfile {
  return {
    id: customer.id,
    businessId: customer.businessId.toString(),
    name: customer.name,
    phone: customer.phone,
    email: customer.email ?? undefined,
    notes: customer.notes ?? undefined,
    source: (customer.source as CustomerSource | undefined) ?? "manual",
    birthday: customer.birthday ?? undefined,
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString(),
    appointmentCount: stats?.appointmentCount,
    lastAppointmentAt: stats?.lastAppointmentAt?.toISOString(),
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
      birthday: payload.birthday || undefined,
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

    if (query.filter !== "all") {
      // "Upcoming"/"past" are booking properties, not customer properties —
      // resolve the matching customer ids from Bookings first (one indexed
      // query), then narrow the customer filter. Cheaper than a $lookup
      // across every customer, and avoids denormalizing anything onto Customer.
      const now = new Date();
      const bookingFilter: Record<string, unknown> =
        query.filter === "upcoming"
          ? { businessId: req.businessId, startTime: { $gte: now }, status: { $ne: "CANCELLED" } }
          : { businessId: req.businessId, startTime: { $lt: now } };
      const matchingCustomerIds = await Booking.distinct("customerId", bookingFilter);
      filter._id = { $in: matchingCustomerIds };
    }

    let customers: CustomerDocument[];
    let total: number;
    let totalPages: number;
    let page: number;

    if (query.sort === "recent") {
      // "Recently active" needs each matching customer's most recent booking
      // date before it can even determine page order, which a plain
      // find().sort() can't express. Resolved in two lightweight steps
      // instead of a $lookup: (1) a single Booking aggregation scoped to
      // this business (indexed on businessId) to get last-booking-per-customer
      // for everyone, then (2) an in-memory sort of just the matching
      // customer ids (id + createdAt only, not full documents) to pick the
      // page. Full documents are fetched only for that one page.
      const [matchingCustomers, lastBookingRows] = await Promise.all([
        Customer.find(filter).select("_id createdAt"),
        Booking.aggregate<{ _id: unknown; lastBookingAt: Date }>([
          { $match: { businessId: req.businessId } },
          { $group: { _id: "$customerId", lastBookingAt: { $max: "$startTime" } } },
        ]),
      ]);
      const lastBookingByCustomerId = new Map(
        lastBookingRows.map((row) => [(row._id as { toString(): string }).toString(), row.lastBookingAt]),
      );

      const sortedIds = matchingCustomers
        .slice()
        .sort((a, b) => {
          const aLast = lastBookingByCustomerId.get(a.id);
          const bLast = lastBookingByCustomerId.get(b.id);
          if (aLast && bLast) return bLast.getTime() - aLast.getTime();
          if (aLast) return -1;
          if (bLast) return 1;
          return b.createdAt.getTime() - a.createdAt.getTime();
        })
        .map((customer) => customer._id);

      total = sortedIds.length;
      totalPages = Math.max(1, Math.ceil(total / query.limit));
      page = Math.min(query.page, totalPages);
      const pageIds = sortedIds.slice((page - 1) * query.limit, (page - 1) * query.limit + query.limit);

      const pageDocs = await Customer.find({ _id: { $in: pageIds } });
      const docById = new Map(pageDocs.map((doc) => [doc.id, doc]));
      customers = pageIds.map((id) => docById.get(id.toString())).filter((doc): doc is CustomerDocument => Boolean(doc));
    } else {
      const sortSpec: Record<string, 1 | -1> =
        query.sort === "newest" ? { createdAt: -1 } : query.sort === "oldest" ? { createdAt: 1 } : { name: 1 };

      total = await Customer.countDocuments(filter);
      totalPages = Math.max(1, Math.ceil(total / query.limit));
      page = Math.min(query.page, totalPages);

      customers = await Customer.find(filter)
        .sort(sortSpec)
        .skip((page - 1) * query.limit)
        .limit(query.limit);
    }

    // Appointment count + last appointment, computed on the fly for just the
    // customers on this page (never stored) — bounded to page size, so this
    // stays cheap regardless of how many customers or bookings exist overall.
    // Count includes every booking regardless of status (a cancelled visit
    // still happened as a booking event) — Completed/Cancelled are broken
    // out separately on the customer detail page for anyone who needs that split.
    const customerIds = customers.map((customer) => customer._id);
    const stats = await Booking.aggregate<{ _id: unknown; count: number; lastAppointment: Date }>([
      { $match: { customerId: { $in: customerIds } } },
      { $group: { _id: "$customerId", count: { $sum: 1 }, lastAppointment: { $max: "$startTime" } } },
    ]);
    const statsByCustomerId = new Map(
      stats.map((entry) => [(entry._id as { toString(): string }).toString(), entry]),
    );

    const body: CustomerListResponse = {
      customers: customers.map((customer) => {
        const stat = statsByCustomerId.get(customer.id);
        return toCustomerProfile(
          customer,
          stat ? { appointmentCount: stat.count, lastAppointmentAt: stat.lastAppointment } : undefined,
        );
      }),
      pagination: { page, limit: query.limit, total, totalPages },
    };
    res.json(body);
  }),
);

/** Customers with a birthday in the next ?days= (default 7, max 31), soonest first. */
customersRouter.get(
  "/birthdays",
  asyncHandler(async (req, res) => {
    const days = Math.min(31, Math.max(1, Number(req.query.days) || 7));
    const timezone = req.business!.timezone;
    const today = formatInTimeZone(new Date(), timezone, "yyyy-MM-dd");
    const window = Array.from({ length: days }, (_, offset) => {
      const date = new Date(`${today}T12:00:00Z`);
      date.setUTCDate(date.getUTCDate() + offset);
      return date.toISOString().slice(5, 10);
    });
    const customers = await Customer.find({ businessId: req.businessId, birthday: { $in: window } }).select("name phone birthday").limit(200);
    const body: UpcomingBirthdaysResponse = {
      birthdays: customers
        .map((customer) => ({
          customerId: customer.id,
          name: customer.name,
          phone: customer.phone,
          birthday: customer.birthday as string,
          daysAway: window.indexOf(customer.birthday as string),
        }))
        .sort((a, b) => a.daysAway - b.daysAway),
    };
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

    const { birthday, ...rest } = updates;
    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, businessId: req.businessId },
      birthday === "" ? { $set: rest, $unset: { birthday: 1 } } : { $set: updates },
      { new: true, runValidators: true },
    );

    if (!customer) {
      throw new NotFoundError("Customer not found");
    }

    const body: CustomerResponse = { customer: toCustomerProfile(customer) };
    res.json(body);
  }),
);
