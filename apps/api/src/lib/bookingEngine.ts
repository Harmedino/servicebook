import mongoose, { type ClientSession } from "mongoose";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { Booking, type BookingDocument } from "../models/Booking";
import { Service, type ServiceDocument } from "../models/Service";
import { Staff, type StaffDocument } from "../models/Staff";
import type { BusinessDocument } from "../models/Business";
import type { CustomerDocument } from "../models/Customer";
import { BadRequestError, ConflictError } from "./errors";
import { ensureBusinessHours } from "./businessHours";
import { ensureStaffAvailability } from "./staffAvailability";
import { notifyBookingCreated } from "../services/notifications";

// The interval at which candidate slots are offered. Not the same as service
// duration — a 60-minute service can still start on any 30-minute boundary.
const SLOT_INTERVAL_MINUTES = 30;

// ---- HH:mm string arithmetic -----------------------------------------
// Kept as pure integer-minute math on "HH:mm" strings (the format
// BusinessHours/StaffAvailability already store) rather than Date objects,
// so it can never be accidentally reinterpreted in the wrong timezone.

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, "0");
  const minutes = (totalMinutes % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

function maxTime(a: string, b: string): string {
  return timeToMinutes(a) >= timeToMinutes(b) ? a : b;
}

function minTime(a: string, b: string): string {
  return timeToMinutes(a) <= timeToMinutes(b) ? a : b;
}

function addMinutesToTime(time: string, minutes: number): string {
  return minutesToTime(timeToMinutes(time) + minutes);
}

// ---- Timezone-aware calendar helpers -----------------------------------

export function nextDateKey(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return next.toISOString().slice(0, 10);
}

/** Given a UTC instant and an IANA timezone, returns the business-local calendar date, day-of-week, and HH:mm. */
export function getLocalDateAndTime(instant: Date, timeZone: string): { dayOfWeek: number; time: string; dateKey: string } {
  const dateKey = formatInTimeZone(instant, timeZone, "yyyy-MM-dd");
  const time = formatInTimeZone(instant, timeZone, "HH:mm");
  const [year, month, day] = dateKey.split("-").map(Number);
  // Pure calendar-date computation — safe regardless of the server's own timezone.
  const dayOfWeek = new Date(year, month - 1, day).getDay();
  return { dayOfWeek, time, dateKey };
}

/** Converts a business-local calendar date's midnight into the equivalent UTC instant. */
export function localDayStartUtc(dateKey: string, timeZone: string): Date {
  return fromZonedTime(`${dateKey}T00:00:00`, timeZone);
}

// ---- Business-rule validation (ownership/hours/availability) -----------

/**
 * Confirms a candidate booking window is in the future and falls within
 * both the business's operating hours and the staff member's availability.
 * Does not check for conflicting bookings — see findConflictMessage, which
 * runs inside a transaction immediately before insert/update.
 */
export async function validateBookingWindow(params: {
  businessId: string;
  business: BusinessDocument;
  staffId: string;
  startTime: Date;
  endTime: Date;
}): Promise<void> {
  const { businessId, business, staffId, startTime, endTime } = params;

  if (startTime.getTime() < Date.now()) {
    throw new BadRequestError("Bookings can't be created in the past");
  }

  const startLocal = getLocalDateAndTime(startTime, business.timezone);
  const endLocal = getLocalDateAndTime(endTime, business.timezone);

  if (startLocal.dateKey !== endLocal.dateKey) {
    throw new BadRequestError("A booking can't span midnight in the business's timezone");
  }

  const businessHours = await ensureBusinessHours(businessId);
  const dayHours = businessHours.find((hours) => hours.dayOfWeek === startLocal.dayOfWeek);
  if (!dayHours || dayHours.isClosed) {
    throw new BadRequestError("The business is closed at the selected time");
  }
  if (startLocal.time < dayHours.openTime || endLocal.time > dayHours.closeTime) {
    throw new BadRequestError(`This time is outside business hours (${dayHours.openTime}-${dayHours.closeTime})`);
  }

  const staffAvailability = await ensureStaffAvailability(staffId, businessId);
  const dayAvailability = staffAvailability.find((entry) => entry.dayOfWeek === startLocal.dayOfWeek);
  if (!dayAvailability || dayAvailability.isOff) {
    throw new BadRequestError("This staff member is not available at the selected time");
  }
  if (startLocal.time < dayAvailability.startTime || endLocal.time > dayAvailability.endTime) {
    throw new BadRequestError(
      `This staff member is only available ${dayAvailability.startTime}-${dayAvailability.endTime} that day`,
    );
  }
}

// ---- Conflict detection (must run inside the create/reschedule transaction) --

/**
 * Checks for an overlapping, non-cancelled booking for the same staff member
 * (a double-booked staff member) or the same customer within the business (a
 * customer double-booked with themselves). Must be called with the same
 * session used for the subsequent insert/update to keep the check-then-write
 * atomic — see the "atomicity" note in the bookings route for the limits of
 * this guarantee on a non-serializable transaction.
 */
export async function findConflictMessage(params: {
  businessId: string;
  staffId: string;
  customerId: string;
  startTime: Date;
  endTime: Date;
  excludeBookingId?: string;
  session: ClientSession;
}): Promise<string | null> {
  const { businessId, staffId, customerId, startTime, endTime, excludeBookingId, session } = params;

  const overlapFilter = {
    status: { $ne: "CANCELLED" },
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
    ...(excludeBookingId ? { _id: { $ne: excludeBookingId } } : {}),
  };

  const staffConflict = await Booking.exists({ ...overlapFilter, staffId }).session(session);
  if (staffConflict) {
    return "This staff member already has a booking that overlaps this time";
  }

  const customerConflict = await Booking.exists({ ...overlapFilter, businessId, customerId }).session(session);
  if (customerConflict) {
    return "This customer already has an overlapping appointment";
  }

  return null;
}

// ---- Available slot computation (shared by the internal and public booking APIs) --

export async function computeAvailableSlots(params: {
  businessId: string;
  business: BusinessDocument;
  staffId: string;
  serviceDurationMinutes: number;
  dateKey: string;
}): Promise<Date[]> {
  const { businessId, business, staffId, serviceDurationMinutes, dateKey } = params;

  const [year, month, day] = dateKey.split("-").map(Number);
  const dayOfWeek = new Date(year, month - 1, day).getDay();

  const businessHours = await ensureBusinessHours(businessId);
  const dayHours = businessHours.find((hours) => hours.dayOfWeek === dayOfWeek);
  if (!dayHours || dayHours.isClosed) {
    return [];
  }

  const staffAvailability = await ensureStaffAvailability(staffId, businessId);
  const dayAvailability = staffAvailability.find((entry) => entry.dayOfWeek === dayOfWeek);
  if (!dayAvailability || dayAvailability.isOff) {
    return [];
  }

  const windowStart = maxTime(dayHours.openTime, dayAvailability.startTime);
  const windowEnd = minTime(dayHours.closeTime, dayAvailability.endTime);
  if (timeToMinutes(windowStart) >= timeToMinutes(windowEnd)) {
    return [];
  }

  const dayStartUtc = localDayStartUtc(dateKey, business.timezone);
  const dayEndUtc = localDayStartUtc(nextDateKey(dateKey), business.timezone);

  const existingBookings = await Booking.find({
    staffId,
    status: { $ne: "CANCELLED" },
    startTime: { $lt: dayEndUtc },
    endTime: { $gt: dayStartUtc },
  });

  const now = Date.now();
  const slots: Date[] = [];
  let cursor = windowStart;

  while (timeToMinutes(addMinutesToTime(cursor, serviceDurationMinutes)) <= timeToMinutes(windowEnd)) {
    const slotStartUtc = fromZonedTime(`${dateKey}T${cursor}:00`, business.timezone);
    const slotEndUtc = new Date(slotStartUtc.getTime() + serviceDurationMinutes * 60_000);

    const isPast = slotStartUtc.getTime() < now;
    const overlaps = existingBookings.some((booking) => booking.startTime < slotEndUtc && booking.endTime > slotStartUtc);

    if (!isPast && !overlaps) {
      slots.push(slotStartUtc);
    }

    cursor = addMinutesToTime(cursor, SLOT_INTERVAL_MINUTES);
  }

  return slots;
}

// ---- Shared booking creation (the single code path both the internal and --
// ---- public booking APIs use, so neither can bypass the other's rules)  --

/**
 * Verifies a service and staff member both belong to the business, are
 * active, and that the staff member actually provides that service. Shared
 * by booking creation and rescheduling — the ownership/eligibility rules are
 * identical in both cases, only what happens afterward (insert vs. update)
 * differs.
 */
export async function resolveBookableServiceAndStaff(params: {
  businessId: string;
  serviceId: string;
  staffId: string;
}): Promise<{ service: ServiceDocument; staff: StaffDocument }> {
  const { businessId, serviceId, staffId } = params;

  const service = await Service.findOne({ _id: serviceId, businessId });
  if (!service) {
    throw new BadRequestError("Service not found");
  }
  if (!service.isActive) {
    throw new BadRequestError("This service is no longer offered");
  }

  const staff = await Staff.findOne({ _id: staffId, businessId });
  if (!staff) {
    throw new BadRequestError("Staff member not found");
  }
  if (!staff.isActive) {
    throw new BadRequestError("This staff member is no longer active");
  }
  if (!staff.serviceIds.some((id) => id.toString() === serviceId)) {
    throw new BadRequestError("This staff member doesn't provide the selected service");
  }

  return { service, staff };
}

/**
 * Resolves and validates service/staff ownership, computes the service-duration
 * end time server-side, validates the window (hours/availability/past-date),
 * and — inside a transaction — re-checks for conflicts and inserts the
 * booking. This is the single source of truth for "is this booking allowed,"
 * called by both POST /api/bookings (internal) and the public booking route,
 * so the public flow can never bypass a rule the internal flow enforces.
 */
export async function createValidatedBooking(params: {
  businessId: string;
  business: BusinessDocument;
  serviceId: string;
  staffId: string;
  customer: CustomerDocument;
  startTime: Date;
  notes?: string;
}): Promise<{ booking: BookingDocument; service: ServiceDocument; staff: StaffDocument }> {
  const { businessId, business, serviceId, staffId, customer, startTime, notes } = params;
  const customerId = customer.id;

  const { service, staff } = await resolveBookableServiceAndStaff({ businessId, serviceId, staffId });

  const endTime = new Date(startTime.getTime() + service.durationMinutes * 60_000);

  await validateBookingWindow({ businessId, business, staffId, startTime, endTime });

  const session = await mongoose.startSession();
  let booking: BookingDocument | undefined;
  try {
    await session.withTransaction(async () => {
      const conflictMessage = await findConflictMessage({ businessId, staffId, customerId, startTime, endTime, session });
      if (conflictMessage) {
        throw new ConflictError(conflictMessage);
      }

      const [created] = await Booking.create(
        [{ businessId, staffId, serviceId, customerId, startTime, endTime, notes }],
        { session },
      );
      booking = created;
    });
  } finally {
    await session.endSession();
  }

  const createdBooking = booking as BookingDocument;

  // Fire-and-forget, and deliberately outside the transaction: email I/O is
  // slow and unreliable compared to a DB write, and a failed/slow send must
  // never delay the booking response or cause the transaction to retry (which
  // could otherwise resend the same email). The booking is already durably
  // committed by this point regardless of what happens here.
  void notifyBookingCreated({ business, customer, service, staff, booking: createdBooking }).catch((error: unknown) => {
    console.error(`Booking-created notification failed for booking ${createdBooking.id}:`, error);
  });

  return { booking: createdBooking, service, staff };
}
