import { staffRatings } from "../lib/ratings";
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import type {
  ApiErrorBody,
  AvailableSlotsResponse,
  PublicBookingConfirmation,
  PublicBookingConfirmationResponse,
  PublicBusinessResponse,
  PublicCustomerSignupResponse,
  PublicEnquiryResponse,
  SocialLinks,
  PublicStaffListResponse,
} from "@servicebook/types";
import { Business } from "../models/Business";
import { Service } from "../models/Service";
import { Staff } from "../models/Staff";
import { Customer, type CustomerDocument } from "../models/Customer";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError, isDuplicateKeyError } from "../lib/errors";
import { Booking } from "../models/Booking";
import { TimeOff } from "../models/TimeOff";
import { ensureBusinessHours } from "../lib/businessHours";
import { Enquiry } from "../models/Enquiry";
import { SOCIAL_CHANNELS, toSocialLinks } from "../lib/socials";
import { ensureAccessToken, postWelcomeMessage, ensureCustomerToken } from "../lib/bookingChat";
import { notify } from "../lib/notify";
import { formatInTimeZone } from "date-fns-tz";
import { asyncHandler } from "../utils/asyncHandler";
import { objectIdField } from "../lib/validation";
import { computeAvailableSlots, createValidatedBooking, getLocalDateAndTime, localDayStartUtc, nextDateKey } from "../lib/bookingEngine";

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

// "any" (or no staffId) means the customer has no preference.
const staffChoiceField = z.union([objectIdField, z.literal("any")]).optional();

const availabilityQuerySchema = z.object({
  serviceId: objectIdField,
  staffId: staffChoiceField,
  date: dateKeyField,
});

const publicCreateBookingSchema = z.object({
  serviceId: objectIdField,
  staffId: staffChoiceField,
  startTime: z.string().datetime({ message: "startTime must be an ISO 8601 datetime" }),
  notes: z.string().trim().max(2000).optional(),
  customer: z.object({
    name: z.string().trim().min(1, "Name is required").max(120),
    phone: z.string().trim().min(1, "Phone number is required").max(30),
    email: z.string().trim().toLowerCase().email("Enter a valid email address").optional(),
  }),
});

const customerSignupSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  phone: z.string().trim().min(7, "Enter a valid phone number").max(30),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email address")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  notes: z.string().trim().max(500).optional(),
});

const enquirySchema = z.object({
  channel: z.enum(SOCIAL_CHANNELS),
  name: z.string().trim().min(1, "Name is required").max(120),
  phone: z.string().trim().min(7, "Enter a valid phone number").max(30),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email address")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  serviceId: objectIdField.optional(),
  message: z.string().trim().max(1000).optional(),
  // Honeypot: a field real visitors never see. Bots that fill it get a 400.
  company: z.string().max(0).optional(),
});

/** The business's chat channels; the business phone doubles as WhatsApp when no number is set. */
function publicSocials(business: { socials?: Parameters<typeof toSocialLinks>[0]; phone?: string | null }): SocialLinks {
  const links = toSocialLinks(business.socials);
  const phoneDigits = business.phone?.replace(/[^\d]/g, "");
  if (!links.whatsapp && phoneDigits && phoneDigits.length >= 8) links.whatsapp = phoneDigits;
  return links;
}

const REFERENCE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function newReference(): string {
  let code = "";
  for (let i = 0; i < 5; i += 1) code += REFERENCE_ALPHABET[Math.floor(Math.random() * REFERENCE_ALPHABET.length)];
  return `SB-${code}`;
}

// Sign-ups write to the database, so they get a tighter budget than browsing.
const signupRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: { message: "Too many sign-ups from this device. Please try again later.", code: "RATE_LIMITED" },
  } satisfies ApiErrorBody,
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
  input: { name: string; phone: string; email?: string; notes?: string },
  source: "booking" | "link" | "chat" = "booking",
): Promise<CustomerDocument> {
  const existing = await Customer.findOne({ businessId, phone: input.phone });
  if (existing) {
    return existing;
  }

  try {
    return await Customer.create({
      businessId,
      name: input.name,
      phone: input.phone,
      email: input.email,
      notes: input.notes,
      source,
    });
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

/**
 * Order in which staff are tried when the customer has no preference: the
 * owner first (if they take appointments), then whoever has the lightest day.
 */
async function rankStaffForAnyChoice(params: {
  businessId: string;
  ownerId: string;
  serviceId: string;
  startTime: Date;
  timezone: string;
}): Promise<string[]> {
  const staff = await Staff.find({ businessId: params.businessId, isActive: true, serviceIds: params.serviceId }).select("_id userId");
  if (staff.length <= 1) return staff.map((member) => member.id);

  const { dateKey } = getLocalDateAndTime(params.startTime, params.timezone);
  const dayStart = localDayStartUtc(dateKey, params.timezone);
  const dayEnd = localDayStartUtc(nextDateKey(dateKey), params.timezone);
  const counts = await Booking.aggregate<{ _id: unknown; count: number }>([
    { $match: { staffId: { $in: staff.map((member) => member._id) }, status: { $ne: "CANCELLED" }, startTime: { $gte: dayStart, $lt: dayEnd } } },
    { $group: { _id: "$staffId", count: { $sum: 1 } } },
  ]);
  const load = new Map(counts.map((entry) => [String(entry._id), entry.count]));
  const isOwner = (member: (typeof staff)[number]) => member.userId?.toString() === params.ownerId;

  return [...staff]
    .sort((a, b) => Number(isOwner(b)) - Number(isOwner(a)) || (load.get(a.id) ?? 0) - (load.get(b.id) ?? 0))
    .map((member) => member.id);
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
    const now = new Date();
    const [services, hours, closures] = await Promise.all([
      bookingEnabled ? Service.find({ businessId: business.id, isActive: true }).sort({ name: 1 }) : Promise.resolve([]),
      ensureBusinessHours(business.id),
      TimeOff.find({ businessId: business.id, staffId: null, endAt: { $gt: now }, startAt: { $lt: new Date(now.getTime() + 60 * 86_400_000) } }).sort({
        startAt: 1,
      }),
    ]);

    const body: PublicBusinessResponse = {
      business: {
        name: business.name,
        slug: business.slug,
        description: business.description ?? undefined,
        timezone: business.timezone,
        logoUrl: business.logoUrl || undefined,
        coverImageUrl: business.coverImageUrl || undefined,
        currency: business.currency ?? "USD",
        phone: business.phone ?? undefined,
        email: business.email ?? undefined,
        address: business.address ?? undefined,
        website: business.website ?? undefined,
        socials: publicSocials(business),
        brandColor: business.brandColor || undefined,
      },
      services: services.map((service) => ({
        id: service.id,
        name: service.name,
        description: service.description ?? undefined,
        imageUrl: service.imageUrl || undefined,
        durationMinutes: service.durationMinutes,
        price: service.price,
      })),
      bookingEnabled,
      hours: [...hours]
        .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
        .map((entry) => ({
          dayOfWeek: entry.dayOfWeek,
          isClosed: Boolean(entry.isClosed),
          openTime: entry.isClosed ? undefined : (entry.openTime ?? undefined),
          closeTime: entry.isClosed ? undefined : (entry.closeTime ?? undefined),
        })),
      closures: closures.map((entry) => ({
        allDay: entry.allDay ?? true,
        startDate: entry.startDate,
        endDate: entry.endDate,
        startTime: entry.startTime ?? undefined,
        endTime: entry.endTime ?? undefined,
      })),
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
    const ratings = await staffRatings(business.id);

    const body: PublicStaffListResponse = {
      staff: staff.map((member) => {
        const rating = ratings.get(member.id);
        return { id: member.id, name: member.name, avatarUrl: member.avatarUrl || undefined, title: member.title || undefined, rating: rating?.rating, reviewCount: rating?.count ?? 0 };
      }),
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

    let staffIds: string[];
    if (query.staffId && query.staffId !== "any") {
      const staff = await Staff.findOne({ _id: query.staffId, businessId: business.id, isActive: true });
      if (!staff) {
        throw new BadRequestError("This staff member is no longer available");
      }
      if (!staff.serviceIds.some((id) => id.toString() === query.serviceId)) {
        throw new BadRequestError("This staff member doesn't provide the selected service");
      }
      staffIds = [staff.id];
    } else {
      staffIds = (await Staff.find({ businessId: business.id, isActive: true, serviceIds: query.serviceId }).select("_id")).map((s) => s.id);
    }

    // With no preference, a time is offered if anyone who does the service is free then.
    const perStaff = await Promise.all(
      staffIds.map((staffId) =>
        computeAvailableSlots({
          businessId: business.id,
          business,
          staffId,
          serviceDurationMinutes: service.durationMinutes,
          dateKey: query.date,
        }),
      ),
    );
    const slots = Array.from(new Set(perStaff.flat().map((slot) => slot.getTime())))
      .sort((a, b) => a - b)
      .map((time) => new Date(time));

    const body: AvailableSlotsResponse = { slots: slots.map((slot) => slot.toISOString()) };
    res.json(body);
  }),
);

// A customer adds themselves to a business's client list from the invite
// link. The response is the same whether or not the phone number was already
// on the list, so the endpoint can't be used to check who is a customer, and
// an existing record is never overwritten by an anonymous request.
publicBookingRouter.post(
  "/businesses/:slug/customers",
  signupRateLimit,
  asyncHandler(async (req, res) => {
    const business = await resolveBusinessBySlug(req.params.slug);
    const payload = customerSignupSchema.parse(req.body);
    const joined = await findOrCreateCustomer(business.id, payload, "link");
    // Only a new record is news; re-joining with a known number isn't.
    if (Date.now() - joined.createdAt.getTime() < 10_000) {
      await notify({
        businessId: business.id,
        type: "signup",
        title: `${joined.name} joined your client list`,
        body: joined.phone,
        link: `/customers/${joined.id}`,
      });
    }
    const body: PublicCustomerSignupResponse = { businessName: business.name, bookingEnabled: business.isPublicBookingEnabled };
    res.status(201).json(body);
  }),
);

// Every "Chat with us" tap starts here: the customer's details and question
// are saved (and they're added to the client list) before the page sends
// them on to WhatsApp, Instagram and so on with a reference to quote.
publicBookingRouter.post(
  "/businesses/:slug/enquiries",
  signupRateLimit,
  asyncHandler(async (req, res) => {
    const business = await resolveBusinessBySlug(req.params.slug);
    const payload = enquirySchema.parse(req.body);

    if (!publicSocials(business)[payload.channel]) {
      throw new BadRequestError("This business isn't on that app yet");
    }

    let serviceName: string | undefined;
    if (payload.serviceId) {
      const service = await Service.findOne({ _id: payload.serviceId, businessId: business.id, isActive: true }).select("name");
      serviceName = service?.name;
    }

    const customer = await findOrCreateCustomer(business.id, payload, "chat");

    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        const enquiry = await Enquiry.create({
          businessId: business.id,
          customerId: customer.id,
          channel: payload.channel,
          reference: newReference(),
          name: payload.name,
          phone: payload.phone,
          email: payload.email,
          serviceId: serviceName ? payload.serviceId : undefined,
          serviceName,
          message: payload.message,
        });
        await notify({
          businessId: business.id,
          type: "enquiry",
          title: `${payload.name} wants to chat on ${payload.channel === "x" ? "X" : payload.channel.charAt(0).toUpperCase() + payload.channel.slice(1)}`,
          body: [serviceName, payload.message].filter(Boolean).join(" · ") || `Ref ${enquiry.reference}`,
          link: "/inbox?tab=requests",
        });
        const body: PublicEnquiryResponse = { reference: enquiry.reference };
        res.status(201).json(body);
        return;
      } catch (error) {
        if (!isDuplicateKeyError(error)) throw error;
      }
    }
    throw new ConflictError("Please try again");
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
    const startTime = new Date(payload.startTime);
    const candidates =
      payload.staffId && payload.staffId !== "any"
        ? [payload.staffId]
        : await rankStaffForAnyChoice({ businessId: business.id, ownerId: business.ownerId.toString(), serviceId: payload.serviceId, startTime, timezone: business.timezone });
    if (candidates.length === 0) {
      throw new BadRequestError("Nobody offers this service right now");
    }

    // Try each candidate in order; the first one free at that time gets the booking.
    let result: Awaited<ReturnType<typeof createValidatedBooking>> | undefined;
    let lastError: unknown;
    for (const staffId of candidates) {
      try {
        result = await createValidatedBooking({
          businessId: business.id,
          business,
          serviceId: payload.serviceId,
          staffId,
          customer,
          startTime,
          notes: payload.notes,
        });
        break;
      } catch (error) {
        lastError = error;
        const retryable = candidates.length > 1 && (error instanceof ConflictError || error instanceof BadRequestError);
        if (!retryable || (error instanceof Error && error.message.includes("customer"))) {
          throw error;
        }
      }
    }
    if (!result) {
      throw lastError instanceof ConflictError ? lastError : new ConflictError("That time was just taken. Please pick another one.");
    }
    const { booking, service, staff } = result;
    const accessToken = await ensureAccessToken(booking);
    await notify({
      businessId: business.id,
      type: "booking",
      title: `New booking: ${service.name}`,
      body: `${customer.name} · ${formatInTimeZone(booking.startTime, business.timezone, "EEE d MMM, h:mm a")} · ${staff.name}`,
      link: `/bookings/${booking.id}`,
    });
    // Start the booking's chat with a reply, so the customer isn't left with silence.
    await postWelcomeMessage({
      booking,
      businessTimezone: business.timezone,
      customerName: customer.name,
      serviceName: service.name,
      staffName: staff.name,
    }).catch((error: unknown) => console.warn("Welcome message failed:", error));

    const confirmation: PublicBookingConfirmation = {
      serviceName: service.name,
      staffName: staff.name,
      startTime: booking.startTime.toISOString(),
      endTime: booking.endTime.toISOString(),
      customerName: customer.name,
      customerEmail: customer.email ?? undefined,
      status: booking.status,
      accessToken,
      customerToken: await ensureCustomerToken(customer),
    };

    const body: PublicBookingConfirmationResponse = { confirmation };
    res.status(201).json(body);
  }),
);
