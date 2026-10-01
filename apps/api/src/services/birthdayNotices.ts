import { formatInTimeZone } from "date-fns-tz";
import { Business } from "../models/Business";
import { Customer } from "../models/Customer";
import { notify } from "../lib/notify";

const CHECK_INTERVAL_MS = 60 * 60 * 1000;
const NOTICE_HOUR = 8;

/**
 * Once a day, from 8 AM business time, tells each owner whose customers have a
 * birthday today. Claiming the day with a conditional update means a restart
 * or a second server instance never sends it twice.
 */
export async function sendBirthdayNotices(): Promise<void> {
  // Any business-local "today" falls within a day either side of UTC's.
  const utc = new Date();
  const nearby = [-1, 0, 1].map((offset) => new Date(utc.getTime() + offset * 86_400_000).toISOString().slice(5, 10));
  const businessIds: unknown[] = await Customer.distinct("businessId", { birthday: { $in: nearby } });

  for (const businessId of businessIds) {
    // eslint-disable-next-line no-await-in-loop
    const business = await Business.findById(businessId).select("timezone birthdayNoticeDate");
    if (!business) continue;
    const today = formatInTimeZone(utc, business.timezone, "yyyy-MM-dd");
    if (business.birthdayNoticeDate === today || Number(formatInTimeZone(utc, business.timezone, "H")) < NOTICE_HOUR) continue;

    // eslint-disable-next-line no-await-in-loop
    const claimed = await Business.updateOne({ _id: business._id, birthdayNoticeDate: { $ne: today } }, { $set: { birthdayNoticeDate: today } });
    if (claimed.modifiedCount === 0) continue;

    // eslint-disable-next-line no-await-in-loop
    const celebrating = await Customer.find({ businessId: business._id, birthday: today.slice(5) }).select("name").limit(20);
    if (celebrating.length === 0) continue;
    const names = celebrating.map((customer) => customer.name.split(" ")[0]);
    // eslint-disable-next-line no-await-in-loop
    await notify({
      businessId: business._id,
      type: "signup",
      title: celebrating.length === 1 ? `It's ${celebrating[0].name}'s birthday today` : `${celebrating.length} birthdays today`,
      body: celebrating.length === 1 ? "Send them a message from your dashboard." : names.join(", "),
      link: "/dashboard#birthdays",
    });
  }
}

let handle: ReturnType<typeof setInterval> | null = null;

export function startBirthdayNotices(): void {
  const run = () => void sendBirthdayNotices().catch((error: unknown) => console.warn("Birthday notices failed:", error));
  run();
  handle = setInterval(run, CHECK_INTERVAL_MS);
  handle.unref();
}

export function stopBirthdayNotices(): void {
  if (handle) clearInterval(handle);
  handle = null;
}
