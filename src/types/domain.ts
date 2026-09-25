/**
 * Domain types for WeatherIQ.
 *
 * All external weather data enters the app through the provider layer and is
 * validated with Zod (see src/features/weather/schemas.ts) before it is cast
 * to these domain types. UI components must only depend on these types, never
 * on a provider's raw response shape.
 */

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface GeoLocation {
  /** Display name, e.g. "London" */
  name: string;
  /** Country name, e.g. "United Kingdom" */
  country: string;
  /** ISO 3166 country code, e.g. "GB" */
  countryCode: string;
  /** Administrative region, e.g. "England" */
  admin1: string | null;
  latitude: number;
  longitude: number;
  /** Timezone identifier, e.g. "Europe/London" */
  timezone: string;
}

/** WMO weather interpretation code categories used for icon/mapping. */
export type WeatherKind =
  | "clear"
  | "partly-cloudy"
  | "cloudy"
  | "fog"
  | "drizzle"
  | "rain"
  | "freezing-rain"
  | "snow"
  | "thunderstorm";

export type PrecipKind = "none" | "rain" | "snow" | "freezing-rain";

export interface WeatherCondition {
  kind: WeatherKind;
  /** Human-readable summary, e.g. "Partly cloudy" */
  label: string;
  code: number;
  isDaytime: boolean;
}

export interface CurrentWeather {
  temperature: number;
  apparentTemperature: number;
  condition: WeatherCondition;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  windGust: number | null;
  pressure: number;
  precipitation: number;
  cloudCover: number;
  visibility: number | null;
  uvIndex: number | null;
  dewPoint: number | null;
}

export interface HourlyPoint {
  /** ISO timestamp */
  time: string;
  temperature: number;
  apparentTemperature: number;
  condition: WeatherCondition;
  precipitationProbability: number | null;
  precipitation: number;
  windSpeed: number;
  windGust: number | null;
  humidity: number;
  uvIndex: number | null;
  isDaytime: boolean;
}

export interface DailyPoint {
  /** ISO date */
  date: string;
  condition: WeatherCondition;
  tempMin: number;
  tempMax: number;
  precipitationProbability: number | null;
  precipitationSum: number;
  windMax: number;
  windGustMax: number | null;
  humidityMean: number | null;
  uvIndexMax: number | null;
  sunrise: string;
  sunset: string;
  daylightDuration: number | null;
}

export interface AirQuality {
  /** European AQI, 0-500 scale as returned by Open-Meteo */
  aqi: number;
  pm10: number | null;
  pm2_5: number | null;
  carbonMonoxide: number | null;
  nitrogenDioxide: number | null;
  ozone: number | null;
  sulphurDioxide: number | null;
  ammonia: number | null;
}

export interface Astronomy {
  sunrise: string;
  sunset: string;
  daylightDuration: number;
  moonPhase: number;
  moonRise: string | null;
  moonSet: string | null;
}

export interface WeatherBundle {
  location: GeoLocation;
  /** ISO timestamp when this bundle was fetched */
  fetchedAt: string;
  current: CurrentWeather;
  hourly: HourlyPoint[];
  daily: DailyPoint[];
  airQuality: AirQuality | null;
  astronomy: Astronomy | null;
}

export type Severity = "info" | "moderate" | "high" | "severe";

export interface WeatherInsight {
  id: string;
  message: string;
  severity: Severity;
  /** Source category — the product must never blur these. */
  source: "observed" | "forecast" | "calculated" | "recommendation";
}

export type ActivityId =
  | "running"
  | "cycling"
  | "walking"
  | "hiking"
  | "picnic"
  | "photography"
  | "cricket"
  | "football"
  | "outdoor-work";

export interface ActivityWindow {
  start: string;
  end: string;
  score: number;
}

export interface ActivityAssessment {
  activity: ActivityId;
  score: number;
  summary: string;
  bestWindow: ActivityWindow | null;
  factors: Array<{ label: string; detail: string; penalty: number }>;
}
