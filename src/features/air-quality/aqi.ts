import type { AirQuality } from "@/types/domain";

/**
 * European AQI categorization. Cautious, informational language only —
 * never medical advice (per PRD §19).
 */

export interface AqiCategory {
  label: string;
  /** Semantic tone; UI maps it to concrete color classes. */
  tone: "good" | "fair" | "moderate" | "poor" | "very-poor" | "extremely-poor";
  advice: string;
}

const CATEGORIES: Array<{ max: number; category: AqiCategory }> = [
  {
    max: 20,
    category: {
      label: "Good",
      tone: "good",
      advice: "Air quality is ideal for outdoor activity.",
    },
  },
  {
    max: 40,
    category: {
      label: "Fair",
      tone: "fair",
      advice: "Air quality is acceptable for most people.",
    },
  },
  {
    max: 60,
    category: {
      label: "Moderate",
      tone: "moderate",
      advice: "Generally acceptable. Sensitive individuals may consider reducing prolonged outdoor exertion.",
    },
  },
  {
    max: 80,
    category: {
      label: "Poor",
      tone: "poor",
      advice: "Sensitive groups may want to reduce prolonged or heavy outdoor exertion.",
    },
  },
  {
    max: 100,
    category: {
      label: "Very poor",
      tone: "very-poor",
      advice: "Consider limiting prolonged outdoor activity.",
    },
  },
  {
    max: Number.POSITIVE_INFINITY,
    category: {
      label: "Extremely poor",
      tone: "extremely-poor",
      advice: "Avoid prolonged outdoor exertion where possible.",
    },
  },
];

/** Categorize a European AQI value. Values below 0 (unknown) map to "Moderate" with null-safe copy. */
export function categorizeAqi(aqi: number): AqiCategory {
  if (!Number.isFinite(aqi) || aqi < 0) {
    return {
      label: "Unknown",
      tone: "moderate",
      advice: "Air quality data is not available for this location right now.",
    };
  }
  const found = CATEGORIES.find((c) => aqi <= c.max);
  return (found ?? CATEGORIES[CATEGORIES.length - 1]!).category;
}

/** Which pollutant dominates the current reading, for a one-line explainable detail. */
export function dominantPollutant(air: AirQuality): string | null {
  const entries: Array<[string, number | null]> = [
    ["PM2.5", air.pm2_5],
    ["PM10", air.pm10],
    ["NO₂", air.nitrogenDioxide],
    ["O₃", air.ozone],
    ["SO₂", air.sulphurDioxide],
  ];
  let best: { label: string; ratio: number } | null = null;
  const thresholds: Record<string, number> = {
    "PM2.5": 25,
    PM10: 50,
    "NO₂": 40,
    "O₃": 100,
    "SO₂": 40,
  };
  for (const [label, value] of entries) {
    if (value == null) continue;
    const threshold = thresholds[label];
    if (threshold == null || threshold <= 0) continue;
    const ratio = value / threshold;
    if (!best || ratio > best.ratio) {
      best = { label, ratio };
    }
  }
  return best && best.ratio >= 0.5 ? best.label : null;
}
