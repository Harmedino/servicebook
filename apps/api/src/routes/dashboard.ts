import { Router } from "express";
import mongoose from "mongoose";
import { formatInTimeZone } from "date-fns-tz";
import type { DashboardInsights, DashboardSetupStatus, DashboardStaffToday, DashboardSummary, DashboardSummaryResponse } from "@servicebook/types";
import type { Types } from "mongoose";
import { Booking } from "../models/Booking";
import { Customer } from "../models/Customer";
import { Service } from "../models/Service";
import { Staff } from "../models/Staff";
import { StaffAvailability } from "../models/StaffAvailability";
import { UnauthorizedError } from "../lib/errors";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth, requireBusiness } from "../middleware/auth";
import { localDayStartUtc, nextDateKey } from "../lib/bookingEngine";
import { toBookingProfiles } from "./bookings";
import { toCustomerProfile } from "./customers";

const UPCOMING_PREVIEW_LIMIT = 5;
const RECENT_CUSTOMERS_LIMIT = 5;

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth, requireBusiness);

dashboardRouter.get(
  "/summary",
  asyncHandler(async (req, res) => {
    if (!req.business || !req.businessId) {
      throw new UnauthorizedError();
    }
    const business = req.business;
    const businessId = req.businessId;

    const todayKey = formatInTimeZone(new Date(), business.timezone, "yyyy-MM-dd");
    const todayStart = localDayStartUtc(todayKey, business.timezone);
    const todayEnd = localDayStartUtc(nextDateKey(todayKey), business.timezone);

    const [
      todayBookingDocs,
      upcomingPreviewDocs,
      upcomingAppointmentCount,
      customerCount,
      activeServiceCount,
      inactiveServiceCount,
      activeStaff,
      pendingBookingCount,
      recentCustomerDocs,
    ] = await Promise.all([
      Booking.find({ businessId, startTime: { $gte: todayStart, $lt: todayEnd } }).sort({ startTime: 1 }),
      Booking.find({ businessId, startTime: { $gte: todayEnd }, status: { $ne: "CANCELLED" } })
        .sort({ startTime: 1 })
        .limit(UPCOMING_PREVIEW_LIMIT),
      Booking.countDocuments({ businessId, startTime: { $gte: todayEnd }, status: { $ne: "CANCELLED" } }),
      Customer.countDocuments({ businessId }),
      Service.countDocuments({ businessId, isActive: true }),
      Service.countDocuments({ businessId, isActive: false }),
      Staff.find({ businessId, isActive: true }).select("_id name").sort({ name: 1 }),
      Booking.countDocuments({ businessId, status: "PENDING" }),
      Customer.find({ businessId }).sort({ createdAt: -1 }).limit(RECENT_CUSTOMERS_LIMIT),
    ]);

    // One batched name-resolution pass for both booking lists, instead of
    // resolving customer/service/staff names twice.
    const combinedProfiles = await toBookingProfiles([...todayBookingDocs, ...upcomingPreviewDocs]);
    const todayAppointments = combinedProfiles.slice(0, todayBookingDocs.length);
    const upcomingAppointments = combinedProfiles.slice(todayBookingDocs.length);

    const activeStaffIds = activeStaff.map((staff) => staff.id);
    const staffIdsWithAvailability = new Set(
      (await StaffAvailability.distinct("staffId", { staffId: { $in: activeStaffIds } })).map((id) => id.toString()),
    );
    const staffMissingAvailabilityCount = activeStaffIds.filter((id) => !staffIdsWithAvailability.has(id)).length;

    const staffTodayCountById = new Map<string, number>();
    for (const booking of todayAppointments) {
      if (booking.status === "CANCELLED") {
        continue;
      }
      staffTodayCountById.set(booking.staffId, (staffTodayCountById.get(booking.staffId) ?? 0) + 1);
    }
    const staffToday: DashboardStaffToday[] = activeStaff.map((staff) => ({
      staffId: staff.id,
      staffName: staff.name,
      todayAppointmentCount: staffTodayCountById.get(staff.id) ?? 0,
    }));

    // "Business information complete" means filled in beyond the bare
    // minimum onboarding requires (name + timezone) — phone and a
    // description are the signal that the owner has actually finished it.
    const businessInfoComplete = Boolean(business.phone && business.description);
    const hasActiveService = activeServiceCount > 0;
    const hasActiveStaff = activeStaff.length > 0;
    const hasStaffAvailability = activeStaffIds.length > 0 && staffIdsWithAvailability.size > 0;

    const setupStatus: DashboardSetupStatus = {
      businessInfoComplete,
      hasActiveService,
      hasActiveStaff,
      hasStaffAvailability,
      publicBookingEnabled: business.isPublicBookingEnabled,
    };

    const insights = await buildInsights(businessId, business.timezone, todayKey);

    const summary: DashboardSummary = {
      businessName: business.name,
      currency: business.currency ?? "USD",
      businessSlug: business.slug,
      isPublicBookingEnabled: business.isPublicBookingEnabled,
      todayAppointmentCount: todayAppointments.length,
      upcomingAppointmentCount,
      customerCount,
      activeServiceCount,
      inactiveServiceCount,
      activeStaffCount: activeStaff.length,
      pendingBookingCount,
      staffMissingAvailabilityCount,
      todayAppointments,
      upcomingAppointments,
      recentCustomers: recentCustomerDocs.map((customer) => toCustomerProfile(customer)),
      staffToday,
      setupStatus,
      insights,
    };

    const body: DashboardSummaryResponse = { summary };
    res.json(body);
  }),
);

// ---- Insights (money + trends) -----------------------------------------

const EARNING = { $nin: ["CANCELLED", "NO_SHOW"] };

function shiftMonth(dateKey: string, months: number): string {
  const [y, m] = dateKey.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + months, 1));
  return d.toISOString().slice(0, 10);
}

function shiftDay(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

async function monthStats(businessId: string | Types.ObjectId, start: Date, end: Date, now: Date) {
  const [earning, customers, pastTotal, pastNoShow] = await Promise.all([
    Booking.aggregate<{ revenue: number; count: number }>([
      { $match: { businessId: toObjectId(businessId), startTime: { $gte: start, $lt: end }, status: EARNING } },
      { $group: { _id: null, revenue: { $sum: { $ifNull: ["$price", 0] } }, count: { $sum: 1 } } },
    ]),
    Customer.countDocuments({ businessId, createdAt: { $gte: start, $lt: end } }),
    Booking.countDocuments({ businessId, startTime: { $gte: start, $lt: end < now ? end : now }, status: { $ne: "CANCELLED" } }),
    Booking.countDocuments({ businessId, startTime: { $gte: start, $lt: end < now ? end : now }, status: "NO_SHOW" }),
  ]);
  return {
    revenue: earning[0]?.revenue ?? 0,
    bookings: earning[0]?.count ?? 0,
    customers,
    noShowRate: pastTotal ? Math.round((pastNoShow / pastTotal) * 1000) / 10 : 0,
  };
}

function toObjectId(id: string | Types.ObjectId): Types.ObjectId {
  return typeof id === "string" ? new mongoose.Types.ObjectId(id) : id;
}

async function buildInsights(businessId: string, timezone: string, todayKey: string): Promise<DashboardInsights> {
  const now = new Date();
  const thisMonthKey = `${todayKey.slice(0, 7)}-01`;
  const thisMonthStart = localDayStartUtc(thisMonthKey, timezone);
  const nextMonthStart = localDayStartUtc(shiftMonth(thisMonthKey, 1), timezone);
  const lastMonthStart = localDayStartUtc(shiftMonth(thisMonthKey, -1), timezone);

  const seriesStartKey = shiftDay(todayKey, -29);
  const seriesStart = localDayStartUtc(seriesStartKey, timezone);
  const seriesEnd = localDayStartUtc(nextDateKey(todayKey), timezone);

  const [current, previous, daily] = await Promise.all([
    monthStats(businessId, thisMonthStart, nextMonthStart, now),
    monthStats(businessId, lastMonthStart, thisMonthStart, now),
    Booking.aggregate<{ _id: string; revenue: number; bookings: number }>([
      { $match: { businessId: toObjectId(businessId), startTime: { $gte: seriesStart, $lt: seriesEnd }, status: EARNING } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$startTime", timezone } },
          revenue: { $sum: { $ifNull: ["$price", 0] } },
          bookings: { $sum: 1 },
        },
      },
    ]),
  ]);

  const byDay = new Map(daily.map((d) => [d._id, d]));
  const revenueSeries = Array.from({ length: 30 }, (_, i) => {
    const date = shiftDay(seriesStartKey, i);
    const point = byDay.get(date);
    return { date, revenue: point?.revenue ?? 0, bookings: point?.bookings ?? 0 };
  });

  return {
    revenueThisMonth: current.revenue,
    revenueLastMonth: previous.revenue,
    bookingsThisMonth: current.bookings,
    bookingsLastMonth: previous.bookings,
    newCustomersThisMonth: current.customers,
    newCustomersLastMonth: previous.customers,
    noShowRateThisMonth: current.noShowRate,
    noShowRateLastMonth: previous.noShowRate,
    revenueSeries,
  };
}
