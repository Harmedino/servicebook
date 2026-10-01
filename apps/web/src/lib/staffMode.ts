/** Pages a staff login can open; anything else sends them to their bookings. Mirrors the API's staff allowlist. */
const STAFF_PATHS = [/^\/bookings(\/new|\/[0-9a-f]{24})?$/, /^\/calendar$/, /^\/inbox$/, /^\/time-off(\/new)?$/, /^\/customers\/[0-9a-f]{24}$/];

export const STAFF_HOME = "/bookings";

export function staffCanOpen(pathname: string): boolean {
  return STAFF_PATHS.some((pattern) => pattern.test(pathname));
}
