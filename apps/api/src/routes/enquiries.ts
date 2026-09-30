import { Router } from "express";
import { z } from "zod";
import type { EnquiryListResponse, EnquiryProfile, EnquiryResponse, EnquiryStatus, SocialChannel } from "@servicebook/types";
import { Enquiry, type EnquiryDocument } from "../models/Enquiry";
import { NotFoundError } from "../lib/errors";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth, requireBusiness } from "../middleware/auth";

const STATUSES = ["new", "contacted", "booked", "closed"] as const satisfies readonly EnquiryStatus[];

const listQuerySchema = z.object({
  status: z.enum([...STATUSES, "open", "all"]).default("open"),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

const updateSchema = z.object({ status: z.enum(STATUSES) }).strict();

function toEnquiryProfile(enquiry: EnquiryDocument): EnquiryProfile {
  return {
    id: enquiry.id,
    customerId: enquiry.customerId.toString(),
    channel: enquiry.channel as SocialChannel,
    reference: enquiry.reference,
    name: enquiry.name,
    phone: enquiry.phone,
    email: enquiry.email ?? undefined,
    serviceName: enquiry.serviceName ?? undefined,
    message: enquiry.message ?? undefined,
    status: (enquiry.status as EnquiryStatus | undefined) ?? "new",
    createdAt: enquiry.createdAt.toISOString(),
  };
}

export const enquiriesRouter = Router();

enquiriesRouter.use(requireAuth, requireBusiness);

enquiriesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const query = listQuerySchema.parse(req.query);
    const filter: Record<string, unknown> = { businessId: req.businessId };
    if (query.status === "open") filter.status = { $in: ["new", "contacted"] };
    else if (query.status !== "all") filter.status = query.status;

    const [enquiries, grouped] = await Promise.all([
      Enquiry.find(filter).sort({ createdAt: -1 }).limit(query.limit),
      Enquiry.aggregate<{ _id: EnquiryStatus; count: number }>([
        { $match: { businessId: req.business?._id } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
    ]);

    const counts = Object.fromEntries(STATUSES.map((status) => [status, 0])) as Record<EnquiryStatus, number>;
    for (const entry of grouped) counts[entry._id] = entry.count;

    const body: EnquiryListResponse = { enquiries: enquiries.map(toEnquiryProfile), counts };
    res.json(body);
  }),
);

enquiriesRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const { status } = updateSchema.parse(req.body);
    const enquiry = await Enquiry.findOneAndUpdate({ _id: req.params.id, businessId: req.businessId }, { $set: { status } }, { new: true });
    if (!enquiry) {
      throw new NotFoundError("Enquiry not found");
    }
    const body: EnquiryResponse = { enquiry: toEnquiryProfile(enquiry) };
    res.json(body);
  }),
);
