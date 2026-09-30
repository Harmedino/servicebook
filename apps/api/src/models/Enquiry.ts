import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

/**
 * A customer starting a chat from the booking page. The customer leaves
 * their details here first and is then sent to the business's WhatsApp,
 * Instagram, etc., so every social conversation is also a trackable lead.
 */
const enquirySchema = new Schema(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
    channel: {
      type: String,
      enum: ["whatsapp", "instagram", "facebook", "tiktok", "x", "telegram", "snapchat"],
      required: true,
    },
    // Short code quoted in the chat message, so the owner can match a DM to its enquiry.
    reference: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    serviceId: { type: Schema.Types.ObjectId, ref: "Service" },
    serviceName: { type: String, trim: true },
    message: { type: String, trim: true },
    status: { type: String, enum: ["new", "contacted", "booked", "closed"], default: "new" },
  },
  { timestamps: true },
);

enquirySchema.index({ businessId: 1, createdAt: -1 });
enquirySchema.index({ businessId: 1, reference: 1 }, { unique: true });

export type EnquiryAttributes = InferSchemaType<typeof enquirySchema>;
export type EnquiryDocument = HydratedDocument<EnquiryAttributes>;

export const Enquiry = model<EnquiryAttributes>("Enquiry", enquirySchema);
