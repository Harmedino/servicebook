import { Booking } from "../models/Booking";
import { Business } from "../models/Business";
import { Customer } from "../models/Customer";
import { Service } from "../models/Service";
import { Staff } from "../models/Staff";
import { sendEmail } from "./email";
import { bookingReminderEmail } from "../emails/booking";
import { emailsAllowed } from "../lib/demo";

const REMINDER_WINDOW_HOURS = 24;
const CHECK_INTERVAL_MS = 15 * 60 * 1000; // every 15 minutes — not a "few seconds" poll

/**
 * Finds non-cancelled bookings starting within the next 24 hours that
 * haven't had a reminder sent yet, and sends one each. Safe to call
 * concurrently or repeatedly: each booking is atomically "claimed" via a
 * findOneAndUpdate that only succeeds if reminder24hSentAt is still null, so
 * two overlapping runs (or two server instances) can never both send it.
 */
export async function sendDueReminders(): Promise<void> {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_HOURS * 60 * 60 * 1000);

  const candidates = await Booking.find({
    status: { $in: ["PENDING", "CONFIRMED"] },
    startTime: { $gte: now, $lte: windowEnd },
    reminder24hSentAt: null,
  });

  for (const candidate of candidates) {
    // eslint-disable-next-line no-await-in-loop
    const claimed = await Booking.findOneAndUpdate(
      { _id: candidate.id, reminder24hSentAt: null },
      { $set: { reminder24hSentAt: now } },
      { new: true },
    );
    if (!claimed) {
      continue; // another run already claimed this booking
    }

    // eslint-disable-next-line no-await-in-loop
    const business = await Business.findById(claimed.businessId);
    if (!business || !emailsAllowed(business) || !business.notifyCustomerReminder) {
      continue;
    }

    // eslint-disable-next-line no-await-in-loop
    const customer = await Customer.findById(claimed.customerId);
    if (!customer?.email) {
      continue;
    }

    // eslint-disable-next-line no-await-in-loop
    const [service, staff] = await Promise.all([Service.findById(claimed.serviceId), Staff.findById(claimed.staffId)]);
    if (!service || !staff) {
      continue;
    }

    // eslint-disable-next-line no-await-in-loop
    const result = await sendEmail(
      bookingReminderEmail({
        businessName: business.name,
        customerName: customer.name,
        customerEmail: customer.email,
        serviceName: service.name,
        staffName: staff.name,
        startTime: claimed.startTime,
        endTime: claimed.endTime,
        timezone: business.timezone,
      }),
    );

    if (!result.delivered && !result.skipped) {
      console.error(`Failed to send reminder email for booking ${claimed.id}: ${result.error}`);
    }
  }
}

let intervalHandle: ReturnType<typeof setInterval> | null = null;

export function startReminderScheduler(): void {
  if (intervalHandle) {
    return;
  }
  void sendDueReminders().catch((error: unknown) => console.error("Reminder scheduler run failed:", error));
  intervalHandle = setInterval(() => {
    void sendDueReminders().catch((error: unknown) => console.error("Reminder scheduler run failed:", error));
  }, CHECK_INTERVAL_MS);
}

export function stopReminderScheduler(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}
