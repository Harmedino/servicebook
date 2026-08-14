import { env } from "../config/env";

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface SendEmailResult {
  delivered: boolean;
  /** True when no real provider is configured — a deliberate no-op, not a failure. */
  skipped: boolean;
  error?: string;
}

async function sendViaResend(message: EmailMessage): Promise<SendEmailResult> {
  if (!env.EMAIL_API_KEY || !env.EMAIL_FROM) {
    console.warn(
      "Email not configured (EMAIL_PROVIDER=resend requires EMAIL_API_KEY and EMAIL_FROM). Skipping email delivery.",
    );
    return { delivered: false, skipped: true };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.EMAIL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      return {
        delivered: false,
        skipped: false,
        error: `Resend API responded ${response.status}: ${errorBody.slice(0, 200)}`,
      };
    }

    return { delivered: true, skipped: false };
  } catch (error) {
    return { delivered: false, skipped: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

function sendViaConsole(message: EmailMessage): SendEmailResult {
  console.log(`[email] Not configured — logging instead of sending. To: ${message.to} | Subject: ${message.subject}`);
  return { delivered: false, skipped: true };
}

/**
 * Sends a transactional email through the configured provider. Never throws —
 * callers should treat a failed or skipped send as "the notification didn't
 * go out," never as a reason to fail whatever business operation triggered
 * it (booking creation, cancellation, etc. must succeed independently of
 * email delivery).
 */
export async function sendEmail(message: EmailMessage): Promise<SendEmailResult> {
  switch (env.EMAIL_PROVIDER) {
    case "resend":
      return sendViaResend(message);
    case "console":
    default:
      return sendViaConsole(message);
  }
}
