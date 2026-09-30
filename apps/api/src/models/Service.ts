import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

const serviceSchema = new Schema(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: { type: String, trim: true },
    imageUrl: { type: String, trim: true },
    durationMinutes: {
      type: Number,
      required: true,
      min: 1,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Bidirectional with Staff.serviceIds — Mongo has no join table, so the
    // many-to-many is denormalized on both sides.
    staffIds: {
      type: [{ type: Schema.Types.ObjectId, ref: "Staff" }],
      default: [],
      index: true,
    },
  },
  { timestamps: true },
);

export type ServiceAttributes = InferSchemaType<typeof serviceSchema>;
export type ServiceDocument = HydratedDocument<ServiceAttributes>;

export const Service = model<ServiceAttributes>("Service", serviceSchema);
