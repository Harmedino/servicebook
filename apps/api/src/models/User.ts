import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

// OWNER runs a business; STAFF signs in through an invite and sees only their own schedule.
export type UserRole = "OWNER" | "STAFF";
const USER_ROLES: UserRole[] = ["OWNER", "STAFF"];

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email address"],
    },
    // Excluded from query results by default — call .select("+passwordHash")
    // explicitly wherever the hash is actually needed (e.g. login).
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: USER_ROLES,
      default: "OWNER",
      required: true,
    },
  },
  { timestamps: true },
);

export type UserAttributes = InferSchemaType<typeof userSchema>;
export type UserDocument = HydratedDocument<UserAttributes>;

export const User = model<UserAttributes>("User", userSchema);
