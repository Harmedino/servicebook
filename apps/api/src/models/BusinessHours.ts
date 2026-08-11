import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const businessHoursSchema = new Schema(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: "Business",
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
    /** "HH:mm", 24h, local to Business.timezone */
    openTime: {
      type: String,
      required: true,
      match: [TIME_PATTERN, "openTime must be HH:mm (24h)"],
    },
    closeTime: {
      type: String,
      required: true,
      match: [TIME_PATTERN, "closeTime must be HH:mm (24h)"],
    },
    isClosed: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

// One row per business per weekday.
businessHoursSchema.index({ businessId: 1, dayOfWeek: 1 }, { unique: true });

export type BusinessHoursAttributes = InferSchemaType<typeof businessHoursSchema>;
export type BusinessHoursDocument = HydratedDocument<BusinessHoursAttributes>;

export const BusinessHours = model<BusinessHoursAttributes>("BusinessHours", businessHoursSchema);
