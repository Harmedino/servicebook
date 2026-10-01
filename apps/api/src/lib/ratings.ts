import { Types } from "mongoose";
import type { RatingSummary, ReviewProfile, WorkPostProfile } from "@servicebook/types";
import { Review, type ReviewDocument } from "../models/Review";
import type { WorkPostDocument } from "../models/WorkPost";
import { Staff } from "../models/Staff";
import { Service } from "../models/Service";

const round = (value: number) => Math.round(value * 10) / 10;

/** Average rating and count per staff member, from visible reviews only. */
export async function staffRatings(businessId: string): Promise<Map<string, RatingSummary>> {
  const rows = await Review.aggregate<{ _id: Types.ObjectId; rating: number; count: number }>([
    { $match: { businessId: new Types.ObjectId(businessId), hidden: false } },
    { $group: { _id: "$staffId", rating: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((row) => [row._id.toString(), { rating: round(row.rating), count: row.count }]));
}

/** How one staff member is rated for each service they've done. */
export async function serviceRatingsForStaff(staffId: string) {
  const rows = await Review.aggregate<{ _id: Types.ObjectId; serviceName: string; rating: number; count: number }>([
    { $match: { staffId: new Types.ObjectId(staffId), hidden: false } },
    { $group: { _id: "$serviceId", serviceName: { $first: "$serviceName" }, rating: { $avg: "$rating" }, count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
  return rows.map((row) => ({ serviceId: row._id.toString(), serviceName: row.serviceName, rating: round(row.rating), count: row.count }));
}

export async function businessRating(businessId: string): Promise<RatingSummary> {
  const [row] = await Review.aggregate<{ rating: number; count: number }>([
    { $match: { businessId: new Types.ObjectId(businessId), hidden: false } },
    { $group: { _id: null, rating: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  return row ? { rating: round(row.rating), count: row.count } : { rating: 0, count: 0 };
}

export function toReviewProfile(review: ReviewDocument, includeHidden = false): ReviewProfile {
  return {
    id: review.id,
    rating: review.rating,
    comment: review.comment ?? undefined,
    reply: review.reply ?? undefined,
    customerName: review.customerName,
    staffId: review.staffId.toString(),
    staffName: review.staffName ?? undefined,
    serviceName: review.serviceName ?? undefined,
    createdAt: review.createdAt.toISOString(),
    ...(includeHidden ? { hidden: Boolean(review.hidden) } : {}),
  };
}

/** Posts with their staff member and service filled in. */
export async function toWorkPostProfiles(posts: WorkPostDocument[]): Promise<WorkPostProfile[]> {
  const [staff, services] = await Promise.all([
    Staff.find({ _id: { $in: posts.map((post) => post.staffId) } }).select("name avatarUrl"),
    Service.find({ _id: { $in: posts.flatMap((post) => (post.serviceId ? [post.serviceId] : [])) } }).select("name"),
  ]);
  const staffById = new Map(staff.map((member) => [member.id, member]));
  const serviceById = new Map(services.map((service) => [service.id, service]));
  return posts.map((post) => {
    const member = staffById.get(post.staffId.toString());
    const service = post.serviceId ? serviceById.get(post.serviceId.toString()) : undefined;
    return {
      id: post.id,
      imageUrl: post.imageUrl,
      title: post.title,
      caption: post.caption ?? undefined,
      featured: Boolean(post.featured),
      staff: { id: post.staffId.toString(), name: member?.name ?? "Staff", avatarUrl: member?.avatarUrl || undefined },
      service: service ? { id: service.id, name: service.name } : undefined,
      createdAt: post.createdAt.toISOString(),
    };
  });
}

/** "Chioma Okafor" → "Chioma O." for public display. */
export function publicName(fullName: string): string {
  const [first, ...rest] = fullName.trim().split(/\s+/);
  const last = rest.at(-1);
  return last ? `${first} ${last.charAt(0).toUpperCase()}.` : first;
}
