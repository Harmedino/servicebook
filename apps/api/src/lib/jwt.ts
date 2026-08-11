import jwt from "jsonwebtoken";
import { env } from "../config/env";

// Deliberately just the user id. businessId is NOT embedded here: a user's
// business can be created after the token is issued, and re-deriving it from
// the database on every request (see requireBusiness middleware) avoids ever
// trusting a stale or client-supplied businessId.
export interface AccessTokenPayload {
  userId: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"] });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload;
}
