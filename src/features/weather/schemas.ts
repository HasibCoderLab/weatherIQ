import { z } from "zod";

/**
 * Zod schemas validating Open-Meteo's response shapes at runtime.
 * No external payload enters domain logic without passing these.
 *
 * Note: Open-Meteo returns arrays aligned to the requested `hourly.time`
 * etc. Optional fields are modeled as `(number | null)` and then mapped.
 */

/** A geocoding result from Open-Meteo's geocoding API. */
export const geocodingResultSchema = z.object({
  id: z.number(),
  name: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  country: z.string().nullish(),
  country_code: z.string().nullish(),
  admin1: z.string().nullish(),
  timezone: z.string().nullish(),
});

/**
 * Open-Meteo's geocoding endpoint wraps matches in a `results` key (absent or
 * null when there are no matches) — it does NOT return a bare array.
 */
export const geocodingResponseSchema = z.object({
  results: z.array(geocodingResultSchema).nullish(),
  generationtime_ms: z.number().nullish(),
});

const forecastBase = {
  timezone: z.string(),
  utc_offset_seconds: z.number(),
};

export const forecastResponseSchema = z.object({
  ...forecastBase,
  current: z
    .object({
      time: z.string(),
      temperature_2m: z.number(),
      apparent_temperature: z.number(),
      relative_humidity_2m: z.number(),
      is_day: z.number(),
      precipitation: z.number(),
      weather_code: z.number(),
      cloud_cover: z.number(),
      pressure_msl: z.number(),
      wind_speed_10m: z.number(),
      wind_direction_10m: z.number(),
      wind_gusts_10m: z.number().nullish(),
      dew_point_2m: z.number().nullish(),
    })
    .nullish(),
  hourly: z
    .object({
      time: z.array(z.string()),
      temperature_2m: z.array(z.number().nullish()),
      apparent_temperature: z.array(z.number().nullish()),
      weather_code: z.array(z.number().nullish()),
      precipitation_probability: z.array(z.number().nullish()),
      precipitation: z.array(z.number().nullish()),
      wind_speed_10m: z.array(z.number().nullish()),
      wind_gusts_10m: z.array(z.number().nullish()),
      relative_humidity_2m: z.array(z.number().nullish()),
      uv_index: z.array(z.number().nullish()),
      is_day: z.array(z.number().nullish()),
      // Not currently requested from the provider — must stay optional.
      visibility: z.array(z.number().nullish()).nullish(),
    })
    .nullish(),
  daily: z
    .object({
      time: z.array(z.string()),
      weather_code: z.array(z.number().nullish()),
      temperature_2m_max: z.array(z.number().nullish()),
      temperature_2m_min: z.array(z.number().nullish()),
      precipitation_probability_max: z.array(z.number().nullish()),
      precipitation_sum: z.array(z.number().nullish()),
      wind_speed_10m_max: z.array(z.number().nullish()),
      wind_gusts_10m_max: z.array(z.number().nullish()),
      relative_humidity_2m_mean: z.array(z.number().nullish()),
      uv_index_max: z.array(z.number().nullish()),
      sunrise: z.array(z.string()),
      sunset: z.array(z.string()),
      daylight_duration: z.array(z.number().nullish()),
    })
    .nullish(),
});

export const airQualityResponseSchema = z.object({
  current: z
    .object({
      european_aqi: z.number().nullish(),
      pm10: z.number().nullish(),
      pm2_5: z.number().nullish(),
      carbon_monoxide: z.number().nullish(),
      nitrogen_dioxide: z.number().nullish(),
      ozone: z.number().nullish(),
      sulphur_dioxide: z.number().nullish(),
      ammonia: z.number().nullish(),
    })
    .nullish(),
});

export const astronomyResponseSchema = z.object({
  daily: z
    .object({
      time: z.array(z.string()),
      sunrise: z.array(z.string()),
      sunset: z.array(z.string()),
      daylight_duration: z.array(z.number().nullish()),
      moonrise: z.array(z.string().nullish()),
      moonset: z.array(z.string().nullish()),
      moon_phase: z.array(z.number().nullish()),
    })
    .nullish(),
});
