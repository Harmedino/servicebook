import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

const staffSchema = new Schema(
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
    email: {
      type: String,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email address"],
    },
    phone: { type: String, trim: true },
    avatarUrl: { type: String, trim: true },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Bidirectional with Service.staffIds — see note there.
    serviceIds: {
      type: [{ type: Schema.Types.ObjectId, ref: "Service" }],
      default: [],
      index: true,
    },
  },
  { timestamps: true },
);

export type StaffAttributes = InferSchemaType<typeof staffSchema>;
export type StaffDocument = HydratedDocument<StaffAttributes>;

export const Staff = model<StaffAttributes>("Staff", staffSchema);
