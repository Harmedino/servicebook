import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import type {
  StaffInviteInfoResponse, ApiErrorBody, AuthResponse, MeResponse, SafeUser } from "@servicebook/types";
import { Staff } from "../models/Staff";
import { Business } from "../models/Business";
import { User, type UserDocument } from "../models/User";
import { hashPassword, verifyPassword } from "../lib/password";
import { signAccessToken } from "../lib/jwt";
import { ConflictError, NotFoundError, UnauthorizedError } from "../lib/errors";
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

function toSafeUser(user: UserDocument, staffId?: string): SafeUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    ...(staffId ? { staffId } : {}),
  };
}

/** A staff login's staff id, so the app can show "my" schedule. */
async function staffIdFor(user: { id?: string; role: string }): Promise<string | undefined> {
  if (user.role !== "STAFF" || !user.id) return undefined;
  const staff = await Staff.findOne({ userId: user.id }).select("_id");
  return staff?.id;
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

    const body: AuthResponse = { user: toSafeUser(user, await staffIdFor(user)), token };
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
    const body: MeResponse = { user: { ...req.user, ...(await staffIdFor(req.user).then((staffId) => (staffId ? { staffId } : {}))) } };
    res.json(body);
  }),
);

// ---- Staff invites: /api/auth/invites/:token ----------------------------------------

async function staffByInvite(token: string) {
  const staff = /^[A-Za-z0-9_-]{16,64}$/.test(token)
    ? await Staff.findOne({ inviteToken: token, inviteExpiresAt: { $gt: new Date() }, isActive: true })
    : null;
  if (!staff) throw new NotFoundError("This invite has expired or was already used. Ask for a new one.");
  return staff;
}

authRouter.get(
  "/invites/:token",
  asyncHandler(async (req, res) => {
    const staff = await staffByInvite(req.params.token);
    const business = await Business.findById(staff.businessId).select("name");
    const body: StaffInviteInfoResponse = { businessName: business?.name ?? "", staffName: staff.name, email: staff.email ?? undefined };
    res.json(body);
  }),
);

const acceptInviteSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(8, "Use at least 8 characters").max(200),
});

authRouter.post(
  "/invites/:token/accept",
  authRateLimit,
  asyncHandler(async (req, res) => {
    const staff = await staffByInvite(req.params.token);
    if (staff.userId) throw new ConflictError("This person already has a login");
    const { email, password } = acceptInviteSchema.parse(req.body);
    if (await User.exists({ email })) {
      throw new ConflictError("That email already has a ServiceBook account. Use a different email for your staff login.");
    }

    const user = await User.create({ name: staff.name, email, passwordHash: await hashPassword(password), role: "STAFF" });
    // Claim the invite only if it's still unused, so the same link can't make two logins.
    const claimed = await Staff.findOneAndUpdate(
      { _id: staff._id, inviteToken: req.params.token, userId: { $exists: false } },
      { $set: { userId: user._id }, $unset: { inviteToken: 1, inviteExpiresAt: 1 } },
      { new: true },
    );
    if (!claimed) {
      await user.deleteOne();
      throw new ConflictError("This invite was just used. Ask for a new one.");
    }

    const body: AuthResponse = { user: toSafeUser(user, staff.id), token: signAccessToken({ userId: user.id }) };
    res.status(201).json(body);
  }),
);
