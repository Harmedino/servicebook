import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

/**
 * A customer's rating of a completed booking. One per booking, so ratings
 * always come from someone who actually had the appointment.
 */
const reviewSchema = new Schema(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true },
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", required: true, unique: true },
    staffId: { type: Schema.Types.ObjectId, ref: "Staff", required: true },
    serviceId: { type: Schema.Types.ObjectId, ref: "Service", required: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
    // Shown publicly as "Chioma O." — never the full name or number.
    customerName: { type: String, required: true, trim: true },
    serviceName: { type: String, trim: true },
    staffName: { type: String, trim: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 600 },
    reply: { type: String, trim: true, maxlength: 600 },
    hidden: { type: Boolean, default: false },
  },
  { timestamps: true },
);

reviewSchema.index({ businessId: 1, hidden: 1, createdAt: -1 });
reviewSchema.index({ staffId: 1, hidden: 1 });

export type ReviewAttributes = InferSchemaType<typeof reviewSchema>;
export type ReviewDocument = HydratedDocument<ReviewAttributes>;
export const Review = model<ReviewAttributes>("Review", reviewSchema);
