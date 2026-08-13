import type { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import { ZodError } from "zod";
import type { ApiErrorBody } from "@servicebook/types";
import { AppError } from "../lib/errors";

export function notFoundHandler(req: Request, res: Response) {
  const body: ApiErrorBody = {
    error: { message: `Route not found: ${req.method} ${req.path}`, code: "NOT_FOUND" },
  };
  res.status(404).json(body);
}

interface MongoDuplicateKeyError {
  code: 11000;
  keyValue?: Record<string, unknown>;
}

const TENANT_SCOPE_KEYS = new Set(["businessId", "staffId", "ownerId"]);

function isDuplicateKeyError(err: unknown): err is MongoDuplicateKeyError {
  return typeof err === "object" && err !== null && "code" in err && (err as { code?: unknown }).code === 11000;
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
) {
  if (err instanceof AppError) {
    const body: ApiErrorBody = {
      error: { message: err.message, code: err.code, details: err.details },
    };
    return res.status(err.statusCode).json(body);
  }

  if (err instanceof ZodError) {
    const body: ApiErrorBody = {
      error: {
        message: "Validation failed",
        code: "VALIDATION_ERROR",
        details: err.flatten().fieldErrors as Record<string, string[]>,
      },
    };
    return res.status(400).json(body);
  }

  // Mongoose schema validation (required/min/max/match, etc.) failed.
  if (err instanceof mongoose.Error.ValidationError) {
    const details: Record<string, string[]> = {};
    for (const [path, validatorError] of Object.entries(err.errors)) {
      details[path] = [validatorError.message];
    }
    const body: ApiErrorBody = {
      error: { message: "Validation failed", code: "VALIDATION_ERROR", details },
    };
    return res.status(400).json(body);
  }

  // Malformed value for a typed field — most commonly an invalid ObjectId.
  if (err instanceof mongoose.Error.CastError) {
    const body: ApiErrorBody = {
      error: { message: `Invalid value for "${err.path}"`, code: "INVALID_ID" },
    };
    return res.status(400).json(body);
  }

  // MongoDB duplicate-key error (violates a unique index).
  if (isDuplicateKeyError(err)) {
    const keys = err.keyValue ? Object.keys(err.keyValue) : [];
    // Tenant-scope fields are always part of a compound unique index but
    // never the meaningful part of the message — prefer the other field.
    const field = keys.find((key) => !TENANT_SCOPE_KEYS.has(key)) ?? keys[0];
    const body: ApiErrorBody = {
      error: {
        message: field
          ? `A record with this ${field} already exists`
          : "A record with these details already exists",
        code: "DUPLICATE",
      },
    };
    return res.status(409).json(body);
  }

  console.error(err);
  const body: ApiErrorBody = {
    error: { message: "Something went wrong", code: "INTERNAL_ERROR" },
  };
  res.status(500).json(body);
}
