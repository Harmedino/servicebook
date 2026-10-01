import { randomBytes } from "node:crypto";
import { Router } from "express";
import type { StaffInviteResponse } from "@servicebook/types";
import { Staff } from "../models/Staff";
import { User } from "../models/User";
import { BadRequestError, NotFoundError } from "../lib/errors";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth, requireBusiness } from "../middleware/auth";
import { objectIdField } from "../lib/validation";

const INVITE_DAYS = 7;

/** Owner-only (not on the staff allowlist): give staff their own login, or take it away. */
export const teamRouter = Router();
teamRouter.use(requireAuth, requireBusiness);

async function staffMember(businessId: string | undefined, id: string) {
  const staff = await Staff.findOne({ _id: objectIdField.parse(id), businessId });
  if (!staff) throw new NotFoundError("Staff member not found");
  return staff;
}

/** A one-time link, valid for a week, to send them. Calling it again replaces any earlier link. */
teamRouter.post(
  "/:staffId/invite",
  asyncHandler(async (req, res) => {
    const staff = await staffMember(req.businessId, req.params.staffId);
    if (staff.userId) throw new BadRequestError(staff.userId.toString() === req.business!.ownerId.toString() ? "That's you" : "They already have a login");
    if (!staff.isActive) throw new BadRequestError("Turn this staff member back on first");
    const token = randomBytes(18).toString("base64url");
    const expiresAt = new Date(Date.now() + INVITE_DAYS * 86_400_000);
    staff.set({ inviteToken: token, inviteExpiresAt: expiresAt });
    await staff.save();
    const body: StaffInviteResponse = { token, expiresAt: expiresAt.toISOString() };
    res.status(201).json(body);
  }),
);

/** Stops their login working straight away (and cancels any pending invite). */
teamRouter.delete(
  "/:staffId/access",
  asyncHandler(async (req, res) => {
    const staff = await staffMember(req.businessId, req.params.staffId);
    if (staff.userId?.toString() === req.business!.ownerId.toString()) throw new BadRequestError("You can't remove your own access");
    if (staff.userId) {
      // Only ever delete a STAFF account, never an owner's.
      await User.deleteOne({ _id: staff.userId, role: "STAFF" });
    }
    await Staff.updateOne({ _id: staff._id }, { $unset: { userId: 1, inviteToken: 1, inviteExpiresAt: 1 } });
    res.status(204).end();
  }),
);
