import { Schema, model } from "mongoose";

/** Small server-wide values that must survive restarts, e.g. generated keys. */
const appSettingSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true },
);

export const AppSetting = model("AppSetting", appSettingSchema);
