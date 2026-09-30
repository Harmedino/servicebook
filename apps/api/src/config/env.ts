import "dotenv/config";
import { createHash } from "node:crypto";
import { z } from "zod";

// Render sets RENDER=true on every service. Treat it like production for the
// required-variable checks, so a missing NODE_ENV can't silently fall back to
// the insecure local-development defaults below.
const isDeployed = process.env.NODE_ENV === "production" || process.env.RENDER === "true";

// Local development works without a .env file; deployed environments never use these.
const DEV_DEFAULTS: Record<string, string> = {
  MONGODB_URI: "mongodb://127.0.0.1:27017/servicebook",
  JWT_SECRET: "local-development-only-secret-do-not-use-in-production",
  CORS_ORIGIN: "http://localhost:5173",
};

// The deployed web app. Always allowed in production so a missing or wrong
// CORS_ORIGIN can't block sign-up from the real site.
const DEFAULT_WEB_ORIGIN = "https://servicebook-drab.vercel.app";
const DEFAULT_PREVIEW_ORIGINS = "https://servicebook-*.vercel.app";

const warnings: string[] = [];

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(4000),
    MONGODB_URI: z
      .string({ required_error: "is required (your MongoDB Atlas connection string)" })
      .trim()
      .min(1, "is required (your MongoDB Atlas connection string)")
      .regex(/^mongodb(\+srv)?:\/\//, "must start with mongodb:// or mongodb+srv://"),
    JWT_SECRET: z
      .string({ required_error: "is required. Generate one with: openssl rand -base64 48" })
      .min(32, "must be at least 32 characters. Generate one with: openssl rand -base64 48"),
    JWT_EXPIRES_IN: z.string().trim().min(1).default("7d"),
    // Comma-separated list of frontend origins allowed to call this API.
    CORS_ORIGIN: z
      .string({ required_error: "is required, e.g. https://servicebook-drab.vercel.app" })
      .trim()
      .min(1, "is required, e.g. https://servicebook-drab.vercel.app"),

    // Seeds the "Glow Studio Lekki" demo that the website's demo buttons open.
    // Set SEED_DEMO=false to skip it.
    SEED_DEMO: z
      .enum(["true", "false"])
      .default("true")
      .transform((value) => value === "true"),

    // Email is optional: with no provider configured, sendEmail() logs to the
    // console instead of delivering, so the app runs fully without it.
    EMAIL_PROVIDER: z.enum(["console", "resend"]).default("console"),
    EMAIL_FROM: z.string().trim().optional(),
    EMAIL_API_KEY: z.string().trim().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.EMAIL_PROVIDER === "resend") {
      if (!value.EMAIL_API_KEY) {
        ctx.addIssue({ code: "custom", path: ["EMAIL_API_KEY"], message: "is required when EMAIL_PROVIDER=resend" });
      }
      if (!value.EMAIL_FROM) {
        ctx.addIssue({ code: "custom", path: ["EMAIL_FROM"], message: "is required when EMAIL_PROVIDER=resend" });
      }
    }
  });

// Empty strings (e.g. `JWT_SECRET=` on a dashboard) count as unset.
const rawEnv: Record<string, string | undefined> = {};
for (const [key, value] of Object.entries(process.env)) {
  rawEnv[key] = value === "" ? undefined : value;
}
if (!isDeployed) {
  for (const [key, value] of Object.entries(DEV_DEFAULTS)) {
    rawEnv[key] ??= value;
  }
} else {
  // Don't refuse to start over settings with a safe fallback; warn loudly instead.
  if ((!rawEnv.JWT_SECRET || rawEnv.JWT_SECRET.length < 32) && rawEnv.MONGODB_URI) {
    warnings.push(
      `JWT_SECRET is ${rawEnv.JWT_SECRET ? "too short" : "not set"}; using a secret derived from MONGODB_URI. ` +
        "Set JWT_SECRET to 32+ random characters (openssl rand -base64 48) on Render.",
    );
    // Stable across restarts (so logins survive) and as secret as the database password.
    rawEnv.JWT_SECRET = createHash("sha256").update(`jwt:${rawEnv.MONGODB_URI}`).digest("hex");
  }
  if (!rawEnv.CORS_ORIGIN) {
    warnings.push(`CORS_ORIGIN is not set; allowing ${DEFAULT_WEB_ORIGIN}.`);
    rawEnv.CORS_ORIGIN = DEFAULT_WEB_ORIGIN;
  }
}

const parsed = envSchema.safeParse(rawEnv);

if (!parsed.success) {
  const lines = parsed.error.issues.map((issue) => `  - ${issue.path.join(".") || "env"} ${issue.message}`);
  console.error(`\nInvalid environment configuration${isDeployed ? " (production)" : ""}:\n${lines.join("\n")}\n`);
  console.error("Set these in your host's environment settings (Render → Environment) or in apps/api/.env locally.\n");
  process.exit(1);
}

/**
 * Allowed CORS origins. Entries are normalised (trailing slashes removed) and
 * may use a single "*" wildcard, e.g. https://servicebook-*.vercel.app for
 * Vercel preview deployments. Local dev servers are always allowed outside production.
 */
function parseAllowedOrigins(raw: string): Array<string | RegExp> {
  const entries = raw
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean);

  const invalid = entries.filter((origin) => !/^https?:\/\/[^/\s]+$/.test(origin));
  if (invalid.length > 0) {
    warnings.push(
      `Ignoring invalid CORS_ORIGIN entr${invalid.length === 1 ? "y" : "ies"} ${invalid.join(", ")}: ` +
        "use full origins like https://servicebook-drab.vercel.app (scheme + host, no path).",
    );
  }
  const valid = entries.filter((origin) => !invalid.includes(origin));

  if (isDeployed) {
    if (valid.every((origin) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin))) {
      warnings.push(`CORS_ORIGIN only lists ${valid.join(", ") || "nothing valid"}; also allowing ${DEFAULT_WEB_ORIGIN}.`);
    }
    valid.push(DEFAULT_WEB_ORIGIN, DEFAULT_PREVIEW_ORIGINS);
  }

  const origins: Array<string | RegExp> = [...new Set(valid)].map((origin) =>
    origin.includes("*")
      ? new RegExp(`^${origin.split("*").map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("[a-z0-9-]+")}$`)
      : origin,
  );

  if (!isDeployed) {
    origins.push("http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:4173");
  }
  return origins;
}

export const env = parsed.data;
export const isProduction = isDeployed;
export const allowedOrigins = parseAllowedOrigins(env.CORS_ORIGIN);

if (env.NODE_ENV !== "test") {
  for (const warning of warnings) console.warn(`Warning: ${warning}`);
}
