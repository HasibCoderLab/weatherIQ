import { describe, expect, it } from "vitest";
import { describeWmoCode, isPrecipitating, isSnowKind, weatherIconName } from "@/features/weather/wmo";

describe("describeWmoCode", () => {
  it("maps all documented WMO codes", () => {
    expect(describeWmoCode(0)).toEqual({ kind: "clear", label: "Clear sky" });
    expect(describeWmoCode(2).kind).toBe("partly-cloudy");
    expect(describeWmoCode(3).kind).toBe("cloudy");
    expect(describeWmoCode(45).kind).toBe("fog");
    expect(describeWmoCode(61).kind).toBe("rain");
    expect(describeWmoCode(65).label).toBe("Heavy rain");
    expect(describeWmoCode(71).kind).toBe("snow");
    expect(describeWmoCode(95).kind).toBe("thunderstorm");
    expect(describeWmoCode(96).kind).toBe("thunderstorm");
  });

  it("falls back safely for unknown codes", () => {
    const result = describeWmoCode(1234);
    expect(result.kind).toBe("cloudy");
    expect(result.label).toBe("Cloudy");
  });
});

describe("isPrecipitating / isSnowKind", () => {
  it("flags rain, drizzle, freezing rain, snow and thunderstorm", () => {
    for (const kind of ["rain", "drizzle", "freezing-rain", "snow", "thunderstorm"] as const) {
      expect(isPrecipitating(kind)).toBe(true);
    }
    for (const kind of ["clear", "partly-cloudy", "cloudy", "fog"] as const) {
      expect(isPrecipitating(kind)).toBe(false);
    }
  });

  it("identifies snow kinds", () => {
    expect(isSnowKind("snow")).toBe(true);
    expect(isSnowKind("rain")).toBe(false);
  });
});

describe("weatherIconName", () => {
  it("switches glyphs between day and night", () => {
    expect(weatherIconName("clear", true)).toBe("wb_sunny");
    expect(weatherIconName("clear", false)).toBe("dark_mode");
    expect(weatherIconName("partly-cloudy", true)).toBe("partly_cloudy_day");
    expect(weatherIconName("partly-cloudy", false)).toBe("nights_stay");
  });

  it("keeps the same glyph when day/night is irrelevant", () => {
    expect(weatherIconName("thunderstorm", true)).toBe(weatherIconName("thunderstorm", false));
    expect(weatherIconName("fog", true)).toBe("foggy");
  });
});
