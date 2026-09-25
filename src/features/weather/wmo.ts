import type { WeatherKind } from "@/types/domain";

/**
 * WMO weather interpretation codes (as used by Open-Meteo).
 * Pure mapping — no I/O — so it can be unit-tested exhaustively.
 */

interface WmoInfo {
  kind: WeatherKind;
  label: string;
}

const WMO_CODES: Record<number, WmoInfo> = {
  0: { kind: "clear", label: "Clear sky" },
  1: { kind: "clear", label: "Mainly clear" },
  2: { kind: "partly-cloudy", label: "Partly cloudy" },
  3: { kind: "cloudy", label: "Overcast" },
  45: { kind: "fog", label: "Fog" },
  48: { kind: "fog", label: "Depositing rime fog" },
  51: { kind: "drizzle", label: "Light drizzle" },
  53: { kind: "drizzle", label: "Moderate drizzle" },
  55: { kind: "drizzle", label: "Dense drizzle" },
  56: { kind: "freezing-rain", label: "Light freezing drizzle" },
  57: { kind: "freezing-rain", label: "Dense freezing drizzle" },
  61: { kind: "rain", label: "Slight rain" },
  63: { kind: "rain", label: "Rain" },
  65: { kind: "rain", label: "Heavy rain" },
  66: { kind: "freezing-rain", label: "Light freezing rain" },
  67: { kind: "freezing-rain", label: "Heavy freezing rain" },
  71: { kind: "snow", label: "Slight snowfall" },
  73: { kind: "snow", label: "Snowfall" },
  75: { kind: "snow", label: "Heavy snowfall" },
  77: { kind: "snow", label: "Snow grains" },
  80: { kind: "rain", label: "Slight rain showers" },
  81: { kind: "rain", label: "Rain showers" },
  82: { kind: "rain", label: "Violent rain showers" },
  85: { kind: "snow", label: "Slight snow showers" },
  86: { kind: "snow", label: "Heavy snow showers" },
  95: { kind: "thunderstorm", label: "Thunderstorm" },
  96: { kind: "thunderstorm", label: "Thunderstorm with slight hail" },
  99: { kind: "thunderstorm", label: "Thunderstorm with heavy hail" },
};

const FALLBACK: WmoInfo = { kind: "cloudy", label: "Cloudy" };

/** Map a WMO code to its canonical kind + label. Unknown codes fall back safely. */
export function describeWmoCode(code: number): WmoInfo {
  return WMO_CODES[code] ?? FALLBACK;
}

const RAINY: ReadonlySet<WeatherKind> = new Set(["rain", "drizzle", "thunderstorm", "freezing-rain"]);
const SNOWY: ReadonlySet<WeatherKind> = new Set(["snow"]);

/** Whether this condition kind implies falling precipitation. */
export function isPrecipitating(kind: WeatherKind): boolean {
  return RAINY.has(kind) || SNOWY.has(kind);
}

const ICONS: Record<WeatherKind, { day: string; night: string }> = {
  clear: { day: "wb_sunny", night: "dark_mode" },
  "partly-cloudy": { day: "partly_cloudy_day", night: "nights_stay" },
  cloudy: { day: "cloud", night: "cloud" },
  fog: { day: "foggy", night: "foggy" },
  drizzle: { day: "water_drop", night: "water_drop" },
  rain: { day: "rainy", night: "rainy" },
  "freezing-rain": { day: "ac_unit", night: "ac_unit" },
  snow: { day: "weather_snowy", night: "weather_snowy" },
  thunderstorm: { day: "thunderstorm", night: "thunderstorm" },
};

/** Material Symbols icon name for a condition kind, day/night aware. */
export function weatherIconName(kind: WeatherKind, isDaytime: boolean): string {
  const icons = ICONS[kind];
  return isDaytime ? icons.day : icons.night;
}

/** SVG path fragment for a simple inline weather glyph (used in fallback UI). */
export function isSnowKind(kind: WeatherKind): boolean {
  return SNOWY.has(kind);
}
