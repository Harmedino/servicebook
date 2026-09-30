import { randomBytes } from "node:crypto";
import { formatInTimeZone } from "date-fns-tz";
import type { ChatMessage } from "@servicebook/types";
import { Message, type MessageDocument } from "../models/Message";
import { Booking, type BookingDocument } from "../models/Booking";
import { DEMO_SLUG } from "./demo";

export function toChatMessage(message: MessageDocument): ChatMessage {
  return {
    id: message.id,
    from: message.from as ChatMessage["from"],
    body: message.body,
    automated: Boolean(message.automated),
    createdAt: message.createdAt.toISOString(),
  };
}

/** The booking's private link token, created the first time anyone needs it. */
export async function ensureAccessToken(booking: BookingDocument): Promise<string> {
  if (booking.accessToken) return booking.accessToken;
  const token = randomBytes(18).toString("base64url");
  booking.set("accessToken", token);
  await Booking.updateOne({ _id: booking._id }, { $set: { accessToken: token } });
  return token;
}

/** The first message in every online booking's chat, so the customer gets an answer straight away. */
export async function postWelcomeMessage(params: {
  booking: BookingDocument;
  businessTimezone: string;
  customerName: string;
  serviceName: string;
  staffName: string;
}): Promise<void> {
  const { booking, businessTimezone } = params;
  const firstName = params.customerName.trim().split(/\s+/)[0];
  const when = formatInTimeZone(booking.startTime, businessTimezone, "EEE d MMM 'at' h:mm a");
  const status = booking.status === "CONFIRMED" ? "You're all set." : "We'll confirm it shortly.";
  await Message.create({
    businessId: booking.businessId,
    bookingId: booking._id,
    customerId: booking.customerId,
    from: "business",
    automated: true,
    body: `Hi ${firstName}! Thanks for booking ${params.serviceName} with ${params.staffName} on ${when}. ${status} Need anything before then? Reply here and we'll get back to you.`,
  });
}

function demoReplyFor(text: string): { body: string; confirm?: boolean } {
  if (/late|traffic|delay/i.test(text)) return { body: "No wahala, we'll hold your slot for 15 minutes. Safe trip!" };
  if (/photo|picture|reference|inspo/i.test(text)) return { body: "Yes please! Bring it along or send it here, and your stylist will look at it before you arrive." };
  if (/confirm/i.test(text)) return { body: "All confirmed. See you then!", confirm: true };
  if (/park/i.test(text)) return { body: "There's free parking right in front of the building." };
  if (/price|cost|how much|pay/i.test(text)) return { body: "You pay at the salon after your appointment: cash, card or transfer." };
  return {
    body: "Thanks for your message! This is ServiceBook's demo salon, so this reply is automatic. On a real booking page the owner answers you from their Inbox.",
  };
}

/**
 * The demo salon answers its own messages a moment later, so people trying
 * the demo see the whole conversation without anyone on the other side.
 */
export function scheduleDemoReply(params: { businessSlug: string; booking: BookingDocument; customerText: string }): void {
  if (params.businessSlug !== DEMO_SLUG) return;
  const reply = demoReplyFor(params.customerText);
  setTimeout(() => {
    void (async () => {
      if (reply.confirm && params.booking.status === "PENDING") {
        await Booking.updateOne({ _id: params.booking._id, status: "PENDING" }, { $set: { status: "CONFIRMED" } });
      }
      await Message.create({
        businessId: params.booking.businessId,
        bookingId: params.booking._id,
        customerId: params.booking.customerId,
        from: "business",
        automated: true,
        body: reply.body,
      });
    })().catch((error: unknown) => console.warn("Demo reply failed:", error));
  }, 2200).unref();
}
