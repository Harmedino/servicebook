import { formatInTimeZone } from "date-fns-tz";
import type { EmailMessage } from "../services/email";
import { escapeHtml, renderEmailLayout } from "./layout";

export interface BookingEmailData {
  businessName: string;
  customerName: string;
  customerEmail: string;
  serviceName: string;
  staffName: string;
  startTime: Date;
  endTime: Date;
  timezone: string;
}

function formatAppointment(startTime: Date, endTime: Date, timezone: string): { dateLine: string; timeLine: string } {
  return {
    dateLine: formatInTimeZone(startTime, timezone, "EEEE, MMMM d, yyyy"),
    timeLine: `${formatInTimeZone(startTime, timezone, "h:mm a")} – ${formatInTimeZone(endTime, timezone, "h:mm a")}`,
  };
}

export function bookingConfirmationEmail(data: BookingEmailData): EmailMessage {
  const { dateLine, timeLine } = formatAppointment(data.startTime, data.endTime, data.timezone);

  const html = renderEmailLayout(
    data.businessName,
    `
      <h1 style="margin:0 0 16px;font-size:18px;">Your appointment is confirmed</h1>
      <p style="margin:0 0 4px;font-weight:600;">${escapeHtml(data.serviceName)}</p>
      <p style="margin:0 0 16px;color:#57534e;">with ${escapeHtml(data.staffName)}</p>
      <p style="margin:0 0 4px;">${escapeHtml(dateLine)}</p>
      <p style="margin:0 0 20px;">${escapeHtml(timeLine)}</p>
      <p style="margin:0;color:#57534e;">Thank you for booking with ${escapeHtml(data.businessName)}, ${escapeHtml(data.customerName)}.</p>
    `,
  );

  const text = [
    "Your appointment is confirmed",
    "",
    `${data.serviceName} with ${data.staffName}`,
    dateLine,
    timeLine,
    "",
    `Thank you for booking with ${data.businessName}, ${data.customerName}.`,
  ].join("\n");

  return { to: data.customerEmail, subject: `Appointment confirmed — ${data.businessName}`, html, text };
}

export function bookingCancellationEmail(data: BookingEmailData): EmailMessage {
  const { dateLine, timeLine } = formatAppointment(data.startTime, data.endTime, data.timezone);

  const html = renderEmailLayout(
    data.businessName,
    `
      <h1 style="margin:0 0 16px;font-size:18px;">Appointment cancelled</h1>
      <p style="margin:0 0 4px;font-weight:600;">${escapeHtml(data.serviceName)}</p>
      <p style="margin:0 0 16px;color:#57534e;">with ${escapeHtml(data.staffName)}</p>
      <p style="margin:0 0 4px;">${escapeHtml(dateLine)}</p>
      <p style="margin:0 0 20px;">${escapeHtml(timeLine)}</p>
      <p style="margin:0;color:#57534e;">Your appointment with ${escapeHtml(data.businessName)} has been cancelled.</p>
    `,
  );

  const text = [
    "Appointment cancelled",
    "",
    `${data.serviceName} with ${data.staffName}`,
    dateLine,
    timeLine,
    "",
    `Your appointment with ${data.businessName} has been cancelled.`,
  ].join("\n");

  return { to: data.customerEmail, subject: `Appointment cancelled — ${data.businessName}`, html, text };
}

export function bookingReminderEmail(data: BookingEmailData): EmailMessage {
  const { dateLine, timeLine } = formatAppointment(data.startTime, data.endTime, data.timezone);

  const html = renderEmailLayout(
    data.businessName,
    `
      <h1 style="margin:0 0 16px;font-size:18px;">Appointment reminder</h1>
      <p style="margin:0 0 4px;font-weight:600;">${escapeHtml(data.serviceName)}</p>
      <p style="margin:0 0 16px;color:#57534e;">with ${escapeHtml(data.staffName)}</p>
      <p style="margin:0 0 4px;">${escapeHtml(dateLine)}</p>
      <p style="margin:0 0 20px;">${escapeHtml(timeLine)}</p>
      <p style="margin:0;color:#57534e;">This is a reminder of your upcoming appointment with ${escapeHtml(data.businessName)}.</p>
    `,
  );

  const text = [
    "Appointment reminder",
    "",
    `${data.serviceName} with ${data.staffName}`,
    dateLine,
    timeLine,
    "",
    `This is a reminder of your upcoming appointment with ${data.businessName}.`,
  ].join("\n");

  return { to: data.customerEmail, subject: `Reminder: your appointment tomorrow — ${data.businessName}`, html, text };
}

export interface BookingRescheduledEmailData extends BookingEmailData {
  previousStartTime: Date;
  previousEndTime: Date;
}

export function bookingRescheduledEmail(data: BookingRescheduledEmailData): EmailMessage {
  const previous = formatAppointment(data.previousStartTime, data.previousEndTime, data.timezone);
  const updated = formatAppointment(data.startTime, data.endTime, data.timezone);

  const html = renderEmailLayout(
    data.businessName,
    `
      <h1 style="margin:0 0 16px;font-size:18px;">Your appointment has been updated</h1>
      <p style="margin:0 0 4px;font-weight:600;">${escapeHtml(data.serviceName)}</p>
      <p style="margin:0 0 16px;color:#57534e;">with ${escapeHtml(data.staffName)}</p>
      <p style="margin:0 0 4px;font-size:13px;color:#a8a29e;text-transform:uppercase;letter-spacing:0.03em;">Previous</p>
      <p style="margin:0 0 16px;color:#78716c;text-decoration:line-through;">${escapeHtml(previous.dateLine)}, ${escapeHtml(previous.timeLine)}</p>
      <p style="margin:0 0 4px;font-size:13px;color:#a8a29e;text-transform:uppercase;letter-spacing:0.03em;">New</p>
      <p style="margin:0 0 20px;font-weight:600;">${escapeHtml(updated.dateLine)}, ${escapeHtml(updated.timeLine)}</p>
      <p style="margin:0;color:#57534e;">This replaces your previous appointment time with ${escapeHtml(data.businessName)}.</p>
    `,
  );

  const text = [
    "Your appointment has been updated",
    "",
    `${data.serviceName} with ${data.staffName}`,
    "",
    `Previous: ${previous.dateLine}, ${previous.timeLine}`,
    `New: ${updated.dateLine}, ${updated.timeLine}`,
    "",
    `This replaces your previous appointment time with ${data.businessName}.`,
  ].join("\n");

  return { to: data.customerEmail, subject: `Appointment updated — ${data.businessName}`, html, text };
}
