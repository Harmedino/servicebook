import { StaffAvailability, type StaffAvailabilityDocument } from "../models/StaffAvailability";
import { ensureBusinessHours } from "./businessHours";

/**
 * Returns a staff member's weekly availability, creating a default that
 * matches the business's current hours the first time it's accessed —
 * always compliant with "must be within business hours" by construction.
 */
export async function ensureStaffAvailability(staffId: string, businessId: string): Promise<StaffAvailabilityDocument[]> {
  const existing = await StaffAvailability.find({ staffId }).sort({ dayOfWeek: 1 });
  if (existing.length > 0) {
    return existing;
  }

  const businessHours = await ensureBusinessHours(businessId);
  await StaffAvailability.insertMany(
    businessHours.map((day) => ({
      staffId,
      dayOfWeek: day.dayOfWeek,
      isOff: day.isClosed,
      startTime: day.openTime,
      endTime: day.closeTime,
    })),
  );
  return StaffAvailability.find({ staffId }).sort({ dayOfWeek: 1 });
}
