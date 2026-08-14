import { formatInTimeZone } from "date-fns-tz";
import type { EmailMessage } from "../services/email";
import { escapeHtml, renderEmailLayout } from "./layout";

export interface NewBookingEmailData {
  businessName: string;
  businessEmail: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  serviceName: string;
  staffName: string;
  startTime: Date;
  endTime: Date;
  timezone: string;
}

export function newBookingEmail(data: NewBookingEmailData): EmailMessage {
  const dateLine = formatInTimeZone(data.startTime, data.timezone, "EEEE, MMMM d, yyyy");
  const timeLine = `${formatInTimeZone(data.startTime, data.timezone, "h:mm a")} – ${formatInTimeZone(data.endTime, data.timezone, "h:mm a")}`;

  const html = renderEmailLayout(
    data.businessName,
    `
      <h1 style="margin:0 0 16px;font-size:18px;">New appointment</h1>
      <p style="margin:0 0 4px;font-size:13px;color:#a8a29e;text-transform:uppercase;letter-spacing:0.03em;">Customer</p>
      <p style="margin:0 0 16px;">${escapeHtml(data.customerName)} · ${escapeHtml(data.customerPhone)}${
        data.customerEmail ? ` · ${escapeHtml(data.customerEmail)}` : ""
      }</p>
      <p style="margin:0 0 4px;font-size:13px;color:#a8a29e;text-transform:uppercase;letter-spacing:0.03em;">Service</p>
      <p style="margin:0 0 16px;">${escapeHtml(data.serviceName)} with ${escapeHtml(data.staffName)}</p>
      <p style="margin:0 0 4px;">${escapeHtml(dateLine)}</p>
      <p style="margin:0;">${escapeHtml(timeLine)}</p>
    `,
  );

  const text = [
    "New appointment",
    "",
    `Customer: ${data.customerName} · ${data.customerPhone}${data.customerEmail ? ` · ${data.customerEmail}` : ""}`,
    `Service: ${data.serviceName}`,
    `Staff: ${data.staffName}`,
    dateLine,
    timeLine,
  ].join("\n");

  return { to: data.businessEmail, subject: `New appointment — ${data.customerName}`, html, text };
}
