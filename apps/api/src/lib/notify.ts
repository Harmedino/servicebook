import type { Types } from "mongoose";
import type { NotificationType } from "@servicebook/types";
import { Notification } from "../models/Notification";

/**
 * Records a notification for the business owner. Never throws: a failed
 * notification must not fail the booking or message that caused it.
 */
export async function notify(params: {
  businessId: string | Types.ObjectId;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
}): Promise<void> {
  try {
    await Notification.create(params);
  } catch (error) {
    console.warn("Notification was not saved:", error);
  }
}
