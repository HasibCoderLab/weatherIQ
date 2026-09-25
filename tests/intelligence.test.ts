import { describe, expect, it } from "vitest";
import {
  assessActivity,
  findBestOutdoorWindow,
  generateInsights,
  outdoorScoreForHour,
  umbrellaRecommendation,
} from "@/features/weather/intelligence";
import type { HourlyPoint, WeatherBundle } from "@/types/domain";

/** Build a bundle with controlled hourly data for testing the engine. */
function makeBundle(hours: Array<Partial<HourlyPoint>>): WeatherBundle {
  const hourly: HourlyPoint[] = hours.map((h, i) => {
    const time = h.time ?? new Date(Date.UTC(2026, 8, 25, 6 + i)).toISOString();
    const temperature = h.temperature ?? 20;
    return {
      time,
      temperature,
      apparentTemperature: h.apparentTemperature ?? temperature,
      condition: h.condition ?? { kind: "clear", label: "Clear sky", code: 0, isDaytime: true },
      precipitationProbability: h.precipitationProbability ?? 0,
      precipitation: h.precipitation ?? 0,
      windSpeed: h.windSpeed ?? 5,
      windGust: h.windGust ?? null,
      humidity: h.humidity ?? 50,
      uvIndex: h.uvIndex ?? 3,
      isDaytime: h.isDaytime ?? true,
    };
  });

  return {
    location: {
      name: "Testville",
      country: "Testland",
      countryCode: "TS",
      admin1: null,
      latitude: 0,
      longitude: 0,
      timezone: "UTC",
    },
    fetchedAt: new Date().toISOString(),
    current: {
      temperature: hourly[0]!.temperature,
      apparentTemperature: hourly[0]!.apparentTemperature,
      condition: hourly[0]!.condition,
      humidity: hourly[0]!.humidity,
      windSpeed: hourly[0]!.windSpeed,
      windDirection: 0,
      windGust: null,
      pressure: 1013,
      precipitation: 0,
      cloudCover: 0,
      visibility: null,
      uvIndex: hourly[0]!.uvIndex,
      dewPoint: null,
    },
    hourly,
    daily: [
      {
        date: "2026-09-25",
        condition: { kind: "clear", label: "Clear sky", code: 0, isDaytime: true },
        tempMin: Math.min(...hourly.map((h) => h.temperature)),
        tempMax: Math.max(...hourly.map((h) => h.temperature)),
        precipitationProbability: 10,
        precipitationSum: 0,
        windMax: 10,
        windGustMax: null,
        humidityMean: 50,
        uvIndexMax: 4,
        sunrise: "2026-09-25T06:30:00Z",
        sunset: "2026-09-25T18:30:00Z",
        daylightDuration: 43_200,
      },
    ],
    airQuality: null,
    astronomy: null,
  };
}

// Hours "now" so the engine's 24h filter doesn't drop them: timestamps are
// generated relative to the test run.
function hoursFromNow(count: number, overrides: Array<Partial<HourlyPoint>> = []): WeatherBundle {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  const hours = Array.from({ length: count }, (_, i) => ({
    time: new Date(start.getTime() + i * 3_600_000).toISOString(),
    ...(overrides[i] ?? {}),
  }));
  return makeBundle(hours);
}

describe("outdoorScoreForHour", () => {
  it("scores ideal conditions near 100", () => {
    const bundle = hoursFromNow(1, [{ temperature: 22, windSpeed: 8, uvIndex: 3 }]);
    const result = outdoorScoreForHour(bundle.hourly[0]!);
    expect(result.score).toBeGreaterThanOrEqual(95);
    expect(result.label).toBe("Excellent");
    expect(result.factors).toHaveLength(0);
  });

  it("penalizes extreme heat with an explainable factor", () => {
    const bundle = hoursFromNow(1, [{ temperature: 38 }]);
    const result = outdoorScoreForHour(bundle.hourly[0]!);
    expect(result.score).toBeLessThan(80);
    expect(result.factors.some((f) => f.label === "Extreme heat")).toBe(true);
  });

  it("penalizes high rain probability", () => {
    const bundle = hoursFromNow(1, [{ precipitationProbability: 80 }]);
    const result = outdoorScoreForHour(bundle.hourly[0]!);
    expect(result.factors.some((f) => f.label === "High rain risk")).toBe(true);
    expect(result.score).toBeLessThanOrEqual(65);
  });

  it("penalizes strong wind and very high UV together", () => {
    const bundle = hoursFromNow(1, [{ windSpeed: 50, uvIndex: 9 }]);
    const result = outdoorScoreForHour(bundle.hourly[0]!);
    expect(result.factors.map((f) => f.label)).toContain("Strong wind");
    expect(result.factors.map((f) => f.label)).toContain("Very high UV");
    expect(result.score).toBeLessThan(60);
  });

  it("never returns scores outside 0-100", () => {
    const bundle = hoursFromNow(1, [{ temperature: -20, windSpeed: 80, uvIndex: 12, precipitationProbability: 100, precipitation: 5 }]);
    expect(outdoorScoreForHour(bundle.hourly[0]!).score).toBeGreaterThanOrEqual(0);
  });
});

describe("findBestOutdoorWindow", () => {
  it("finds the calm window between storm hours", () => {
    const overrides: Array<Partial<HourlyPoint>> = [
      { precipitationProbability: 90 },
      { precipitationProbability: 90 },
      { precipitationProbability: 10, temperature: 22 },
      { precipitationProbability: 10, temperature: 23 },
      { precipitationProbability: 10, temperature: 22 },
      { precipitationProbability: 10, temperature: 22 },
      { precipitationProbability: 95 },
      { precipitationProbability: 95 },
    ];
    const bundle = hoursFromNow(8, overrides);
    const window = findBestOutdoorWindow(bundle.hourly);
    expect(window).not.toBeNull();
    expect(window!.averageScore).toBeGreaterThan(70);
    // Window must start at/after the first calm hour.
    expect(new Date(window!.start).getTime()).toBeGreaterThanOrEqual(
      new Date(bundle.hourly[2]!.time).getTime(),
    );
    expect(new Date(window!.end).getTime()).toBeLessThan(
      new Date(bundle.hourly[6]!.time).getTime(),
    );
  });

  it("respects the window length (start + size - 1 = end)", () => {
    const bundle = hoursFromNow(5, Array.from({ length: 5 }, () => ({ temperature: 21 })));
    const window = findBestOutdoorWindow(bundle.hourly, 2, 3);
    expect(window).not.toBeNull();
    const spanHours = (new Date(window!.end).getTime() - new Date(window!.start).getTime()) / 3_600_000;
    expect(spanHours).toBeGreaterThanOrEqual(1);
    expect(spanHours).toBeLessThanOrEqual(2);
  });

  it("returns null when no decent window exists", () => {
    const bundle = hoursFromNow(
      4,
      Array.from({ length: 4 }, () => ({ precipitationProbability: 95, temperature: 38, windSpeed: 60 })),
    );
    expect(findBestOutdoorWindow(bundle.hourly)).toBeNull();
  });

  it("returns null for too-few hours", () => {
    const bundle = hoursFromNow(1);
    expect(findBestOutdoorWindow(bundle.hourly, 2, 5)).toBeNull();
  });
});

describe("generateInsights", () => {
  it("warns about imminent rain with forecast sourcing", () => {
    const bundle = hoursFromNow(6, [
      { precipitationProbability: 10 },
      { precipitationProbability: 20 },
      { precipitationProbability: 85 },
      { precipitationProbability: 85 },
      { precipitationProbability: 70 },
      { precipitationProbability: 60 },
    ]);
    const insights = generateInsights(bundle);
    const rain = insights.find((i) => i.id === "rain-onset");
    expect(rain).toBeDefined();
    expect(rain!.source).toBe("forecast");
    expect(rain!.message).toMatch(/rain/i);
  });

  it("flags high UV days", () => {
    const bundle = hoursFromNow(4);
    bundle.daily[0]!.uvIndexMax = 9;
    const insights = generateInsights(bundle);
    const uv = insights.find((i) => i.id === "uv-high");
    expect(uv).toBeDefined();
    expect(uv!.severity).toBe("high");
    expect(uv!.message).toMatch(/UV/);
  });

  it("always includes a best-window or no-window recommendation", () => {
    const good = generateInsights(hoursFromNow(6, [{ temperature: 21 }]));
    expect(good.some((i) => i.id === "best-window" || i.id === "no-good-window")).toBe(true);
    expect(good.find((i) => i.id === "best-window")!.source).toBe("recommendation");

    const bad = generateInsights(
      hoursFromNow(6, Array.from({ length: 6 }, () => ({ temperature: 40, precipitationProbability: 90 }))),
    );
    expect(bad.some((i) => i.id === "no-good-window")).toBe(true);
  });

  it("notes large temperature swings as calculated", () => {
    const bundle = hoursFromNow(4);
    bundle.daily[0]!.tempMin = 5;
    bundle.daily[0]!.tempMax = 24;
    const insights = generateInsights(bundle);
    const swing = insights.find((i) => i.id === "temp-swing");
    expect(swing).toBeDefined();
    expect(swing!.source).toBe("calculated");
  });
});

describe("umbrellaRecommendation", () => {
  it("recommends an umbrella when rain probability is high", () => {
    const bundle = hoursFromNow(12, [{ precipitationProbability: 75 }]);
    const result = umbrellaRecommendation(bundle);
    expect(result.recommended).toBe(true);
    expect(result.reason).toMatch(/75%/);
  });

  it("does not recommend one for dry weather", () => {
    const bundle = hoursFromNow(12, [{ precipitationProbability: 5 }]);
    const result = umbrellaRecommendation(bundle);
    expect(result.recommended).toBe(false);
  });

  it("recommends one at moderate chance as a judgment call", () => {
    const bundle = hoursFromNow(12, [{ precipitationProbability: 40 }]);
    expect(umbrellaRecommendation(bundle).recommended).toBe(true);
  });
});

describe("assessActivity", () => {
  it("scores good running conditions highly and explains itself", () => {
    const bundle = hoursFromNow(6, [{ temperature: 18, windSpeed: 8 }]);
    const result = assessActivity("running", bundle);
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.bestWindow).not.toBeNull();
    expect(result.summary).toMatch(/running/i);
  });

  it("penalizes cycling in strong wind with a visible factor", () => {
    const bundle = hoursFromNow(6, [{ windSpeed: 40 }]);
    const result = assessActivity("cycling", bundle);
    expect(result.factors.some((f) => f.label === "Cycling")).toBe(true);
    expect(result.score).toBeLessThan(80);
  });

  it("penalizes cricket when rain is likely", () => {
    const bundle = hoursFromNow(6, [{ precipitationProbability: 70 }]);
    const result = assessActivity("cricket", bundle);
    expect(result.score).toBeLessThan(60);
    expect(result.factors.some((f) => /rain/i.test(f.detail))).toBe(true);
  });

  it("covers every catalog activity without throwing", () => {
    const bundle = hoursFromNow(4);
    for (const activity of [
      "running",
      "cycling",
      "walking",
      "hiking",
      "picnic",
      "photography",
      "cricket",
      "football",
      "outdoor-work",
    ] as const) {
      const result = assessActivity(activity, bundle);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.summary.length).toBeGreaterThan(0);
    }
  });
});
