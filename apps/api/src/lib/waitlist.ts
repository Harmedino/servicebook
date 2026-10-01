import type { BookingDocument } from "../models/Booking";
import type { BusinessDocument } from "../models/Business";
import { WaitlistEntry } from "../models/WaitlistEntry";
import { notify } from "./notify";
import { getLocalDateAndTime } from "./bookingEngine";

/**
 * After a cancellation: if anyone is waiting for that day, tell the owner a
 * spot opened, with how many people to offer it to. Never throws.
 */
export async function announceOpening(booking: BookingDocument, business: Pick<BusinessDocument, "id" | "timezone">): Promise<void> {
  try {
    const { dateKey } = getLocalDateAndTime(booking.startTime, business.timezone);
    const waiting = await WaitlistEntry.countDocuments({ businessId: business.id, date: dateKey, status: "waiting" });
    if (waiting === 0) return;
    const day = new Date(`${dateKey}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
    await notify({
      businessId: business.id,
      type: "booking",
      title: `A spot opened on ${day}`,
      body: `${waiting} ${waiting === 1 ? "person is" : "people are"} on the waitlist for that day.`,
      link: `/waitlist?date=${dateKey}`,
    });
  } catch (error) {
    console.warn("Waitlist check failed:", error);
  }
}
