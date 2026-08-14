import { Router } from "express";
import { formatInTimeZone } from "date-fns-tz";
import type { DashboardSetupStatus, DashboardStaffToday, DashboardSummary, DashboardSummaryResponse } from "@servicebook/types";
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

    const summary: DashboardSummary = {
      businessName: business.name,
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
    };

    const body: DashboardSummaryResponse = { summary };
    res.json(body);
  }),
);
