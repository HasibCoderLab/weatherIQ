/**
 * Location-timezone-aware formatting helpers.
 *
 * WeatherIQ serves data for locations in other timezones, so "hourly" times
 * must be formatted in the *location's* zone — not the viewer's. All helpers
 * here take an IANA timezone identifier and are pure (unit-testable).
 */

function safeZone(timezone: string): string | undefined {
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone }).format(new Date());
    return timezone;
  } catch {
    // Unknown zone identifier — fall back to the viewer's locale.
    return undefined;
  }
}

function formatIn(timezone: string, options: Intl.DateTimeFormatOptions, date: Date): string {
  return new Intl.DateTimeFormat(undefined, { ...options, timeZone: safeZone(timezone) }).format(date);
}

/** "2 PM" / "2:30 PM" style hour label in the location's timezone. */
export function formatHourInZone(iso: string, timezone: string): string {
  return formatIn(timezone, { hour: "numeric", hour12: true }, new Date(iso));
}

/** "9:00 AM" minute-precision label in the location's timezone. */
export function formatClockInZone(iso: string, timezone: string): string {
  return formatIn(timezone, { hour: "numeric", minute: "2-digit", hour12: true }, new Date(iso));
}

/** Weekday name ("Mon", "Tuesday" via `long`) in the location's timezone. */
export function formatWeekdayInZone(iso: string, timezone: string, width: "short" | "long" = "short"): string {
  return formatIn(timezone, { weekday: width }, new Date(iso));
}

/** Short date like "Sep 25" in the location's timezone. */
export function formatDayMonthInZone(iso: string, timezone: string): string {
  return formatIn(timezone, { month: "short", day: "numeric" }, new Date(iso));
}

/** Wall-clock hour (0-23) of an instant in the location's timezone. */
export function hourOfDayInZone(iso: string, timezone: string): number {
  const hour = formatIn(timezone, { hour: "numeric", hourCycle: "h23" }, new Date(iso));
  return Number.parseInt(hour, 10);
}

/** The location's current local date as an ISO date string ("2026-09-25"). */
export function todayInZone(timezone: string, now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: safeZone(timezone),
  }).formatToParts(now);
  const get = (type: string): string =>
    parts.find((p) => p.type === type)?.value ?? "";
  // en-CA yields ISO-ordered parts; assemble explicitly to stay locale-proof.
  return `${get("year")}-${get("month")}-${get("day")}`;
}
