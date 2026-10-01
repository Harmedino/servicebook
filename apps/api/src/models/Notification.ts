import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

/** Something the business owner should know about: a new booking, a message, a sign-up. */
const notificationSchema = new Schema(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true },
    type: {
      type: String,
      enum: ["booking", "cancellation", "message", "enquiry", "signup", "review"],
      required: true,
    },
    title: { type: String, required: true, trim: true },
    body: { type: String, trim: true },
    // Where tapping it goes in the dashboard, e.g. "/inbox?tab=messages".
    link: { type: String, trim: true },
    readAt: { type: Date, default: null },
  },
  { timestamps: true },
);

notificationSchema.index({ businessId: 1, createdAt: -1 });
// Old notifications clean themselves up after 60 days.
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 24 * 60 * 60 });

export type NotificationAttributes = InferSchemaType<typeof notificationSchema>;
export type NotificationDocument = HydratedDocument<NotificationAttributes>;

export const Notification = model<NotificationAttributes>("Notification", notificationSchema);
