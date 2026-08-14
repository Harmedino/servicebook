import type { BusinessDocument } from "../models/Business";
import type { CustomerDocument } from "../models/Customer";
import type { ServiceDocument } from "../models/Service";
import type { StaffDocument } from "../models/Staff";
import type { BookingDocument } from "../models/Booking";
import { sendEmail } from "./email";
import {
  bookingCancellationEmail,
  bookingConfirmationEmail,
  bookingRescheduledEmail,
  type BookingEmailData,
} from "../emails/booking";
import { newBookingEmail } from "../emails/newBooking";

export interface BookingNotificationContext {
  business: BusinessDocument;
  customer: CustomerDocument;
  service: ServiceDocument;
  staff: StaffDocument;
  booking: BookingDocument;
}

function toBookingEmailData(ctx: BookingNotificationContext): BookingEmailData | null {
  if (!ctx.customer.email) {
    return null;
  }
  return {
    businessName: ctx.business.name,
    customerName: ctx.customer.name,
    customerEmail: ctx.customer.email,
    serviceName: ctx.service.name,
    staffName: ctx.staff.name,
    startTime: ctx.booking.startTime,
    endTime: ctx.booking.endTime,
    timezone: ctx.business.timezone,
  };
}

async function deliver(kind: string, bookingId: string, message: Parameters<typeof sendEmail>[0]): Promise<void> {
  const result = await sendEmail(message);
  if (!result.delivered && !result.skipped) {
    console.error(`Failed to send ${kind} email for booking ${bookingId}: ${result.error}`);
  }
}

/** Confirmation to the customer, and a new-booking notice to the business — both optional per settings, both best-effort. */
export async function notifyBookingCreated(ctx: BookingNotificationContext): Promise<void> {
  if (!ctx.business.emailNotificationsEnabled) {
    return;
  }

  const tasks: Promise<void>[] = [];

  if (ctx.business.notifyCustomerOnBooking) {
    const data = toBookingEmailData(ctx);
    if (data) {
      tasks.push(deliver("booking confirmation", ctx.booking.id, bookingConfirmationEmail(data)));
    }
  }

  if (ctx.business.notifyOwnerOnBooking && ctx.business.email) {
    tasks.push(
      deliver(
        "new-booking notification",
        ctx.booking.id,
        newBookingEmail({
          businessName: ctx.business.name,
          businessEmail: ctx.business.email,
          customerName: ctx.customer.name,
          customerPhone: ctx.customer.phone,
          customerEmail: ctx.customer.email ?? undefined,
          serviceName: ctx.service.name,
          staffName: ctx.staff.name,
          startTime: ctx.booking.startTime,
          endTime: ctx.booking.endTime,
          timezone: ctx.business.timezone,
        }),
      ),
    );
  }

  await Promise.all(tasks);
}

/** Owner confirmed a previously-pending booking. Reuses the same "your appointment is confirmed" template sent at creation — it's the same message, just triggered by a different event. */
export async function notifyBookingConfirmed(ctx: BookingNotificationContext): Promise<void> {
  if (!ctx.business.emailNotificationsEnabled || !ctx.business.notifyCustomerOnBooking) {
    return;
  }
  const data = toBookingEmailData(ctx);
  if (!data) {
    return;
  }
  await deliver("booking confirmation", ctx.booking.id, bookingConfirmationEmail(data));
}

export async function notifyBookingCancelled(ctx: BookingNotificationContext): Promise<void> {
  if (!ctx.business.emailNotificationsEnabled || !ctx.business.notifyCustomerOnBooking) {
    return;
  }
  const data = toBookingEmailData(ctx);
  if (!data) {
    return;
  }
  await deliver("booking cancellation", ctx.booking.id, bookingCancellationEmail(data));
}

export async function notifyBookingRescheduled(
  ctx: BookingNotificationContext,
  previous: { startTime: Date; endTime: Date },
): Promise<void> {
  if (!ctx.business.emailNotificationsEnabled || !ctx.business.notifyCustomerOnBooking) {
    return;
  }
  const data = toBookingEmailData(ctx);
  if (!data) {
    return;
  }
  await deliver(
    "booking reschedule",
    ctx.booking.id,
    bookingRescheduledEmail({ ...data, previousStartTime: previous.startTime, previousEndTime: previous.endTime }),
  );
}
