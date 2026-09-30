import { Schema, model, Types, type HydratedDocument, type InferSchemaType } from "mongoose";

const businessSchema = new Schema(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase, alphanumeric, hyphen-separated"],
    },
    description: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email address"],
    },
    address: { type: String, trim: true },
    website: { type: String, trim: true },
    // Handles for the "Chat with us" buttons on the booking page (no @, no URL).
    socials: {
      whatsapp: { type: String, trim: true },
      instagram: { type: String, trim: true },
      facebook: { type: String, trim: true },
      tiktok: { type: String, trim: true },
      x: { type: String, trim: true },
      telegram: { type: String, trim: true },
      snapchat: { type: String, trim: true },
    },
    timezone: {
      type: String,
      required: true,
      default: "UTC",
    },
    logoUrl: { type: String, trim: true },
    /** Wide banner photo shown at the top of the public booking page. */
    coverImageUrl: { type: String, trim: true },
    /** ISO 4217 code used to display prices, e.g. "NGN". */
    currency: { type: String, uppercase: true, trim: true, default: "USD" },
    // Whether the owner has answered "do you also take appointments yourself?",
    // so the dashboard only asks once.
    ownerStaffAnswered: { type: Boolean, default: false },
    isPublicBookingEnabled: {
      type: Boolean,
      required: true,
      default: true,
    },
    // Notification settings. emailNotificationsEnabled is the master switch —
    // when off, the others are irrelevant regardless of their own value.
    emailNotificationsEnabled: { type: Boolean, required: true, default: true },
    notifyCustomerOnBooking: { type: Boolean, required: true, default: true },
    notifyCustomerReminder: { type: Boolean, required: true, default: true },
    notifyOwnerOnBooking: { type: Boolean, required: true, default: true },
  },
  { timestamps: true },
);

export type BusinessAttributes = InferSchemaType<typeof businessSchema>;
export type BusinessDocument = HydratedDocument<BusinessAttributes>;
export type BusinessId = Types.ObjectId;

export const Business = model<BusinessAttributes>("Business", businessSchema);
