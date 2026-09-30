import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

/**
 * Uploaded images (logos, cover photos, service and staff photos). Stored in
 * MongoDB rather than on disk because hosts like Render wipe the disk on every
 * deploy. The browser resizes photos before upload, so documents stay small.
 */
const imageSchema = new Schema(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    mimeType: { type: String, required: true },
    data: { type: Buffer, required: true },
    size: { type: Number, required: true },
  },
  { timestamps: true },
);

export type ImageAttributes = InferSchemaType<typeof imageSchema>;
export type ImageDocument = HydratedDocument<ImageAttributes>;
export const Image = model<ImageAttributes>("Image", imageSchema);
