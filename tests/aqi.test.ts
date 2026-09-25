import { describe, expect, it } from "vitest";
import { categorizeAqi, dominantPollutant } from "@/features/air-quality/aqi";
import type { AirQuality } from "@/types/domain";

function air(overrides: Partial<AirQuality> = {}): AirQuality {
  return {
    aqi: 30,
    pm10: null,
    pm2_5: null,
    carbonMonoxide: null,
    nitrogenDioxide: null,
    ozone: null,
    sulphurDioxide: null,
    ammonia: null,
    ...overrides,
  };
}

describe("categorizeAqi", () => {
  it("maps the European AQI bands", () => {
    expect(categorizeAqi(0).label).toBe("Good");
    expect(categorizeAqi(20).label).toBe("Good");
    expect(categorizeAqi(21).label).toBe("Fair");
    expect(categorizeAqi(40).label).toBe("Fair");
    expect(categorizeAqi(41).label).toBe("Moderate");
    expect(categorizeAqi(60).label).toBe("Moderate");
    expect(categorizeAqi(61).label).toBe("Poor");
    expect(categorizeAqi(80).label).toBe("Poor");
    expect(categorizeAqi(81).label).toBe("Very poor");
    expect(categorizeAqi(100).label).toBe("Very poor");
    expect(categorizeAqi(150).label).toBe("Extremely poor");
  });

  it("handles invalid values safely", () => {
    expect(categorizeAqi(-5).label).toBe("Unknown");
    expect(categorizeAqi(Number.NaN).label).toBe("Unknown");
    expect(categorizeAqi(Number.POSITIVE_INFINITY).label).toBe("Unknown");
  });

  it("uses cautious, informational language", () => {
    const poor = categorizeAqi(75);
    expect(poor.advice).toMatch(/may|consider/i);
    expect(poor.advice).not.toMatch(/must not|dangerous to your health|will cause/);
  });
});

describe("dominantPollutant", () => {
  it("identifies the pollutant closest to its guideline threshold", () => {
    const result = dominantPollutant(air({ pm2_5: 20, pm10: 30, ozone: 40 }));
    // PM2.5 ratio 20/25 = 0.8; PM10 30/50 = 0.6; O3 40/100 = 0.4
    expect(result).toBe("PM2.5");
  });

  it("returns null when nothing approaches a threshold", () => {
    expect(dominantPollutant(air({ pm2_5: 5, pm10: 10 }))).toBeNull();
    expect(dominantPollutant(air())).toBeNull();
  });

  it("ignores null pollutant values", () => {
    expect(dominantPollutant(air({ nitrogenDioxide: null }))).toBeNull();
  });

  it("flags a dominant pollutant at half the threshold", () => {
    expect(dominantPollutant(air({ nitrogenDioxide: 20 }))).toBe("NO₂"); // 20/40 = 0.5
  });
});
