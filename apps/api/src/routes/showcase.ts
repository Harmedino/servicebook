import { Router } from "express";
import { z } from "zod";
import type {
  PublicShowcaseResponse,
  PublicStaffDetailResponse,
  ReviewListResponse,
  ReviewProfile,
  ShowcaseStaff,
  WorkPostListResponse,
} from "@servicebook/types";
import { Business } from "../models/Business";
import { Staff, type StaffDocument } from "../models/Staff";
import { Service } from "../models/Service";
import { WorkPost } from "../models/WorkPost";
import { StaffAvailability } from "../models/StaffAvailability";
import { Review } from "../models/Review";
import { BadRequestError, NotFoundError } from "../lib/errors";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth, requireBusiness } from "../middleware/auth";
import { imageRefField, objectIdField } from "../lib/validation";
import { businessRating, serviceRatingsForStaff, staffRatings, toReviewProfile, toWorkPostProfiles } from "../lib/ratings";

async function businessBySlug(slug: string) {
  const business = await Business.findOne({ slug });
  if (!business) throw new NotFoundError("Business not found");
  return business;
}

async function toShowcaseStaff(
  members: StaffDocument[],
  ratings: Awaited<ReturnType<typeof staffRatings>>,
  businessAddress?: string | null,
): Promise<ShowcaseStaff[]> {
  const services = await Service.find({ _id: { $in: members.flatMap((m) => m.serviceIds) }, isActive: true }).select("name");
  const nameById = new Map(services.map((service) => [service.id, service.name]));
  const activeIds = (member: StaffDocument) => member.serviceIds.map(String).filter((id) => nameById.has(id));
  return members.map((member) => {
    const rating = ratings.get(member.id);
    return {
      id: member.id,
      name: member.name,
      avatarUrl: member.avatarUrl || undefined,
      title: member.title || undefined,
      bio: member.bio || undefined,
      location: member.location || businessAddress || undefined,
      rating: rating?.rating,
      reviewCount: rating?.count ?? 0,
      services: activeIds(member).map((id) => nameById.get(id) as string),
      serviceIds: activeIds(member),
    };
  });
}

// ---- Public: /api/public/businesses/:slug/showcase and /staff/:staffId ----------

export const publicShowcaseRouter = Router({ mergeParams: true });

publicShowcaseRouter.get(
  "/showcase",
  asyncHandler(async (req, res) => {
    const business = await businessBySlug(req.params.slug);
    const [posts, members, reviews, ratings, summary] = await Promise.all([
      WorkPost.find({ businessId: business.id }).sort({ featured: -1, createdAt: -1 }).limit(24),
      Staff.find({ businessId: business.id, isActive: true }).sort({ name: 1 }),
      Review.find({ businessId: business.id, hidden: false }).sort({ createdAt: -1 }).limit(12),
      staffRatings(business.id),
      businessRating(business.id),
    ]);
    const body: PublicShowcaseResponse = {
      posts: await toWorkPostProfiles(posts),
      staff: await toShowcaseStaff(members, ratings, business.address),
      reviews: reviews.map((review) => toReviewProfile(review)),
      summary,
    };
    res.json(body);
  }),
);

publicShowcaseRouter.get(
  "/staff/:staffId",
  asyncHandler(async (req, res) => {
    const business = await businessBySlug(req.params.slug);
    const staffId = objectIdField.parse(req.params.staffId);
    const member = await Staff.findOne({ _id: staffId, businessId: business.id, isActive: true });
    if (!member) throw new NotFoundError("This person isn't taking bookings here anymore");
    const [ratings, serviceRatings, posts, reviews, availability] = await Promise.all([
      staffRatings(business.id),
      serviceRatingsForStaff(member.id),
      WorkPost.find({ staffId: member._id }).sort({ featured: -1, createdAt: -1 }).limit(30),
      Review.find({ staffId: member._id, hidden: false }).sort({ createdAt: -1 }).limit(20),
      StaffAvailability.find({ staffId: member._id }),
    ]);
    const [staff] = await toShowcaseStaff([member], ratings, business.address);
    const byDay = new Map(availability.map((entry) => [entry.dayOfWeek, entry]));
    const hours = [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => {
      const entry = byDay.get(dayOfWeek);
      return entry && !entry.isOff
        ? { dayOfWeek, isOff: false, startTime: entry.startTime ?? undefined, endTime: entry.endTime ?? undefined }
        : { dayOfWeek, isOff: true };
    });
    const body: PublicStaffDetailResponse = {
      staff,
      hours,
      timezone: business.timezone,
      serviceRatings,
      posts: await toWorkPostProfiles(posts),
      reviews: reviews.map((review) => toReviewProfile(review)),
    };
    res.json(body);
  }),
);

// ---- Owner: /api/showcase (portfolio) and /api/reviews ------------------------

const postSchema = z.object({
  imageUrl: imageRefField.refine((value) => value.length > 0, "Add a photo"),
  title: z.string().trim().min(2, "Name the style").max(80),
  caption: z.string().trim().max(300).optional(),
  staffId: objectIdField,
  serviceId: objectIdField.optional().or(z.literal("").transform(() => undefined)),
  featured: z.boolean().optional(),
});

export const showcaseRouter = Router();
showcaseRouter.use(requireAuth, requireBusiness);

showcaseRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const filter: Record<string, unknown> = { businessId: req.businessId };
    if (typeof req.query.staffId === "string") filter.staffId = objectIdField.parse(req.query.staffId);
    const posts = await WorkPost.find(filter).sort({ featured: -1, createdAt: -1 }).limit(200);
    const body: WorkPostListResponse = { posts: await toWorkPostProfiles(posts) };
    res.json(body);
  }),
);

async function assertOwned(businessId: string, staffId: string, serviceId?: string) {
  const [staff, service] = await Promise.all([
    Staff.exists({ _id: staffId, businessId }),
    serviceId ? Service.exists({ _id: serviceId, businessId }) : Promise.resolve(true),
  ]);
  if (!staff || !service) throw new BadRequestError("Pick a staff member and service from your business");
}

showcaseRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const payload = postSchema.parse(req.body);
    await assertOwned(req.businessId as string, payload.staffId, payload.serviceId);
    const post = await WorkPost.create({ ...payload, businessId: req.businessId });
    const [profile] = await toWorkPostProfiles([post]);
    res.status(201).json({ post: profile });
  }),
);

showcaseRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const updates = postSchema.partial().strict().parse(req.body);
    const post = await WorkPost.findOne({ _id: req.params.id, businessId: req.businessId });
    if (!post) throw new NotFoundError("Post not found");
    await assertOwned(req.businessId as string, updates.staffId ?? post.staffId.toString(), updates.serviceId);
    post.set(updates);
    await post.save();
    const [profile] = await toWorkPostProfiles([post]);
    res.json({ post: profile });
  }),
);

showcaseRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const result = await WorkPost.deleteOne({ _id: req.params.id, businessId: req.businessId });
    if (result.deletedCount === 0) throw new NotFoundError("Post not found");
    res.status(204).end();
  }),
);

export const reviewsRouter = Router();
reviewsRouter.use(requireAuth, requireBusiness);

reviewsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const [reviews, summary] = await Promise.all([
      Review.find({ businessId: req.businessId }).sort({ createdAt: -1 }).limit(200),
      businessRating(req.businessId as string),
    ]);
    const body: ReviewListResponse = { reviews: reviews.map((review) => toReviewProfile(review, true)), summary };
    res.json(body);
  }),
);

const reviewUpdateSchema = z.object({ hidden: z.boolean().optional(), reply: z.string().trim().max(600).optional() }).strict();

reviewsRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const updates = reviewUpdateSchema.parse(req.body);
    const review = await Review.findOneAndUpdate({ _id: req.params.id, businessId: req.businessId }, { $set: updates }, { new: true });
    if (!review) throw new NotFoundError("Review not found");
    const body: { review: ReviewProfile } = { review: toReviewProfile(review, true) };
    res.json(body);
  }),
);
