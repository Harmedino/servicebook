import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

export type BookingStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";
const BOOKING_STATUSES: BookingStatus[] = ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"];

const bookingSchema = new Schema(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },
    staffId: {
      type: Schema.Types.ObjectId,
      ref: "Staff",
      required: true,
    },
    serviceId: {
      type: Schema.Types.ObjectId,
      ref: "Service",
      required: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: BOOKING_STATUSES,
      default: "PENDING",
    },
    notes: { type: String, trim: true },
  },
  { timestamps: true },
);

// Conflict-checking and calendar queries are always scoped to one staff
// member or one business over a time range.
bookingSchema.index({ staffId: 1, startTime: 1 });
bookingSchema.index({ businessId: 1, startTime: 1 });
bookingSchema.index({ customerId: 1 });

export type BookingAttributes = InferSchemaType<typeof bookingSchema>;
export type BookingDocument = HydratedDocument<BookingAttributes>;

export const Booking = model<BookingAttributes>("Booking", bookingSchema);
