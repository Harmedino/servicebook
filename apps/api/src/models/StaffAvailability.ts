import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const staffAvailabilitySchema = new Schema(
  {
    staffId: {
      type: Schema.Types.ObjectId,
      ref: "Staff",
      required: true,
      index: true,
    },
    /** 0 = Sunday ... 6 = Saturday */
    dayOfWeek: {
      type: Number,
      required: true,
      min: 0,
      max: 6,
    },
    /** "HH:mm", 24h, local to the owning Business.timezone */
    startTime: {
      type: String,
      required: true,
      match: [TIME_PATTERN, "startTime must be HH:mm (24h)"],
    },
    endTime: {
      type: String,
      required: true,
      match: [TIME_PATTERN, "endTime must be HH:mm (24h)"],
    },
    isOff: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

// One row per staff member per weekday.
staffAvailabilitySchema.index({ staffId: 1, dayOfWeek: 1 }, { unique: true });

export type StaffAvailabilityAttributes = InferSchemaType<typeof staffAvailabilitySchema>;
export type StaffAvailabilityDocument = HydratedDocument<StaffAvailabilityAttributes>;

export const StaffAvailability = model<StaffAvailabilityAttributes>(
  "StaffAvailability",
  staffAvailabilitySchema,
);
