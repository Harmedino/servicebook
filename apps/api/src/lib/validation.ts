import { z } from "zod";

export const objectIdField = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");

/** Escapes a user-supplied string for safe use inside a MongoDB/RegExp pattern. */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
