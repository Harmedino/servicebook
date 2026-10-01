/**
 * What a signed-in staff member (not the owner) may call. Everything else is
 * refused, so a new route is owner-only until it's deliberately listed here.
 * Routes on this list still limit results to the staff member's own data.
 */
const STAFF_ALLOWED: Array<[method: string, path: RegExp]> = [
  ["GET", /^\/api\/business\/?$/],
  ["GET", /^\/api\/business\/hours\/?$/],
  ["GET", /^\/api\/services(\/[0-9a-f]{24})?\/?$/],
  ["GET", /^\/api\/staff\/?$/],
  ["GET", /^\/api\/staff\/[0-9a-f]{24}\/?$/],
  ["GET", /^\/api\/staff\/[0-9a-f]{24}\/availability\/?$/],
  // Customers: look up and add, for booking someone in. Editing details stays with the owner.
  ["GET", /^\/api\/customers\/?$/],
  ["GET", /^\/api\/customers\/[0-9a-f]{24}\/?$/],
  ["POST", /^\/api\/customers\/?$/],
  // Their own bookings and chats.
  ["GET", /^\/api\/bookings(\/available-slots|\/[0-9a-f]{24})?\/?$/],
  ["POST", /^\/api\/bookings\/?$/],
  ["PATCH", /^\/api\/bookings\/[0-9a-f]{24}\/?$/],
  ["GET", /^\/api\/bookings\/[0-9a-f]{24}\/messages\/?$/],
  ["POST", /^\/api\/bookings\/[0-9a-f]{24}\/messages\/?$/],
  ["GET", /^\/api\/conversations\/?$/],
  // Their own time off.
  ["GET", /^\/api\/time-off\/?$/],
  ["POST", /^\/api\/time-off\/?$/],
  ["DELETE", /^\/api\/time-off\/[0-9a-f]{24}\/?$/],
  // Uploading a photo (e.g. in a booking chat later) and reading uploads.
  ["POST", /^\/api\/uploads\/?$/],
];

export function staffMayCall(method: string, path: string): boolean {
  return STAFF_ALLOWED.some(([allowedMethod, pattern]) => allowedMethod === method && pattern.test(path));
}
