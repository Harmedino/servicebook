import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import type {
  ApiErrorBody,
  BookingMessagesResponse,
  BookingStatus,
  ChatMessageResponse,
  ConversationListResponse,
  ConversationSummary,
  PublicBookingThreadResponse,
} from "@servicebook/types";
import { Booking, type BookingDocument } from "../models/Booking";
import { Business } from "../models/Business";
import { Customer } from "../models/Customer";
import { Message } from "../models/Message";
import { Review } from "../models/Review";
import { publicName } from "../lib/ratings";
import { BadRequestError, NotFoundError, UnauthorizedError } from "../lib/errors";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth, requireBusiness } from "../middleware/auth";
import { ensureAccessToken, scheduleDemoReply, toChatMessage } from "../lib/bookingChat";
import { emailsAllowed } from "../lib/demo";
import { sendEmail } from "../services/email";
import { newMessageEmail } from "../emails/message";
import { notify } from "../lib/notify";
import { formatInTimeZone } from "date-fns-tz";
import { webAppUrl } from "../config/env";

const messageSchema = z.object({ body: z.string().trim().min(1, "Write a message first").max(1000, "Keep it under 1000 characters") });

const ACTIVE: BookingStatus[] = ["PENDING", "CONFIRMED"];

const chatRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: "You're sending messages too quickly. Please wait a moment.", code: "RATE_LIMITED" } } satisfies ApiErrorBody,
});

async function bookingByToken(token: string): Promise<BookingDocument> {
  // Tokens are 24 URL-safe characters; anything else can't match.
  const booking = /^[A-Za-z0-9_-]{16,64}$/.test(token) ? await Booking.findOne({ accessToken: token }) : null;
  if (!booking) {
    throw new NotFoundError("This booking link isn't valid anymore");
  }
  return booking;
}

function canCancel(booking: BookingDocument): boolean {
  return ACTIVE.includes(booking.status as BookingStatus) && booking.startTime.getTime() > Date.now();
}

// ---- Customer side: /api/public/bookings/:token -------------------------------

export const publicBookingChatRouter = Router();

publicBookingChatRouter.get(
  "/:token",
  asyncHandler(async (req, res) => {
    const booking = await bookingByToken(req.params.token);
    const [business, customer, messages, review] = await Promise.all([
      Business.findById(booking.businessId),
      Customer.findById(booking.customerId),
      Message.find({ bookingId: booking._id }).sort({ createdAt: 1 }),
      Review.findOne({ bookingId: booking._id }).select("rating comment"),
    ]);
    if (!business) {
      throw new NotFoundError("This booking link isn't valid anymore");
    }

    // The customer has now seen everything the business sent.
    await Message.updateMany({ bookingId: booking._id, from: "business", readAt: null }, { $set: { readAt: new Date() } });

    const body: PublicBookingThreadResponse = {
      booking: {
        serviceName: booking.serviceName ?? "Appointment",
        staffName: booking.staffName ?? "",
        startTime: booking.startTime.toISOString(),
        endTime: booking.endTime.toISOString(),
        status: booking.status as BookingStatus,
        price: booking.price ?? undefined,
        customerName: customer?.name ?? "",
        canCancel: canCancel(booking),
        canReview: booking.status === "COMPLETED" && !review,
        review: review ? { rating: review.rating, comment: review.comment ?? undefined } : undefined,
      },
      business: {
        name: business.name,
        slug: business.slug,
        logoUrl: business.logoUrl || undefined,
        phone: business.phone ?? undefined,
        address: business.address ?? undefined,
        timezone: business.timezone,
        currency: business.currency ?? "USD",
      },
      messages: messages.map(toChatMessage),
    };
    res.json(body);
  }),
);

publicBookingChatRouter.post(
  "/:token/messages",
  chatRateLimit,
  asyncHandler(async (req, res) => {
    const booking = await bookingByToken(req.params.token);
    const { body } = messageSchema.parse(req.body);
    const message = await Message.create({
      businessId: booking.businessId,
      bookingId: booking._id,
      customerId: booking.customerId,
      from: "customer",
      body,
    });

    const [business, customer] = await Promise.all([
      Business.findById(booking.businessId).select("slug"),
      Customer.findById(booking.customerId).select("name"),
    ]);
    await notify({
      businessId: booking.businessId,
      type: "message",
      title: `Message from ${customer?.name ?? "a customer"}`,
      body: body.length > 120 ? `${body.slice(0, 117)}…` : body,
      link: "/inbox?tab=messages",
    });
    if (business) scheduleDemoReply({ businessSlug: business.slug, booking, customerText: body });

    const response: ChatMessageResponse = { message: toChatMessage(message) };
    res.status(201).json(response);
  }),
);

publicBookingChatRouter.post(
  "/:token/cancel",
  chatRateLimit,
  asyncHandler(async (req, res) => {
    const booking = await bookingByToken(req.params.token);
    if (!canCancel(booking)) {
      throw new BadRequestError("This booking can't be cancelled online anymore. Please message the business.");
    }
    booking.status = "CANCELLED";
    await booking.save();
    const [customer, owner] = await Promise.all([
      Customer.findById(booking.customerId).select("name"),
      Business.findById(booking.businessId).select("timezone"),
    ]);
    await notify({
      businessId: booking.businessId,
      type: "cancellation",
      title: `${customer?.name ?? "A customer"} cancelled`,
      body: `${booking.serviceName ?? "Appointment"} · ${formatInTimeZone(booking.startTime, owner?.timezone ?? "UTC", "EEE d MMM, h:mm a")}`,
      link: `/bookings/${booking.id}`,
    });
    await Message.create({
      businessId: booking.businessId,
      bookingId: booking._id,
      customerId: booking.customerId,
      from: "customer",
      automated: true,
      body: "I've cancelled this booking.",
    });
    res.json({ status: booking.status });
  }),
);

const reviewSchema = z.object({
  rating: z.number().int().min(1, "Pick a rating").max(5),
  comment: z.string().trim().max(600, "Keep it under 600 characters").optional(),
});

publicBookingChatRouter.post(
  "/:token/review",
  chatRateLimit,
  asyncHandler(async (req, res) => {
    const booking = await bookingByToken(req.params.token);
    if (booking.status !== "COMPLETED") {
      throw new BadRequestError("You can rate this once the appointment is done.");
    }
    if (await Review.exists({ bookingId: booking._id })) {
      throw new BadRequestError("You've already rated this appointment. Thank you!");
    }
    const { rating, comment } = reviewSchema.parse(req.body);
    const customer = await Customer.findById(booking.customerId).select("name");
    const review = await Review.create({
      businessId: booking.businessId,
      bookingId: booking._id,
      staffId: booking.staffId,
      serviceId: booking.serviceId,
      customerId: booking.customerId,
      customerName: publicName(customer?.name || "Customer"),
      serviceName: booking.serviceName,
      staffName: booking.staffName,
      rating,
      comment: comment || undefined,
    });
    await notify({
      businessId: booking.businessId,
      type: "review",
      title: `${"★".repeat(rating)}${"☆".repeat(5 - rating)} from ${customer?.name ?? "a customer"}`,
      body: comment ? (comment.length > 120 ? `${comment.slice(0, 117)}…` : comment) : `${booking.serviceName ?? "Appointment"} with ${booking.staffName ?? "your team"}`,
      link: "/showcase?tab=reviews",
    });
    res.status(201).json({ review: { rating: review.rating, comment: review.comment ?? undefined } });
  }),
);

// ---- Business side: /api/bookings/:id/messages --------------------------------

export const bookingMessagesRouter = Router({ mergeParams: true });

bookingMessagesRouter.use(requireAuth, requireBusiness);

async function ownedBooking(id: string, businessId: string | undefined): Promise<BookingDocument> {
  const booking = await Booking.findOne({ _id: id, businessId });
  if (!booking) {
    throw new NotFoundError("Booking not found");
  }
  return booking;
}

bookingMessagesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const booking = await ownedBooking(req.params.id, req.businessId);
    const [messages, accessToken] = await Promise.all([
      Message.find({ bookingId: booking._id }).sort({ createdAt: 1 }),
      ensureAccessToken(booking),
    ]);
    await Message.updateMany({ bookingId: booking._id, from: "customer", readAt: null }, { $set: { readAt: new Date() } });
    const body: BookingMessagesResponse = { messages: messages.map(toChatMessage), accessToken };
    res.json(body);
  }),
);

bookingMessagesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    if (!req.business) {
      throw new UnauthorizedError();
    }
    const business = req.business;
    const booking = await ownedBooking(req.params.id, req.businessId);
    const { body } = messageSchema.parse(req.body);
    const [message, accessToken] = await Promise.all([
      Message.create({ businessId: booking.businessId, bookingId: booking._id, customerId: booking.customerId, from: "business", body }),
      ensureAccessToken(booking),
    ]);

    // Let the customer know by email when we can; the reply is waiting on their booking page.
    const customer = await Customer.findById(booking.customerId);
    if (customer?.email && emailsAllowed(business)) {
      void sendEmail(
        newMessageEmail({
          to: customer.email,
          businessName: business.name,
          customerName: customer.name.split(/\s+/)[0],
          body,
          link: `${webAppUrl}/my-booking/${accessToken}`,
        }),
      ).catch((error: unknown) => console.error("New-message email failed:", error));
    }

    const response: ChatMessageResponse = { message: toChatMessage(message) };
    res.status(201).json(response);
  }),
);

// ---- Business side: /api/conversations ----------------------------------------

export const conversationsRouter = Router();

conversationsRouter.use(requireAuth, requireBusiness);

/** Booking chats where someone actually wrote something, newest first, with unread counts. */
conversationsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const grouped = await Message.aggregate<{
      _id: unknown;
      last: Parameters<typeof Message.hydrate>[0];
      unread: number;
      written: number;
    }>([
      { $match: { businessId: req.business?._id } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$bookingId",
          last: { $first: "$$ROOT" },
          unread: { $sum: { $cond: [{ $and: [{ $eq: ["$from", "customer"] }, { $eq: ["$readAt", null] }] }, 1, 0] } },
          // The automatic welcome alone isn't a conversation.
          written: { $sum: { $cond: [{ $or: [{ $eq: ["$from", "customer"] }, { $ne: ["$automated", true] }] }, 1, 0] } },
        },
      },
      { $match: { written: { $gt: 0 } } },
      { $sort: { "last.createdAt": -1 } },
      { $limit: 60 },
    ]);

    const bookings = await Booking.find({ _id: { $in: grouped.map((entry) => entry._id) } });
    const customers = await Customer.find({ _id: { $in: bookings.map((booking) => booking.customerId) } });
    const bookingById = new Map(bookings.map((booking) => [booking.id, booking]));
    const customerById = new Map(customers.map((customer) => [customer.id, customer]));

    const conversations: ConversationSummary[] = grouped.flatMap((entry) => {
      const booking = bookingById.get(String(entry._id));
      if (!booking) return [];
      const customer = customerById.get(booking.customerId.toString());
      return [
        {
          bookingId: booking.id,
          customerId: booking.customerId.toString(),
          customerName: customer?.name ?? "Customer",
          customerPhone: customer?.phone ?? undefined,
          serviceName: booking.serviceName ?? "Appointment",
          startTime: booking.startTime.toISOString(),
          status: booking.status as BookingStatus,
          lastMessage: toChatMessage(Message.hydrate(entry.last)),
          unread: entry.unread,
        },
      ];
    });

    const body: ConversationListResponse = {
      conversations,
      unread: conversations.reduce((sum, conversation) => sum + conversation.unread, 0),
    };
    res.json(body);
  }),
);
