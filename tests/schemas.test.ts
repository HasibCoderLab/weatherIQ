import { describe, expect, it } from "vitest";
import {
  airQualityResponseSchema,
  astronomyResponseSchema,
  forecastResponseSchema,
  geocodingResponseSchema,
} from "@/features/weather/schemas";

describe("geocodingResponseSchema", () => {
  it("accepts Open-Meteo's wrapped `results` shape", () => {
    const parsed = geocodingResponseSchema.safeParse({
      results: [
        { id: 1850147, name: "Tokyo", latitude: 35.6895, longitude: 139.6917, country: "Japan", country_code: "JP" },
      ],
      generationtime_ms: 0.8,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.results).toHaveLength(1);
  });

  it("accepts an empty/absent results list (no matches)", () => {
    expect(geocodingResponseSchema.safeParse({ generationtime_ms: 0.1 }).success).toBe(true);
    expect(geocodingResponseSchema.safeParse({ results: null }).success).toBe(true);
  });

  it("rejects a bare array (the shape the API never returns)", () => {
    expect(geocodingResponseSchema.safeParse([{ name: "Tokyo" }]).success).toBe(false);
  });
});

describe("forecastResponseSchema", () => {
  const valid = {
    timezone: "Europe/London",
    utc_offset_seconds: 3600,
    current: {
      time: "2026-09-25T12:00",
      temperature_2m: 18.2,
      apparent_temperature: 17.5,
      relative_humidity_2m: 62,
      is_day: 1,
      precipitation: 0,
      weather_code: 2,
      cloud_cover: 40,
      pressure_msl: 1014.2,
      wind_speed_10m: 9.7,
      wind_direction_10m: 220,
      wind_gusts_10m: null,
      dew_point_2m: null,
    },
    hourly: {
      time: ["2026-09-25T13:00"],
      temperature_2m: [18.0],
      apparent_temperature: [17.2],
      weather_code: [2],
      precipitation_probability: [12],
      precipitation: [0],
      wind_speed_10m: [10.4],
      wind_gusts_10m: [22.1],
      relative_humidity_2m: [58],
      uv_index: [3.4],
      is_day: [1],
      visibility: [24140],
    },
    daily: {
      time: ["2026-09-25"],
      weather_code: [2],
      temperature_2m_max: [21.5],
      temperature_2m_min: [12.3],
      precipitation_probability_max: [18],
      precipitation_sum: [0.2],
      wind_speed_10m_max: [16.1],
      wind_gusts_10m_max: [31.0],
      relative_humidity_2m_mean: [64],
      uv_index_max: [4.2],
      sunrise: ["2026-09-25T06:51"],
      sunset: ["2026-09-25T18:59"],
      daylight_duration: [43288.1],
    },
  };

  it("accepts a realistic forecast payload", () => {
    expect(forecastResponseSchema.safeParse(valid).success).toBe(true);
  });

  it("tolerates missing optional blocks", () => {
    expect(forecastResponseSchema.safeParse({ timezone: "UTC", utc_offset_seconds: 0 }).success).toBe(true);
  });

  it("rejects payloads without timezone", () => {
    expect(forecastResponseSchema.safeParse({}).success).toBe(false);
  });
});

describe("airQualityResponseSchema", () => {
  it("accepts a realistic air-quality payload", () => {
    const payload = { current: { european_aqi: 38.4, pm2_5: 7.2, pm10: 12.9 } };
    expect(airQualityResponseSchema.safeParse(payload).success).toBe(true);
  });

  it("tolerates an absent current block", () => {
    expect(airQualityResponseSchema.safeParse({}).success).toBe(true);
  });
});

describe("astronomyResponseSchema", () => {
  it("accepts a realistic astronomy payload", () => {
    const payload = {
      daily: {
        time: ["2026-09-25"],
        sunrise: ["2026-09-25T06:51"],
        sunset: ["2026-09-25T18:59"],
        daylight_duration: [43200.5],
        moonrise: ["2026-09-25T21:14"],
        moonset: ["2026-09-25T11:03"],
        moon_phase: [0.62],
      },
    };
    expect(astronomyResponseSchema.safeParse(payload).success).toBe(true);
  });
});
