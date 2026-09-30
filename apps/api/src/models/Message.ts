import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

/**
 * One message in the chat attached to a booking, between the customer (via
 * their private booking link) and the business (from the dashboard).
 */
const messageSchema = new Schema(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true },
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", required: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
    from: { type: String, enum: ["customer", "business"], required: true },
    body: { type: String, required: true, trim: true, maxlength: 1000 },
    // Sent by ServiceBook on the business's behalf (welcome message, demo replies).
    automated: { type: Boolean, default: false },
    // When the other side saw it; null while unread.
    readAt: { type: Date, default: null },
  },
  { timestamps: true },
);

messageSchema.index({ bookingId: 1, createdAt: 1 });
messageSchema.index({ businessId: 1, createdAt: -1 });

export type MessageAttributes = InferSchemaType<typeof messageSchema>;
export type MessageDocument = HydratedDocument<MessageAttributes>;

export const Message = model<MessageAttributes>("Message", messageSchema);
