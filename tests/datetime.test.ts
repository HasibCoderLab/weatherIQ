import { describe, expect, it } from "vitest";
import {
  formatClockInZone,
  formatDayMonthInZone,
  formatHourInZone,
  formatWeekdayInZone,
  hourOfDayInZone,
  todayInZone,
} from "@/lib/utils/datetime";

describe("timezone-aware formatting", () => {
  // 2026-09-25T00:30:00Z is 09:30 in Tokyo (UTC+9) and 01:30 in London (BST).
  const instant = "2026-09-25T00:30:00Z";

  it("formats the hour in the location's zone", () => {
    expect(formatHourInZone(instant, "Asia/Tokyo")).toMatch(/9/);
    expect(formatHourInZone(instant, "Europe/London")).toMatch(/1/);
  });

  it("formats minute-precision clocks", () => {
    expect(formatClockInZone(instant, "Asia/Tokyo")).toMatch(/9:30/);
  });

  it("formats the weekday in the location's zone", () => {
    // 2026-09-25 is a Friday.
    expect(formatWeekdayInZone(instant, "Europe/London")).toBe("Fri");
    expect(formatWeekdayInZone(instant, "Europe/London", "long")).toBe("Friday");
    // In Tokyo it is already 09:30 Friday; check a zone where it's still Thursday:
    // 2026-09-25T00:30:00Z is 2026-09-24T20:30 in New York (EDT, UTC-4).
    expect(formatWeekdayInZone(instant, "America/New_York")).toBe("Thu");
  });

  it("formats day+month labels", () => {
    expect(formatDayMonthInZone(instant, "Europe/London")).toBe("Sep 25");
  });

  it("computes the wall-clock hour in the location's zone", () => {
    expect(hourOfDayInZone(instant, "Asia/Tokyo")).toBe(9);
    expect(hourOfDayInZone(instant, "America/New_York")).toBe(20);
    expect(hourOfDayInZone("2026-09-25T23:30:00Z", "Europe/London")).toBe(0);
  });

  it("computes today's date in the location's zone", () => {
    expect(todayInZone("Europe/London", new Date(instant))).toBe("2026-09-25");
    expect(todayInZone("America/New_York", new Date(instant))).toBe("2026-09-24");
  });

  it("falls back safely for an unknown timezone", () => {
    expect(() => formatHourInZone(instant, "Not/AZone")).not.toThrow();
  });
});
