import type { UploadResponse } from "@servicebook/types";
import { API_URL, ApiError, getStoredToken } from "./apiClient";

/** Uploaded images are stored as "/api/uploads/<id>"; external images are full URLs. */
export function imageSrc(ref: string | undefined | null): string | undefined {
  if (!ref) return undefined;
  return ref.startsWith("/") ? `${API_URL}${ref}` : ref;
}

/**
 * Downscales a photo in the browser before upload: phone photos are often
 * 4-8 MB, and a 1600px JPEG looks the same on screen at a fraction of the size.
 */
export async function compressImage(file: File, maxSize = 1600, quality = 0.85): Promise<Blob> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) return file;
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  // Keep PNGs (logos with transparency) as PNG; everything else becomes JPEG.
  const type = file.type === "image/png" ? "image/png" : "image/jpeg";
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  return blob && blob.size < file.size ? blob : file;
}

export async function uploadImage(file: File, maxSize?: number): Promise<string> {
  const body = new FormData();
  const blob = await compressImage(file, maxSize);
  body.append("image", blob, file.name);

  const headers: Record<string, string> = {};
  const token = getStoredToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_URL}/api/uploads`, { method: "POST", headers, body });
  const data = await response.json().catch(() => ({ error: { message: "Upload failed", code: "UPLOAD_FAILED" } }));
  if (!response.ok) throw new ApiError(response.status, data);
  return (data as UploadResponse).url;
}
