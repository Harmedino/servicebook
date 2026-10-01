import { Router } from "express";
import { z } from "zod";
import { formatInTimeZone } from "date-fns-tz";
import type { WaitlistEntryProfile, WaitlistListResponse } from "@servicebook/types";
import { WaitlistEntry } from "../models/WaitlistEntry";
import { Customer } from "../models/Customer";
import { Service } from "../models/Service";
import { Staff } from "../models/Staff";
import { NotFoundError } from "../lib/errors";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth, requireBusiness } from "../middleware/auth";
import { objectIdField } from "../lib/validation";

export const waitlistRouter = Router();
waitlistRouter.use(requireAuth, requireBusiness);

/** Everyone still waiting for today or later, soonest day first. */
waitlistRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const today = formatInTimeZone(new Date(), req.business!.timezone, "yyyy-MM-dd");
    const entries = await WaitlistEntry.find({ businessId: req.businessId, status: "waiting", date: { $gte: today } })
      .sort({ date: 1, createdAt: 1 })
      .limit(300);
    const [customers, services, staff] = await Promise.all([
      Customer.find({ _id: { $in: entries.map((entry) => entry.customerId) } }).select("name phone"),
      Service.find({ _id: { $in: entries.map((entry) => entry.serviceId) } }).select("name"),
      Staff.find({ _id: { $in: entries.flatMap((entry) => (entry.staffId ? [entry.staffId] : [])) } }).select("name"),
    ]);
    const customerById = new Map(customers.map((customer) => [customer.id, customer]));
    const serviceName = new Map(services.map((service) => [service.id, service.name]));
    const staffName = new Map(staff.map((member) => [member.id, member.name]));
    const body: WaitlistListResponse = {
      entries: entries.map((entry): WaitlistEntryProfile => {
        const customer = customerById.get(entry.customerId.toString());
        return {
          id: entry.id,
          date: entry.date,
          status: entry.status as WaitlistEntryProfile["status"],
          customer: { id: entry.customerId.toString(), name: customer?.name ?? "Customer", phone: customer?.phone ?? "" },
          serviceId: entry.serviceId.toString(),
          serviceName: serviceName.get(entry.serviceId.toString()) ?? "Service",
          staffId: entry.staffId?.toString(),
          staffName: entry.staffId ? staffName.get(entry.staffId.toString()) : undefined,
          note: entry.note ?? undefined,
          createdAt: entry.createdAt.toISOString(),
        };
      }),
    };
    res.json(body);
  }),
);

/** Mark someone as booked (offered a spot) or remove them. */
waitlistRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const { status } = z.object({ status: z.enum(["booked", "removed", "waiting"]) }).parse(req.body);
    const entry = await WaitlistEntry.findOneAndUpdate(
      { _id: objectIdField.parse(req.params.id), businessId: req.businessId },
      { $set: { status } },
      { new: true },
    );
    if (!entry) throw new NotFoundError("Waitlist entry not found");
    res.json({ status: entry.status });
  }),
);
