import webpush from "web-push";
import type { Types } from "mongoose";
import { AppSetting } from "../models/AppSetting";
import { PushSubscription } from "../models/PushSubscription";

interface VapidKeys {
  publicKey: string;
  privateKey: string;
}

let vapid: Promise<VapidKeys> | null = null;

/**
 * Keys that identify this server to browser push services. Taken from
 * VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY when set; otherwise generated once and
 * kept in the database, so push works without any extra setup and existing
 * subscriptions survive restarts and redeploys.
 */
export function vapidKeys(): Promise<VapidKeys> {
  vapid ??= (async () => {
    const fromEnv = { publicKey: process.env.VAPID_PUBLIC_KEY?.trim(), privateKey: process.env.VAPID_PRIVATE_KEY?.trim() };
    let keys: VapidKeys;
    if (fromEnv.publicKey && fromEnv.privateKey) {
      keys = fromEnv as VapidKeys;
    } else {
      // $setOnInsert keeps the first generated pair if two instances race.
      const saved = await AppSetting.findOneAndUpdate(
        { key: "vapid" },
        { $setOnInsert: { value: webpush.generateVAPIDKeys() } },
        { upsert: true, new: true },
      );
      keys = saved.value as VapidKeys;
    }
    webpush.setVapidDetails(process.env.VAPID_SUBJECT?.trim() || "mailto:hello@servicebook.app", keys.publicKey, keys.privateKey);
    return keys;
  })().catch((error) => {
    vapid = null;
    throw error;
  });
  return vapid;
}

export interface PushPayload {
  title: string;
  body?: string;
  link?: string;
  tag?: string;
}

/**
 * Sends a notification to every device subscribed to the business. Never
 * throws; subscriptions the push service says are gone are deleted.
 */
export async function pushToBusiness(businessId: string | Types.ObjectId, payload: PushPayload): Promise<void> {
  try {
    const subscriptions = await PushSubscription.find({ businessId });
    if (subscriptions.length === 0) return;
    await vapidKeys();
    const message = JSON.stringify(payload);
    await Promise.all(
      subscriptions.map(async (subscription) => {
        try {
          await webpush.sendNotification({ endpoint: subscription.endpoint, keys: subscription.keys as { p256dh: string; auth: string } }, message, {
            TTL: 60 * 60 * 24,
            urgency: "high",
          });
          subscription.lastSuccessAt = new Date();
          await subscription.save();
        } catch (error) {
          const status = (error as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            await subscription.deleteOne();
          } else {
            console.warn(`Push to ${subscription.endpoint.slice(0, 40)}… failed:`, status ?? error);
          }
        }
      }),
    );
  } catch (error) {
    console.warn("Push notifications were not sent:", error);
  }
}
