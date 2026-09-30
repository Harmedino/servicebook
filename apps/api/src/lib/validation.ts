import { z } from "zod";

export const objectIdField = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");

/** Escapes a user-supplied string for safe use inside a MongoDB/RegExp pattern. */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * An image reference: either an uploaded image path ("/api/uploads/<id>") or a
 * full https URL. An empty string clears the image.
 */
export const imageRefField = z
  .string()
  .trim()
  .max(500)
  .refine((value) => value === "" || /^\/api\/uploads\/[0-9a-fA-F]{24}$/.test(value) || /^https?:\/\/\S+$/.test(value), "Enter a valid image");
