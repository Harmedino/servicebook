import type { EmailMessage } from "../services/email";
import { escapeHtml, renderEmailLayout } from "./layout";

export function newMessageEmail(data: { to: string; businessName: string; customerName: string; body: string; link: string }): EmailMessage {
  const html = renderEmailLayout(
    data.businessName,
    `
      <h1 style="margin:0 0 16px;font-size:18px;">New message from ${escapeHtml(data.businessName)}</h1>
      <p style="margin:0 0 16px;color:#57534e;">Hi ${escapeHtml(data.customerName)},</p>
      <p style="margin:0 0 20px;padding:12px 16px;border-radius:12px;background:#f5f5f4;">${escapeHtml(data.body)}</p>
      <p style="margin:0;"><a href="${escapeHtml(data.link)}" style="color:#0f8250;font-weight:600;">Reply or view your booking</a></p>
    `,
  );
  const text = [`New message from ${data.businessName}`, "", data.body, "", `Reply or view your booking: ${data.link}`].join("\n");
  return { to: data.to, subject: `New message from ${data.businessName}`, html, text };
}
