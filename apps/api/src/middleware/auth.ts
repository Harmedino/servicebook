import { User } from "../models/User";
import { Business } from "../models/Business";
import { Staff } from "../models/Staff";
import { staffMayCall } from "./staffAccess";
import { verifyAccessToken } from "../lib/jwt";
import { ForbiddenError, UnauthorizedError } from "../lib/errors";
import { asyncHandler } from "../utils/asyncHandler";

/** Verifies the bearer token and attaches req.user. Never trusts any id from the client. */
export const requireAuth = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new UnauthorizedError("Missing or invalid Authorization header");
  }

  let payload;
  try {
    payload = verifyAccessToken(header.slice("Bearer ".length));
  } catch {
    throw new UnauthorizedError("Invalid or expired token");
  }

  const user = await User.findById(payload.userId);
  if (!user) {
    throw new UnauthorizedError("User no longer exists");
  }

  req.user = { id: user.id, email: user.email, name: user.name, role: user.role };
  next();
});

/** Like requireAuth, but lets anonymous visitors through (req.user stays undefined). */
export const optionalAuth = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    try {
      const payload = verifyAccessToken(header.slice("Bearer ".length));
      const user = await User.findById(payload.userId);
      if (user) req.user = { id: user.id, email: user.email, name: user.name, role: user.role };
    } catch {
      // An expired token on a public page just means "anonymous".
    }
  }
  next();
});

/**
 * Resolves the caller's own business server-side (never from a client-supplied
 * id) and attaches it to the request. Must run after requireAuth. Every
 * business-scoped route handler should read req.businessId, never req.body.businessId.
 */
export const requireBusiness = asyncHandler(async (req, _res, next) => {
  if (!req.user) {
    throw new UnauthorizedError();
  }

  if (req.user.role === "STAFF") {
    // Staff belong to the business their staff record is in; nothing else.
    const staff = await Staff.findOne({ userId: req.user.id, isActive: true });
    const business = staff ? await Business.findById(staff.businessId) : null;
    if (!staff || !business) {
      throw new ForbiddenError("Your access to this business has been removed");
    }
    if (!staffMayCall(req.method, `${req.baseUrl}${req.path}`)) {
      throw new ForbiddenError("Only the business owner can do this");
    }
    req.business = business;
    req.businessId = business.id;
    req.staffScope = staff.id;
    return next();
  }

  const business = await Business.findOne({ ownerId: req.user.id });
  if (!business) {
    throw new ForbiddenError("Create a business profile before accessing this resource");
  }

  req.business = business;
  req.businessId = business.id;
  next();
});
