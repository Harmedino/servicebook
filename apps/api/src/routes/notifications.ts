import { Router } from "express";
import type { NotificationListResponse, NotificationProfile, NotificationType } from "@servicebook/types";
import { Notification, type NotificationDocument } from "../models/Notification";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth, requireBusiness } from "../middleware/auth";

function toProfile(notification: NotificationDocument): NotificationProfile {
  return {
    id: notification.id,
    type: notification.type as NotificationType,
    title: notification.title,
    body: notification.body ?? undefined,
    link: notification.link ?? undefined,
    read: Boolean(notification.readAt),
    createdAt: notification.createdAt.toISOString(),
  };
}

export const notificationsRouter = Router();

notificationsRouter.use(requireAuth, requireBusiness);

notificationsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const [items, unread] = await Promise.all([
      Notification.find({ businessId: req.businessId }).sort({ createdAt: -1 }).limit(40),
      Notification.countDocuments({ businessId: req.businessId, readAt: null }),
    ]);
    const body: NotificationListResponse = { notifications: items.map(toProfile), unread };
    res.json(body);
  }),
);

notificationsRouter.post(
  "/read-all",
  asyncHandler(async (req, res) => {
    await Notification.updateMany({ businessId: req.businessId, readAt: null }, { $set: { readAt: new Date() } });
    res.json({ unread: 0 });
  }),
);

notificationsRouter.post(
  "/:id/read",
  asyncHandler(async (req, res) => {
    await Notification.updateOne({ _id: req.params.id, businessId: req.businessId, readAt: null }, { $set: { readAt: new Date() } });
    const unread = await Notification.countDocuments({ businessId: req.businessId, readAt: null });
    res.json({ unread });
  }),
);
