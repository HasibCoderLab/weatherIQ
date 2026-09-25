import { describe, expect, it } from "vitest";
import {
  clamp,
  formatDuration,
  formatPercentage,
  formatPrecipitation,
  formatTemperature,
  formatTemperatureLabel,
  formatTimeAgo,
  formatVisibility,
  formatWindDirection,
  formatWindSpeed,
} from "@/lib/utils/format";

describe("temperature conversion", () => {
  it("converts celsius to fahrenheit correctly", () => {
    expect(formatTemperature(0, "fahrenheit")).toBe(32);
    expect(formatTemperature(100, "fahrenheit")).toBe(212);
    expect(formatTemperature(37, "fahrenheit")).toBe(99);
    expect(formatTemperature(-40, "fahrenheit")).toBe(-40);
  });

  it("rounds celsius values", () => {
    expect(formatTemperature(21.4)).toBe(21);
    expect(formatTemperature(21.5)).toBe(22);
  });

  it("formats labels with the unit symbol", () => {
    expect(formatTemperatureLabel(23.6)).toBe("24°");
    expect(formatTemperatureLabel(-2.2, "fahrenheit")).toBe("28°");
  });
});

describe("wind formatting", () => {
  it("keeps one decimal below 10 km/h", () => {
    expect(formatWindSpeed(7.24)).toBe("7.2");
  });

  it("rounds at or above 10 km/h", () => {
    expect(formatWindSpeed(12.6)).toBe("13");
  });

  it("maps degrees to compass sectors", () => {
    expect(formatWindDirection(0)).toBe("N");
    expect(formatWindDirection(45)).toBe("NE");
    expect(formatWindDirection(90)).toBe("E");
    expect(formatWindDirection(135)).toBe("SE");
    expect(formatWindDirection(180)).toBe("S");
    expect(formatWindDirection(225)).toBe("SW");
    expect(formatWindDirection(270)).toBe("W");
    expect(formatWindDirection(315)).toBe("NW");
    expect(formatWindDirection(359)).toBe("N");
  });

  it("normalizes out-of-range degrees", () => {
    expect(formatWindDirection(-90)).toBe("W");
    // 450° ≡ 90° (due east); 405° ≡ 45° exercises NE normalization.
    expect(formatWindDirection(450)).toBe("E");
    expect(formatWindDirection(405)).toBe("NE");
  });
});

describe("misc formatting", () => {
  it("formats precipitation", () => {
    expect(formatPrecipitation(0.4)).toBe("<1 mm");
    expect(formatPrecipitation(3.2)).toBe("3 mm");
    expect(formatPrecipitation(42.7)).toBe("43 mm");
  });

  it("formats visibility", () => {
    expect(formatVisibility(null)).toBe("--");
    expect(formatVisibility(500)).toBe("0.5 km");
    expect(formatVisibility(24_100)).toBe("24 km");
  });

  it("formats percentages with a null placeholder", () => {
    expect(formatPercentage(null)).toBe("--");
    expect(formatPercentage(0)).toBe("0%");
    expect(formatPercentage(64.6)).toBe("65%");
  });

  it("formats durations", () => {
    expect(formatDuration(0)).toBe("0m");
    expect(formatDuration(60 * 45)).toBe("45m");
    expect(formatDuration(60 * 60 * 13 + 60 * 32)).toBe("13h 32m");
  });

  it("formats relative time honestly", () => {
    const now = new Date("2026-09-25T12:00:00Z");
    expect(formatTimeAgo("2026-09-25T11:59:50Z", now)).toBe("just now");
    expect(formatTimeAgo("2026-09-25T11:48:00Z", now)).toBe("12 minutes ago");
    expect(formatTimeAgo("2026-09-25T10:00:00Z", now)).toBe("2 hours ago");
    expect(formatTimeAgo("2026-09-24T09:00:00Z", now)).toBe("1 day ago");
  });
});

describe("clamp", () => {
  it("clamps to bounds", () => {
    expect(clamp(-5, 0, 100)).toBe(0);
    expect(clamp(150, 0, 100)).toBe(100);
    expect(clamp(42, 0, 100)).toBe(42);
  });
});
