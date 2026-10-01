import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

/** One browser or phone that asked for a business's notifications. */
const pushSubscriptionSchema = new Schema(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    // The push service URL is unique per browser install.
    endpoint: { type: String, required: true, unique: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    userAgent: { type: String, maxlength: 300 },
    lastSuccessAt: { type: Date },
  },
  { timestamps: true },
);

export type PushSubscriptionAttributes = InferSchemaType<typeof pushSubscriptionSchema>;
export type PushSubscriptionDocument = HydratedDocument<PushSubscriptionAttributes>;
export const PushSubscription = model<PushSubscriptionAttributes>("PushSubscription", pushSubscriptionSchema);
