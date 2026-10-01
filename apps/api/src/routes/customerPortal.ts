import { Router } from "express";
import type { BookingStatus, CustomerPortalAppointment, CustomerPortalLinkResponse, CustomerPortalResponse } from "@servicebook/types";
import { Booking, type BookingDocument } from "../models/Booking";
import { Business } from "../models/Business";
import { Customer } from "../models/Customer";
import { Review } from "../models/Review";
import { NotFoundError } from "../lib/errors";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth, requireBusiness } from "../middleware/auth";
import { ensureAccessToken, ensureCustomerToken } from "../lib/bookingChat";

// ---- Customer side: /api/public/customers/:token ------------------------------

export const publicCustomerPortalRouter = Router();

publicCustomerPortalRouter.get(
  "/:token",
  asyncHandler(async (req, res) => {
    const { token } = req.params;
    const customer = /^[A-Za-z0-9_-]{16,64}$/.test(token) ? await Customer.findOne({ portalToken: token }) : null;
    if (!customer) throw new NotFoundError("This link isn't valid anymore");
    const business = await Business.findById(customer.businessId);
    if (!business) throw new NotFoundError("This link isn't valid anymore");

    const now = new Date();
    const [upcoming, past, visits] = await Promise.all([
      // Split by date; each appointment carries its status (a cancelled one stays where it was).
      Booking.find({ customerId: customer._id, endTime: { $gt: now } }).sort({ startTime: 1 }).limit(20),
      Booking.find({ customerId: customer._id, endTime: { $lte: now } }).sort({ startTime: -1 }).limit(30),
      Booking.countDocuments({ customerId: customer._id, status: "COMPLETED" }),
    ]);
    const reviews = await Review.find({ bookingId: { $in: past.map((booking) => booking._id) } }).select("bookingId rating");
    const ratingByBooking = new Map(reviews.map((review) => [review.bookingId.toString(), review.rating]));

    const toAppointment = async (booking: BookingDocument): Promise<CustomerPortalAppointment> => ({
      accessToken: await ensureAccessToken(booking),
      serviceId: booking.serviceId.toString(),
      serviceName: booking.serviceName ?? "Appointment",
      staffId: booking.staffId.toString(),
      staffName: booking.staffName ?? "",
      startTime: booking.startTime.toISOString(),
      endTime: booking.endTime.toISOString(),
      status: booking.status as BookingStatus,
      price: booking.price ?? undefined,
      canReview: booking.status === "COMPLETED" && !ratingByBooking.has(booking.id),
      rating: ratingByBooking.get(booking.id),
    });

    const body: CustomerPortalResponse = {
      customer: { name: customer.name, phone: customer.phone, email: customer.email ?? undefined },
      business: {
        name: business.name,
        slug: business.slug,
        logoUrl: business.logoUrl || undefined,
        coverImageUrl: business.coverImageUrl || undefined,
        brandColor: business.brandColor || undefined,
        phone: business.phone ?? undefined,
        address: business.address ?? undefined,
        timezone: business.timezone,
        currency: business.currency ?? "USD",
        bookingEnabled: business.isPublicBookingEnabled ?? true,
      },
      upcoming: await Promise.all(upcoming.map(toAppointment)),
      past: await Promise.all(past.map(toAppointment)),
      visits,
    };
    res.json(body);
  }),
);

// ---- Owner side: /api/customers/:id/portal-link -------------------------------

export const customerPortalLinkRouter = Router();
customerPortalLinkRouter.use(requireAuth, requireBusiness);

customerPortalLinkRouter.get(
  "/:id/portal-link",
  asyncHandler(async (req, res) => {
    const customer = await Customer.findOne({ _id: req.params.id, businessId: req.businessId });
    if (!customer) throw new NotFoundError("Customer not found");
    const body: CustomerPortalLinkResponse = { token: await ensureCustomerToken(customer) };
    res.json(body);
  }),
);
