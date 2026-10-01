import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

/** A photo of finished work for the business's showcase: a fade, braids, a set of nails. */
const workPostSchema = new Schema(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true },
    staffId: { type: Schema.Types.ObjectId, ref: "Staff", required: true },
    serviceId: { type: Schema.Types.ObjectId, ref: "Service" },
    imageUrl: { type: String, required: true, trim: true },
    // The style's name, e.g. "Low taper fade".
    title: { type: String, required: true, trim: true, maxlength: 80 },
    caption: { type: String, trim: true, maxlength: 300 },
    featured: { type: Boolean, default: false },
  },
  { timestamps: true },
);

workPostSchema.index({ businessId: 1, createdAt: -1 });
workPostSchema.index({ staffId: 1, createdAt: -1 });

export type WorkPostAttributes = InferSchemaType<typeof workPostSchema>;
export type WorkPostDocument = HydratedDocument<WorkPostAttributes>;
export const WorkPost = model<WorkPostAttributes>("WorkPost", workPostSchema);
