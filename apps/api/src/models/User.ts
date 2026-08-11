import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

export type UserRole = "OWNER";
const USER_ROLES: UserRole[] = ["OWNER"];

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
