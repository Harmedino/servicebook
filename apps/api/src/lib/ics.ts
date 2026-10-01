/**
 * Just enough iCalendar (RFC 5545) to publish a read-only feed of
 * appointments that Google Calendar, Apple Calendar and Outlook subscribe to.
 */

export interface IcsEvent {
  uid: string;
  start: Date;
  end: Date;
  summary: string;
  description?: string;
  location?: string;
  url?: string;
  status?: "CONFIRMED" | "TENTATIVE" | "CANCELLED";
  updated?: Date;
}

const stamp = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** Escapes text values: backslash, semicolon, comma and newlines. */
function text(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Lines longer than 75 octets are folded onto continuation lines that start with a space. */
function fold(line: string): string {
  const parts: string[] = [];
  let rest = line;
  while (Buffer.byteLength(rest, "utf8") > 75) {
    let cut = 74;
    while (Buffer.byteLength(rest.slice(0, cut), "utf8") > 74) cut -= 1;
    parts.push(rest.slice(0, cut));
    rest = ` ${rest.slice(cut)}`;
  }
  parts.push(rest);
  return parts.join("\r\n");
}

export function buildCalendar(params: { name: string; timezone: string; events: IcsEvent[] }): string {
  const now = stamp(new Date());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ServiceBook//Bookings//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${text(params.name)}`,
    `X-WR-TIMEZONE:${params.timezone}`,
    // Ask clients to check for changes often; most cap this at their own minimum.
    "REFRESH-INTERVAL;VALUE=DURATION:PT15M",
    "X-PUBLISHED-TTL:PT15M",
  ];
  for (const event of params.events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.uid}`,
      `DTSTAMP:${now}`,
      `DTSTART:${stamp(event.start)}`,
      `DTEND:${stamp(event.end)}`,
      `SUMMARY:${text(event.summary)}`,
    );
    if (event.description) lines.push(`DESCRIPTION:${text(event.description)}`);
    if (event.location) lines.push(`LOCATION:${text(event.location)}`);
    if (event.url) lines.push(`URL:${event.url}`);
    if (event.status) lines.push(`STATUS:${event.status}`);
    if (event.updated) lines.push(`LAST-MODIFIED:${stamp(event.updated)}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return `${lines.map(fold).join("\r\n")}\r\n`;
}
