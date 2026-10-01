import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

/**
 * A stretch of time someone (or the whole business) can't take bookings:
 * a holiday, a training day, an afternoon off. Stored as UTC instants so
 * overlap checks are simple; the local dates are kept for display.
 */
const timeOffSchema = new Schema(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    // No staff member = the whole business is closed.
    staffId: { type: Schema.Types.ObjectId, ref: "Staff", default: null },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    allDay: { type: Boolean, default: true },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    startTime: { type: String },
    endTime: { type: String },
    // Private to the business; customers only ever see that the time is unavailable.
    note: { type: String, trim: true, maxlength: 200 },
  },
  { timestamps: true },
);

timeOffSchema.index({ businessId: 1, endAt: 1 });
timeOffSchema.index({ staffId: 1, startAt: 1, endAt: 1 });

export type TimeOffAttributes = InferSchemaType<typeof timeOffSchema>;
export type TimeOffDocument = HydratedDocument<TimeOffAttributes>;
export const TimeOff = model<TimeOffAttributes>("TimeOff", timeOffSchema);
