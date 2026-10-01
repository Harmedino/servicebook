import type { Types } from "mongoose";
import type { NotificationType } from "@servicebook/types";
import { Notification } from "../models/Notification";
import { pushToBusiness } from "./push";

/**
 * Records a notification for the business owner and pushes it to their
 * phone and computer. Never throws: a failed notification must not fail the
 * booking or message that caused it.
 */
export async function notify(params: {
  businessId: string | Types.ObjectId;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
}): Promise<void> {
  try {
    const notification = await Notification.create(params);
    // Not awaited: push services can be slow, and the customer shouldn't wait on them.
    void pushToBusiness(params.businessId, { title: params.title, body: params.body, link: params.link, tag: notification.id });
  } catch (error) {
    console.warn("Notification was not saved:", error);
  }
}
