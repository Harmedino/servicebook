import { Router } from "express";
import { z } from "zod";
import type { NotificationListResponse, NotificationProfile, NotificationType } from "@servicebook/types";
import { Notification, type NotificationDocument } from "../models/Notification";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth, requireBusiness } from "../middleware/auth";
import { PushSubscription } from "../models/PushSubscription";
import { vapidKeys } from "../lib/push";
import { notify } from "../lib/notify";

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

// ---- Device alerts (web push) ---------------------------------------------------

notificationsRouter.get(
  "/push-key",
  asyncHandler(async (_req, res) => {
    const { publicKey } = await vapidKeys();
    res.json({ publicKey });
  }),
);

// Browsers only ever hand out endpoints on these push services. Accepting
// nothing else stops the server being used to send requests anywhere else.
const PUSH_HOSTS = [/(^|\.)googleapis\.com$/, /(^|\.)mozilla\.com$/, /(^|\.)push\.apple\.com$/, /(^|\.)notify\.windows\.com$/];

const pushEndpointField = z
  .string()
  .max(1000)
  .url()
  .refine((value) => {
    const url = new URL(value);
    return url.protocol === "https:" && PUSH_HOSTS.some((host) => host.test(url.hostname));
  }, "That isn't a browser push address");

const subscriptionSchema = z.object({
  endpoint: pushEndpointField,
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
});

notificationsRouter.post(
  "/push-subscriptions",
  asyncHandler(async (req, res) => {
    const subscription = subscriptionSchema.parse(req.body);
    await PushSubscription.findOneAndUpdate(
      { endpoint: subscription.endpoint },
      {
        $set: {
          businessId: req.businessId,
          userId: req.user?.id,
          keys: subscription.keys,
          userAgent: req.get("user-agent")?.slice(0, 300),
        },
      },
      { upsert: true },
    );
    res.status(201).json({ ok: true });
  }),
);

notificationsRouter.delete(
  "/push-subscriptions",
  asyncHandler(async (req, res) => {
    const { endpoint } = z.object({ endpoint: z.string().max(1000) }).parse(req.body);
    await PushSubscription.deleteOne({ endpoint, businessId: req.businessId });
    res.status(204).end();
  }),
);

/** Lets the owner check that alerts reach this device. */
notificationsRouter.post(
  "/test",
  asyncHandler(async (req, res) => {
    await notify({
      businessId: req.businessId as string,
      type: "booking",
      title: "Test alert",
      body: "If you can see this, new bookings and messages will reach you here.",
      link: "/dashboard",
    });
    const devices = await PushSubscription.countDocuments({ businessId: req.businessId });
    res.status(201).json({ devices });
  }),
);
