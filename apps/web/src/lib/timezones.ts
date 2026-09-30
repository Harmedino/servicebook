const SUPPORTED: string[] = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];

// supportedValuesOf omits "UTC" and the legacy alias a browser may report
// (e.g. Asia/Calcutta), so add both; otherwise the <select> can't show the
// detected value and the user can't pick UTC.
export const TIMEZONES: string[] = Array.from(new Set(["UTC", ...SUPPORTED, detectTimezone()])).sort((a, b) =>
  a === "UTC" ? -1 : b === "UTC" ? 1 : a.localeCompare(b),
);

export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}
