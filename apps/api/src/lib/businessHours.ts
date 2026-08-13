import { BusinessHours, type BusinessHoursDocument } from "../models/BusinessHours";

const DEFAULT_WEEKLY_HOURS: Array<{ dayOfWeek: number; isClosed: boolean; openTime: string; closeTime: string }> = [
  { dayOfWeek: 0, isClosed: true, openTime: "09:00", closeTime: "17:00" }, // Sunday
  { dayOfWeek: 1, isClosed: false, openTime: "09:00", closeTime: "17:00" }, // Monday
  { dayOfWeek: 2, isClosed: false, openTime: "09:00", closeTime: "17:00" }, // Tuesday
  { dayOfWeek: 3, isClosed: false, openTime: "09:00", closeTime: "17:00" }, // Wednesday
  { dayOfWeek: 4, isClosed: false, openTime: "09:00", closeTime: "17:00" }, // Thursday
  { dayOfWeek: 5, isClosed: false, openTime: "09:00", closeTime: "17:00" }, // Friday
  { dayOfWeek: 6, isClosed: true, openTime: "09:00", closeTime: "17:00" }, // Saturday
];

/** Returns the business's weekly hours, creating a sensible Mon-Fri 9-5 default the first time they're accessed. */
export async function ensureBusinessHours(businessId: string): Promise<BusinessHoursDocument[]> {
  const existing = await BusinessHours.find({ businessId }).sort({ dayOfWeek: 1 });
  if (existing.length > 0) {
    return existing;
  }

  await BusinessHours.insertMany(DEFAULT_WEEKLY_HOURS.map((day) => ({ businessId, ...day })));
  return BusinessHours.find({ businessId }).sort({ dayOfWeek: 1 });
}
