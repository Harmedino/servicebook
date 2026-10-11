import { afterEach, describe, expect, it, vi } from "vitest";
import { addDaysToKey, addMonthsToKey, dayOfWeekFromKey, daysInMonth, startOfMonthKey, startOfWeekKey } from "./calendarDates";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("calendar date keys", () => {
  it("knows the day of the week", () => {
    expect(dayOfWeekFromKey("2026-10-11")).toBe(0); // Sunday
    expect(dayOfWeekFromKey("2026-10-12")).toBe(1);
    expect(dayOfWeekFromKey("2024-02-29")).toBe(4);
  });

  it("adds days across months, years and leap days", () => {
    expect(addDaysToKey("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDaysToKey("2025-12-31", 1)).toBe("2026-01-01");
    expect(addDaysToKey("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDaysToKey("2024-02-28", 1)).toBe("2024-02-29");
    expect(addDaysToKey("2026-10-11", 0)).toBe("2026-10-11");
  });

  it("adds days across a clock change that skips midnight", () => {
    // Havana moves its clocks forward at midnight, so 00:00 on 8 March 2026 doesn't exist there.
    vi.stubEnv("TZ", "America/Havana");
    expect(new Date(2026, 2, 8).getHours()).toBe(1);
    expect(addDaysToKey("2026-03-07", 1)).toBe("2026-03-08");
    expect(addDaysToKey("2026-03-08", 1)).toBe("2026-03-09");
    expect(dayOfWeekFromKey("2026-03-08")).toBe(0);
  });

  it("adds months from the first of a month", () => {
    expect(addMonthsToKey("2026-01-01", 1)).toBe("2026-02-01");
    expect(addMonthsToKey("2026-11-01", 2)).toBe("2027-01-01");
    expect(addMonthsToKey("2026-03-01", -3)).toBe("2025-12-01");
  });

  it("finds the Monday that starts the week", () => {
    expect(startOfWeekKey("2026-10-12")).toBe("2026-10-12"); // Monday
    expect(startOfWeekKey("2026-10-14")).toBe("2026-10-12"); // Wednesday
    expect(startOfWeekKey("2026-10-11")).toBe("2026-10-05"); // Sunday ends the week
    expect(startOfWeekKey("2026-11-01")).toBe("2026-10-26");
  });

  it("finds the first of the month and its length", () => {
    expect(startOfMonthKey("2026-10-11")).toBe("2026-10-01");
    expect(daysInMonth("2024-02-10")).toBe(29);
    expect(daysInMonth("2026-02-10")).toBe(28);
    expect(daysInMonth("2026-04-30")).toBe(30);
    expect(daysInMonth("2026-12-01")).toBe(31);
  });
});
