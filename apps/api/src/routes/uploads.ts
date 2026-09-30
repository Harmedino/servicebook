import { Router } from "express";
import multer from "multer";
import type { UploadResponse } from "@servicebook/types";
import { Image } from "../models/Image";
import { BadRequestError, NotFoundError } from "../lib/errors";
import { objectIdField } from "../lib/validation";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth, requireBusiness } from "../middleware/auth";

const MAX_BYTES = 3 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (ALLOWED_TYPES.has(file.mimetype)) {
      callback(null, true);
    } else {
      callback(new BadRequestError("Only JPG, PNG or WebP images are allowed"));
    }
  },
});

export const uploadsRouter = Router();

uploadsRouter.post(
  "/",
  requireAuth,
  requireBusiness,
  (req, res, next) => {
    upload.single("image")(req, res, (error: unknown) => {
      if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
        return next(new BadRequestError("Image must be 3 MB or smaller"));
      }
      next(error);
    });
  },
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new BadRequestError("No image uploaded");
    }
    const image = await Image.create({
      businessId: req.businessId,
      mimeType: req.file.mimetype,
      data: req.file.buffer,
      size: req.file.size,
    });
    const body: UploadResponse = { url: `/api/uploads/${image.id}` };
    res.status(201).json(body);
  }),
);

// Public: booking pages show logos, covers and photos to anyone.
uploadsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const parsed = objectIdField.safeParse(req.params.id);
    const image = parsed.success ? await Image.findById(parsed.data) : null;
    if (!image) {
      throw new NotFoundError("Image not found");
    }
    res.set({
      "Content-Type": image.mimeType,
      // Upload URLs never change content, so browsers and CDNs can cache forever.
      "Cache-Control": "public, max-age=31536000, immutable",
      // Helmet defaults to same-origin; the web app is on another domain.
      "Cross-Origin-Resource-Policy": "cross-origin",
    });
    res.send(image.data);
  }),
);
