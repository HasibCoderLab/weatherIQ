import { describe, expect, it } from "vitest";
import { moonPhaseEmoji, moonPhaseIndex, moonPhaseName } from "@/features/weather/moon";

describe("moon phase", () => {
  it("returns ~0 at the known reference new moon (2000-01-06 18:14 UTC)", () => {
    const phase = moonPhaseIndex(new Date("2000-01-06T18:14:00Z"));
    expect(phase).toBeGreaterThanOrEqual(0);
    expect(phase).toBeLessThan(0.01);
    expect(moonPhaseName(phase)).toBe("New Moon");
  });

  it("returns ~0.5 at a known full moon (2000-01-21 04:40 UTC)", () => {
    const phase = moonPhaseIndex(new Date("2000-01-21T04:40:00Z"));
    expect(phase).toBeGreaterThan(0.45);
    expect(phase).toBeLessThan(0.55);
    expect(moonPhaseName(phase)).toBe("Full Moon");
  });

  it("always returns a value in [0, 1)", () => {
    const start = new Date("2024-01-01T00:00:00Z").getTime();
    for (let day = 0; day < 366; day += 7) {
      const phase = moonPhaseIndex(new Date(start + day * 86_400_000));
      expect(phase).toBeGreaterThanOrEqual(0);
      expect(phase).toBeLessThan(1);
    }
  });

  it("names all eight phases", () => {
    expect(moonPhaseName(0.0)).toBe("New Moon");
    expect(moonPhaseName(0.1)).toBe("Waxing Crescent");
    expect(moonPhaseName(0.25)).toBe("First Quarter");
    expect(moonPhaseName(0.35)).toBe("Waxing Gibbous");
    expect(moonPhaseName(0.5)).toBe("Full Moon");
    expect(moonPhaseName(0.6)).toBe("Waning Gibbous");
    expect(moonPhaseName(0.75)).toBe("Last Quarter");
    expect(moonPhaseName(0.9)).toBe("Waning Crescent");
    expect(moonPhaseName(0.99)).toBe("New Moon");
  });

  it("maps phases to distinct emoji", () => {
    const emojis = new Set(
      [0, 0.1, 0.25, 0.35, 0.5, 0.6, 0.75, 0.9].map((p) => moonPhaseEmoji(p)),
    );
    expect(emojis.size).toBeGreaterThanOrEqual(5);
  });
});
