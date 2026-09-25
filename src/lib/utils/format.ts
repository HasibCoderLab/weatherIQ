/**
 * Pure formatting utilities shared across features.
 * No I/O, no React — fully unit-testable.
 */

export type TemperatureUnit = "celsius" | "fahrenheit";

export function celsiusToFahrenheit(celsius: number): number {
  return (celsius * 9) / 5 + 32;
}

export function formatTemperature(celsius: number, unit: TemperatureUnit = "celsius"): number {
  return unit === "fahrenheit" ? Math.round(celsiusToFahrenheit(celsius)) : Math.round(celsius);
}

export function formatTemperatureLabel(celsius: number, unit: TemperatureUnit = "celsius"): string {
  return `${formatTemperature(celsius, unit)}°`;
}

/** Open-Meteo returns wind in km/h by default. */
export function formatWindSpeed(kmh: number): string {
  if (kmh < 10) return kmh.toFixed(1);
  return Math.round(kmh).toString();
}

export function formatWindDirection(degrees: number): string {
  const normalized = ((degrees % 360) + 360) % 360;
  const sectors = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;
  const index = Math.round(normalized / 45) % 8;
  const sector = sectors[index];
  return sector ?? "N";
}

export function formatPrecipitation(mm: number): string {
  if (mm < 1) return "<1 mm";
  if (mm < 10) return `${Math.round(mm)} mm`;
  return `${Math.round(mm)} mm`;
}

export function formatVisibility(meters: number | null): string {
  if (meters == null) return "--";
  const km = meters / 1000;
  if (km >= 10) return `${Math.round(km)} km`;
  return `${km.toFixed(1)} km`;
}

export function formatPercentage(value: number | null): string {
  if (value == null) return "--";
  return `${Math.round(value)}%`;
}

export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds / 60));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

/** "14:05" local-time label from an ISO timestamp string. */
export function formatHourLabel(iso: string): string {
  const date = new Date(iso);
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", hour12: true }).format(date);
}

/** Relative time like "12 minutes ago" for data-freshness communication. */
export function formatTimeAgo(iso: string, now: Date = new Date()): string {
  const diffSeconds = Math.floor((now.getTime() - new Date(iso).getTime()) / 1000);
  if (diffSeconds < 45) return "just now";
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  return `${Math.floor(diffHours / 24)} day${diffHours < 48 ? "" : "s"} ago`;
}

/** Clamp helper used by scoring functions. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
