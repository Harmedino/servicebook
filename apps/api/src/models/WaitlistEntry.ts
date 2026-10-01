import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

/** A customer who wants a day that's fully booked, in case a spot opens. */
const waitlistEntrySchema = new Schema(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
    serviceId: { type: Schema.Types.ObjectId, ref: "Service", required: true },
    // No staff member = anyone is fine.
    staffId: { type: Schema.Types.ObjectId, ref: "Staff", default: null },
    // Business-local day they want, yyyy-MM-dd.
    date: { type: String, required: true },
    note: { type: String, trim: true, maxlength: 300 },
    status: { type: String, enum: ["waiting", "booked", "removed"], default: "waiting" },
  },
  { timestamps: true },
);

waitlistEntrySchema.index({ businessId: 1, status: 1, date: 1 });

export type WaitlistEntryAttributes = InferSchemaType<typeof waitlistEntrySchema>;
export type WaitlistEntryDocument = HydratedDocument<WaitlistEntryAttributes>;
export const WaitlistEntry = model<WaitlistEntryAttributes>("WaitlistEntry", waitlistEntrySchema);
