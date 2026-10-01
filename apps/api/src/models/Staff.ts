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
    // Shown on the booking page's staff profile, e.g. "Senior barber" and a line about them.
    title: { type: String, trim: true, maxlength: 60 },
    bio: { type: String, trim: true, maxlength: 400 },
    // Shown to customers when this person works somewhere other than the business address.
    location: { type: String, trim: true, maxlength: 160 },
    // Set when this staff profile is the business owner themselves, so the
    // public booking page can default to them when a customer has no preference.
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
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
