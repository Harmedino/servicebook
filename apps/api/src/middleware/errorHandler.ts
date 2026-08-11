import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import type { ApiErrorBody } from "@servicebook/types";
import { AppError } from "../lib/errors";

export function notFoundHandler(req: Request, res: Response) {
  const body: ApiErrorBody = {
    error: { message: `Route not found: ${req.method} ${req.path}`, code: "NOT_FOUND" },
  };
  res.status(404).json(body);
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

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      const body: ApiErrorBody = {
        error: { message: "A record with these details already exists", code: "DUPLICATE" },
      };
      return res.status(409).json(body);
    }
    if (err.code === "P2025" || err.code === "P2003" || err.code === "P2014") {
      const body: ApiErrorBody = {
        error: { message: "Related record not found or still referenced", code: "RELATION_ERROR" },
      };
      return res.status(409).json(body);
    }
  }

  console.error(err);
  const body: ApiErrorBody = {
    error: { message: "Something went wrong", code: "INTERNAL_ERROR" },
  };
  res.status(500).json(body);
}
