import type {
  AirQuality,
  Astronomy,
  CurrentWeather,
  DailyPoint,
  GeoLocation,
  GeoPoint,
  HourlyPoint,
  WeatherBundle,
  WeatherCondition,
} from "@/types/domain";
import {
  airQualityResponseSchema,
  astronomyResponseSchema,
  forecastResponseSchema,
  geocodingResponseSchema,
} from "./schemas";
import { describeWmoCode } from "./wmo";

/**
 * Open-Meteo weather provider.
 *
 * Runs server-side only (route handlers import this module; the browser never
 * talks to the provider directly). Every response is validated with Zod and
 * mapped to the domain types — the rest of the app never sees provider shapes.
 */

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const REVERSE_URL = "https://api.bigdatacloud.net/data/reverse-geocode-client";
const AIR_QUALITY_URL = "https://air-quality-api.open-meteo.com/v1/air-quality";

const TIMEOUT_MS = 10_000;

export class ProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProviderError";
  }
}

/** fetch with a hard timeout; single attempt, no silent retries. */
async function fetchJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      // Provider data is public; cache it at the platform edge too.
      next: { revalidate: 600 },
    });
    if (!response.ok) {
      throw new ProviderError(`Weather provider responded with status ${response.status}`);
    }
    return (await response.json()) as unknown;
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new ProviderError("Weather provider request timed out");
    }
    throw new ProviderError("Could not reach the weather provider");
  } finally {
    clearTimeout(timer);
  }
}

function requireArray(value: unknown, field: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new ProviderError(`Provider response is missing ${field}`);
  }
  return value;
}

function numberAt(values: unknown, index: number): number | null {
  if (!Array.isArray(values)) return null;
  const raw = values[index];
  return typeof raw === "number" && Number.isFinite(raw) ? raw : null;
}

function stringAt(values: unknown, index: number): string | null {
  if (!Array.isArray(values)) return null;
  const raw = values[index];
  return typeof raw === "string" && raw.length > 0 ? raw : null;
}

function conditionFromCode(code: number | null, isDaytime: boolean): WeatherCondition {
  const info = describeWmoCode(code ?? 3);
  return { kind: info.kind, label: info.label, code: code ?? 3, isDaytime };
}

function mapCurrent(raw: unknown): CurrentWeather | null {
  if (!raw || typeof raw !== "object") return null;
  const c = raw as {
    temperature_2m?: unknown;
    apparent_temperature?: unknown;
    relative_humidity_2m?: unknown;
    is_day?: unknown;
    precipitation?: unknown;
    weather_code?: unknown;
    cloud_cover?: unknown;
    pressure_msl?: unknown;
    wind_speed_10m?: unknown;
    wind_direction_10m?: unknown;
    wind_gusts_10m?: unknown;
    dew_point_2m?: unknown;
  };
  const temperature = typeof c.temperature_2m === "number" ? c.temperature_2m : null;
  if (temperature == null) return null;
  const weatherCode = typeof c.weather_code === "number" ? c.weather_code : null;
  return {
    temperature,
    apparentTemperature:
      typeof c.apparent_temperature === "number" ? c.apparent_temperature : temperature,
    condition: conditionFromCode(weatherCode, c.is_day === 1),
    humidity: typeof c.relative_humidity_2m === "number" ? c.relative_humidity_2m : 0,
    windSpeed: typeof c.wind_speed_10m === "number" ? c.wind_speed_10m : 0,
    windDirection: typeof c.wind_direction_10m === "number" ? c.wind_direction_10m : 0,
    windGust: typeof c.wind_gusts_10m === "number" ? c.wind_gusts_10m : null,
    pressure: typeof c.pressure_msl === "number" ? c.pressure_msl : 1013,
    precipitation: typeof c.precipitation === "number" ? c.precipitation : 0,
    cloudCover: typeof c.cloud_cover === "number" ? c.cloud_cover : 0,
    visibility: null,
    uvIndex: null,
    dewPoint: typeof c.dew_point_2m === "number" ? c.dew_point_2m : null,
  };
}

function mapHourly(raw: unknown): HourlyPoint[] {
  if (!raw || typeof raw !== "object") return [];
  const h = raw as Record<string, unknown>;
  const times = requireArray(h.time, "hourly.time");
  const out: HourlyPoint[] = [];
  for (let i = 0; i < times.length; i += 1) {
    const time = times[i];
    if (typeof time !== "string") continue;
    const temp = numberAt(h.temperature_2m, i);
    if (temp == null) continue;
    const isDaytime = numberAt(h.is_day, i) === 1;
    out.push({
      time,
      temperature: temp,
      apparentTemperature: numberAt(h.apparent_temperature, i) ?? temp,
      condition: conditionFromCode(numberAt(h.weather_code, i), isDaytime),
      precipitationProbability: numberAt(h.precipitation_probability, i),
      precipitation: numberAt(h.precipitation, i) ?? 0,
      windSpeed: numberAt(h.wind_speed_10m, i) ?? 0,
      windGust: numberAt(h.wind_gusts_10m, i),
      humidity: numberAt(h.relative_humidity_2m, i) ?? 0,
      uvIndex: numberAt(h.uv_index, i),
      isDaytime,
    });
  }
  return out;
}

function mapDaily(raw: unknown, fallbackHumidity: number): DailyPoint[] {
  if (!raw || typeof raw !== "object") return [];
  const d = raw as Record<string, unknown>;
  const times = requireArray(d.time, "daily.time");
  const out: DailyPoint[] = [];
  for (let i = 0; i < times.length; i += 1) {
    const time = times[i];
    if (typeof time !== "string") continue;
    const max = numberAt(d.temperature_2m_max, i);
    const min = numberAt(d.temperature_2m_min, i);
    if (max == null || min == null) continue;
    const sunrise = stringAt(d.sunrise, i) ?? "";
    const sunset = stringAt(d.sunset, i) ?? "";
    out.push({
      date: time,
      condition: conditionFromCode(numberAt(d.weather_code, i), true),
      tempMax: max,
      tempMin: min,
      precipitationProbability: numberAt(d.precipitation_probability_max, i),
      precipitationSum: numberAt(d.precipitation_sum, i) ?? 0,
      windMax: numberAt(d.wind_speed_10m_max, i) ?? 0,
      windGustMax: numberAt(d.wind_gusts_10m_max, i),
      humidityMean: numberAt(d.relative_humidity_2m_mean, i) ?? fallbackHumidity,
      uvIndexMax: numberAt(d.uv_index_max, i),
      sunrise,
      sunset,
      daylightDuration: numberAt(d.daylight_duration, i),
    });
  }
  return out;
}

function mapAirQuality(raw: unknown): AirQuality | null {
  const parsed = airQualityResponseSchema.safeParse(raw);
  if (!parsed.success) return null;
  const current = parsed.data.current;
  if (!current) return null;
  const aqi = current.european_aqi;
  if (typeof aqi !== "number") return null;
  return {
    aqi,
    pm10: current.pm10 ?? null,
    pm2_5: current.pm2_5 ?? null,
    carbonMonoxide: current.carbon_monoxide ?? null,
    nitrogenDioxide: current.nitrogen_dioxide ?? null,
    ozone: current.ozone ?? null,
    sulphurDioxide: current.sulphur_dioxide ?? null,
    ammonia: current.ammonia ?? null,
  };
}

function mapAstronomy(raw: unknown): Astronomy | null {
  const parsed = astronomyResponseSchema.safeParse(raw);
  if (!parsed.success) return null;
  const daily = parsed.data.daily;
  if (!daily || daily.time.length === 0) return null;
  const sunrise = daily.sunrise[0] ?? "";
  const sunset = daily.sunset[0] ?? "";
  if (!sunrise || !sunset) return null;
  return {
    sunrise,
    sunset,
    daylightDuration: daily.daylight_duration[0] ?? 0,
    moonPhase: daily.moon_phase[0] ?? 0,
    moonRise: daily.moonrise[0] ?? null,
    moonSet: daily.moonset[0] ?? null,
  };
}

/** Provider interface — swap this implementation to change providers. */
export interface WeatherProvider {
  getBundle(location: GeoLocation): Promise<WeatherBundle>;
  searchLocations(query: string, count?: number): Promise<GeoLocation[]>;
}

export class OpenMeteoProvider implements WeatherProvider {
  async getBundle(location: GeoLocation): Promise<WeatherBundle> {
    const coords = {
      latitude: location.latitude.toFixed(4),
      longitude: location.longitude.toFixed(4),
    };
    const params = new URLSearchParams({
      ...coords,
      current:
        "temperature_2m,apparent_temperature,relative_humidity_2m,is_day,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m,dew_point_2m",
      hourly:
        "temperature_2m,apparent_temperature,weather_code,precipitation_probability,precipitation,wind_speed_10m,wind_gusts_10m,relative_humidity_2m,uv_index,is_day",
      daily:
        "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max,wind_gusts_10m_max,relative_humidity_2m_mean,uv_index_max,sunrise,sunset,daylight_duration",
      timezone: "auto",
      forecast_days: "7",
      wind_speed_unit: "kmh",
    });

    const raw = await fetchJson(`${FORECAST_URL}?${params.toString()}`);
    const parsed = forecastResponseSchema.safeParse(raw);
    if (!parsed.success) {
      throw new ProviderError("Weather provider returned unexpected data");
    }
    const data = parsed.data;

    const current = mapCurrent(data.current);
    if (!current) {
      throw new ProviderError("Weather provider returned no current conditions");
    }

    const hourly = mapHourly(data.hourly);
    if (hourly.length === 0) {
      throw new ProviderError("Weather provider returned no hourly forecast");
    }

    const daily = mapDaily(data.daily, current.humidity);

    // Air quality + astronomy are best-effort: never fail the bundle for them.
    const aqiParams = new URLSearchParams({
      ...coords,
      current:
        "european_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,ozone,sulphur_dioxide,ammonia",
      timezone: "auto",
    });
    const astroParams = new URLSearchParams({
      ...coords,
      daily: "sunrise,sunset,daylight_duration,moonrise,moonset,moon_phase",
      timezone: "auto",
      forecast_days: "1",
    });

    const [airQualityResult, astronomyResult] = await Promise.allSettled([
      fetchJson(`${AIR_QUALITY_URL}?${aqiParams.toString()}`),
      fetchJson(`${FORECAST_URL}?${astroParams.toString()}`),
    ]);

    return {
      location,
      fetchedAt: new Date().toISOString(),
      current,
      hourly,
      daily,
      airQuality:
        airQualityResult.status === "fulfilled" ? mapAirQuality(airQualityResult.value) : null,
      astronomy:
        astronomyResult.status === "fulfilled" ? mapAstronomy(astronomyResult.value) : null,
    };
  }

  async searchLocations(query: string, count = 8): Promise<GeoLocation[]> {
    const params = new URLSearchParams({
      name: query,
      count: String(count),
      language: "en",
      format: "json",
    });
    const raw = await fetchJson(`${GEOCODING_URL}?${params.toString()}`);
    const parsed = geocodingResponseSchema.safeParse(raw);
    if (!parsed.success) return [];
    const results = parsed.data.results ?? [];
    return results.map((r) => ({
      name: r.name,
      country: r.country ?? "",
      countryCode: (r.country_code ?? "").toUpperCase(),
      admin1: r.admin1 ?? null,
      latitude: r.latitude,
      longitude: r.longitude,
      timezone: r.timezone ?? "auto",
    }));
  }
}

/**
 * Reverse geocoding via BigDataCloud's free client endpoint
 * (no key required, CORS-safe, used only server-side here).
 */
export async function reverseGeocode(point: GeoPoint): Promise<GeoLocation | null> {
  const params = new URLSearchParams({
    latitude: point.latitude.toFixed(4),
    longitude: point.longitude.toFixed(4),
    localityLanguage: "en",
  });
  try {
    const raw = await fetchJson(`${REVERSE_URL}?${params.toString()}`);
    if (!raw || typeof raw !== "object") return null;
    const data = raw as {
      cityName?: string;
      locality?: string;
      principalSubdivision?: string;
      countryName?: string;
      countryCode?: string;
    };
    const name = data.cityName || data.locality || data.principalSubdivision;
    if (!name) return null;
    return {
      name,
      country: data.countryName ?? "",
      countryCode: (data.countryCode ?? "").toUpperCase(),
      admin1: data.principalSubdivision ?? null,
      latitude: point.latitude,
      longitude: point.longitude,
      timezone: "auto",
    } satisfies GeoLocation;
  } catch {
    return null;
  }
}
