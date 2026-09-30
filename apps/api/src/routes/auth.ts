import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import type { ApiErrorBody, AuthResponse, MeResponse, SafeUser } from "@servicebook/types";
import { User, type UserDocument } from "../models/User";
import { hashPassword, verifyPassword } from "../lib/password";
import { signAccessToken } from "../lib/jwt";
import { ConflictError, UnauthorizedError } from "../lib/errors";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../middleware/auth";

// Only failed attempts count: that stops password guessing without locking
// out everyone who shares a mobile carrier's IP address after a few normal
// logins (and keeps the website's "Try the demo" button working).
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: { message: "Too many attempts. Please try again later.", code: "RATE_LIMITED" },
  } satisfies ApiErrorBody,
});

const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name is too long"),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[a-zA-Z]/, "Password must contain at least one letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

function toSafeUser(user: UserDocument): SafeUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

export const authRouter = Router();

authRouter.post(
  "/register",
  authRateLimit,
  asyncHandler(async (req, res) => {
    const { name, email, password } = registerSchema.parse(req.body);

    const existing = await User.findOne({ email });
    if (existing) {
      throw new ConflictError("An account with this email already exists");
    }

    const passwordHash = await hashPassword(password);
    const user = await User.create({ name, email, passwordHash });

    const token = signAccessToken({ userId: user.id });

    const body: AuthResponse = { user: toSafeUser(user), token };
    res.status(201).json(body);
  }),
);

authRouter.post(
  "/login",
  authRateLimit,
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);

    // passwordHash is excluded by default (select: false on the schema) — opt back in here.
    const user = await User.findOne({ email }).select("+passwordHash");
    if (!user) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const token = signAccessToken({ userId: user.id });

    const body: AuthResponse = { user: toSafeUser(user), token };
    res.json(body);
  }),
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new UnauthorizedError();
    }

    // req.user was populated by requireAuth from the verified JWT — already a safe shape.
    const body: MeResponse = { user: req.user };
    res.json(body);
  }),
);
