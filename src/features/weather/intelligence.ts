import type {
  ActivityAssessment,
  ActivityId,
  ActivityWindow,
  HourlyPoint,
  WeatherBundle,
  WeatherInsight,
} from "@/types/domain";
import { clamp } from "@/lib/utils/format";

/**
 * Weather Intelligence engine.
 *
 * Transforms structured weather data into explainable insights and scores.
 * Design rules (PRD §12, §14):
 *  - every insight is tagged with its source category (observed/forecast/
 *    calculated/recommendation) and never blurs them;
 *  - scores are deterministic rule-based values, not arbitrary numbers;
 *  - every score exposes the factors that reduced it.
 */

export interface OutdoorScore {
  score: number;
  label: "Poor" | "Fair" | "Good" | "Excellent";
  factors: Array<{ label: string; penalty: number; detail: string }>;
}

/** Rule-based outdoor comfort score for a single hour (0-100). */
export function outdoorScoreForHour(hour: HourlyPoint): OutdoorScore {
  let score = 100;
  const factors: OutdoorScore["factors"] = [];

  // Temperature comfort curve (sweet spot 15-26°C).
  const temp = hour.temperature;
  if (temp < -5) {
    const penalty = 45;
    factors.push({ label: "Extreme cold", penalty, detail: `${Math.round(temp)}°C` });
    score -= penalty;
  } else if (temp < 8) {
    const penalty = 25;
    factors.push({ label: "Cold", penalty, detail: `${Math.round(temp)}°C` });
    score -= penalty;
  } else if (temp < 15) {
    const penalty = 10;
    factors.push({ label: "Chilly", penalty, detail: `${Math.round(temp)}°C` });
    score -= penalty;
  } else if (temp > 35) {
    const penalty = 40;
    factors.push({ label: "Extreme heat", penalty, detail: `${Math.round(temp)}°C` });
    score -= penalty;
  } else if (temp > 30) {
    const penalty = 20;
    factors.push({ label: "Hot", penalty, detail: `${Math.round(temp)}°C` });
    score -= penalty;
  } else if (temp > 26) {
    const penalty = 8;
    factors.push({ label: "Warm", penalty, detail: `${Math.round(temp)}°C` });
    score -= penalty;
  }

  // Precipitation probability.
  const precipProb = hour.precipitationProbability ?? 0;
  if (precipProb >= 70) {
    const penalty = 35;
    factors.push({ label: "High rain risk", penalty, detail: `${Math.round(precipProb)}% chance` });
    score -= penalty;
  } else if (precipProb >= 40) {
    const penalty = 15;
    factors.push({ label: "Moderate rain risk", penalty, detail: `${Math.round(precipProb)}% chance` });
    score -= penalty;
  } else if (precipProb >= 20) {
    const penalty = 5;
    factors.push({ label: "Slight rain risk", penalty, detail: `${Math.round(precipProb)}% chance` });
    score -= penalty;
  }

  // Wind comfort (above ~25 km/h becomes unpleasant).
  const wind = hour.windSpeed;
  if (wind >= 45) {
    const penalty = 30;
    factors.push({ label: "Strong wind", penalty, detail: `${Math.round(wind)} km/h` });
    score -= penalty;
  } else if (wind >= 25) {
    const penalty = 12;
    factors.push({ label: "Breezy", penalty, detail: `${Math.round(wind)} km/h` });
    score -= penalty;
  }

  // UV exposure.
  const uv = hour.uvIndex;
  if (uv != null && uv >= 8) {
    const penalty = 15;
    factors.push({ label: "Very high UV", penalty, detail: `UV ${uv.toFixed(0)}` });
    score -= penalty;
  } else if (uv != null && uv >= 6) {
    const penalty = 7;
    factors.push({ label: "High UV", penalty, detail: `UV ${uv.toFixed(0)}` });
    score -= penalty;
  }

  // Active precipitation now.
  if (hour.precipitation > 0.4) {
    const penalty = 15;
    factors.push({ label: "Precipitation", penalty, detail: `${hour.precipitation.toFixed(1)} mm/h` });
    score -= penalty;
  }

  score = clamp(Math.round(score), 0, 100);
  const label: OutdoorScore["label"] =
    score >= 85 ? "Excellent" : score >= 70 ? "Good" : score >= 45 ? "Fair" : "Poor";
  return { score, label, factors };
}

export interface BestWindow {
  start: string;
  end: string;
  averageScore: number;
}

/**
 * Find the best continuous outdoor window (minimum 2h, maximum 5h) within the
 * given hours. Quality first: the window with the highest average outdoor
 * score wins; a longer window only wins ties. A longer window that drags a
 * storm hour inside must not beat a shorter calm one. Null when the best
 * average is below 40.
 */
export function findBestOutdoorWindow(hours: HourlyPoint[], minHours = 2, maxHours = 5): BestWindow | null {
  if (hours.length < minHours) return null;

  const scores = hours.map((h) => outdoorScoreForHour(h).score);

  let bestStart = -1;
  let bestSize = 0;
  let bestScore = -1;

  for (let size = minHours; size <= maxHours; size += 1) {
    for (let i = 0; i + size <= hours.length; i += 1) {
      let sum = 0;
      for (let j = i; j < i + size; j += 1) {
        sum += scores[j] ?? 0;
      }
      const average = sum / size;
      if (average > bestScore || (average === bestScore && size > bestSize)) {
        bestScore = average;
        bestStart = i;
        bestSize = size;
      }
    }
  }

  if (bestStart < 0 || bestScore < 40) return null;
  const first = hours[bestStart];
  const last = hours[bestStart + bestSize - 1];
  if (!first || !last) return null;
  return {
    start: first.time,
    end: last.time,
    averageScore: Math.round(bestScore),
  };
}

/** Time-of-day bucket for insight phrasing. */
function partOfDay(iso: string): string {
  const hour = new Date(iso).getHours();
  if (hour < 6) return "overnight";
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  if (hour < 21) return "evening";
  return "tonight";
}

/** Local "3:30 PM" style label. */
function timeLabel(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

/** Generate the intelligence insights for the next ~24 hours. */
export function generateInsights(bundle: WeatherBundle): WeatherInsight[] {
  const insights: WeatherInsight[] = [];
  const now = Date.now();
  const next24 = bundle.hourly.filter(
    (h) => new Date(h.time).getTime() >= now - 60 * 60 * 1000,
  );

  // Rain onset insight: first hour with high precipitation probability.
  const rainOnset = next24.find((h) => (h.precipitationProbability ?? 0) >= 60);
  if (rainOnset) {
    insights.push({
      id: "rain-onset",
      message: `Rain is likely ${partOfDay(rainOnset.time)} around ${timeLabel(rainOnset.time)}.`,
      severity: (rainOnset.precipitationProbability ?? 0) >= 80 ? "high" : "moderate",
      source: "forecast",
    });
  }

  // UV insight from daily max (forecast).
  const today = bundle.daily[0];
  const uvMax = today?.uvIndexMax;
  if (uvMax != null && uvMax >= 6) {
    insights.push({
      id: "uv-high",
      message:
        uvMax >= 8
          ? `Very high UV (up to ${uvMax.toFixed(0)}) is expected around midday. Sun protection is recommended.`
          : `High UV (up to ${uvMax.toFixed(0)}) is expected around midday.`,
      severity: uvMax >= 8 ? "high" : "moderate",
      source: "forecast",
    });
  }

  // Wind trend insight: compare morning vs evening average.
  const morningHours = next24.filter((h) => {
    const hour = new Date(h.time).getHours();
    return hour >= 6 && hour < 12;
  });
  const eveningHours = next24.filter((h) => {
    const hour = new Date(h.time).getHours();
    return hour >= 17 && hour < 23;
  });
  if (morningHours.length > 0 && eveningHours.length > 0) {
    const morningAvg =
      morningHours.reduce((sum, h) => sum + h.windSpeed, 0) / morningHours.length;
    const eveningAvg =
      eveningHours.reduce((sum, h) => sum + h.windSpeed, 0) / eveningHours.length;
    if (eveningAvg - morningAvg >= 10) {
      insights.push({
        id: "wind-increase",
        message: `Wind is expected to increase this evening (around ${Math.round(eveningAvg)} km/h vs ${Math.round(morningAvg)} km/h in the morning).`,
        severity: eveningAvg >= 35 ? "high" : "moderate",
        source: "forecast",
      });
    }
  }

  // Temperature swing insight.
  if (today) {
    const swing = today.tempMax - today.tempMin;
    if (swing >= 12) {
      insights.push({
        id: "temp-swing",
        message: `Large temperature swing today (${Math.round(swing)}°C range). Dress in layers.`,
        severity: "moderate",
        source: "calculated",
      });
    }
  }

  // Best window recommendation.
  const window = findBestOutdoorWindow(next24);
  if (window) {
    insights.push({
      id: "best-window",
      message: `Best outdoor window: ${timeLabel(window.start)} – ${timeLabel(window.end)}.`,
      severity: "info",
      source: "recommendation",
    });
  } else {
    insights.push({
      id: "no-good-window",
      message: "No comfortable outdoor window in the next 24 hours. Consider indoor plans.",
      severity: "moderate",
      source: "recommendation",
    });
  }

  return insights;
}

/** "Should I carry an umbrella?" — probabilistic answer, clearly a recommendation. */
export function umbrellaRecommendation(bundle: WeatherBundle): { recommended: boolean; reason: string } {
  const now = Date.now();
  const next12 = bundle.hourly.filter(
    (h) => new Date(h.time).getTime() >= now - 60 * 60 * 1000,
  ).slice(0, 12);

  const maxProb = next12.reduce((max, h) => Math.max(max, h.precipitationProbability ?? 0), 0);
  const totalPrecip = next12.reduce((sum, h) => sum + h.precipitation, 0);

  if (maxProb >= 60 || totalPrecip >= 1) {
    return {
      recommended: true,
      reason:
        maxProb >= 60
          ? `Rain chance reaches ${Math.round(maxProb)}% in the next 12 hours.`
          : `Around ${totalPrecip.toFixed(1)} mm of precipitation is expected in the next 12 hours.`,
    };
  }
  if (maxProb >= 30) {
    return {
      recommended: true,
      reason: `There is a ${Math.round(maxProb)}% chance of rain in the next 12 hours — worth having one with you.`,
    };
  }
  return {
    recommended: false,
    reason:
      maxProb > 0
        ? `Rain chance stays low (max ${Math.round(maxProb)}%) in the next 12 hours.`
        : "No meaningful rain chance in the next 12 hours.",
  };
}

/** Summarize hourly data into a daily point used by activity assessment. */
function summarize(hours: HourlyPoint[]): { avgScore: number; window: ActivityWindow | null } {
  if (hours.length === 0) return { avgScore: 0, window: null };
  const scored = hours.map((h) => ({ hour: h, score: outdoorScoreForHour(h).score }));
  const avgScore = Math.round(scored.reduce((s, x) => s + x.score, 0) / scored.length);
  const best = scored.reduce((best, x) => (x.score > best.score ? x : best), scored[0]!);
  const window: ActivityWindow = {
    start: best.hour.time,
    end: new Date(new Date(best.hour.time).getTime() + 60 * 60 * 1000).toISOString(),
    score: best.score,
  };
  return { avgScore, window };
}

/** Activity-specific adjustments: explicit, explainable rule deltas. */
const ACTIVITY_RULES: Record<
  ActivityId,
  { label: string; adjust: (h: HourlyPoint) => number; describe: (h: HourlyPoint) => string | null }
> = {
  running: {
    label: "Running",
    adjust: (h) => (h.temperature > 24 ? -12 : h.temperature < 3 ? -8 : 0),
    describe: (h) =>
      h.temperature > 24
        ? "Warm conditions increase heat stress while running"
        : h.temperature < 3
          ? "Cold start; warm up thoroughly"
          : null,
  },
  cycling: {
    label: "Cycling",
    adjust: (h) => (h.windSpeed > 35 ? -30 : h.windSpeed > 25 ? -15 : 0),
    describe: (h) =>
      h.windSpeed > 35
        ? "Very strong wind — unsafe gusts for cycling"
        : h.windSpeed > 25
          ? "Strong headwinds likely"
          : null,
  },
  walking: {
    label: "Walking",
    adjust: () => 0,
    describe: () => null,
  },
  hiking: {
    label: "Hiking",
    adjust: (h) => (h.precipitationProbability != null && h.precipitationProbability >= 50 ? -15 : 0),
    describe: (h) =>
      h.precipitationProbability != null && h.precipitationProbability >= 50
        ? "Wet trails likely; bring waterproofs"
        : null,
  },
  picnic: {
    label: "Picnic",
    adjust: (h) =>
      (h.precipitationProbability ?? 0) >= 30 ? -20 : h.windSpeed > 30 ? -10 : 0,
    describe: (h) =>
      (h.precipitationProbability ?? 0) >= 30
        ? "Rain would interrupt an outdoor meal"
        : h.windSpeed > 30
          ? "Wind may make sitting outside uncomfortable"
          : null,
  },
  photography: {
    label: "Photography",
    adjust: (h) =>
      h.condition.kind === "cloudy" || h.condition.kind === "fog"
        ? -5
        : h.condition.kind === "clear" && h.isDaytime
          ? 5
          : 0,
    describe: (h) =>
      h.condition.kind === "cloudy" || h.condition.kind === "fog"
        ? "Heavy overcast flattens light"
        : null,
  },
  cricket: {
    label: "Cricket",
    adjust: (h) => {
      const prob = h.precipitationProbability ?? 0;
      // Cricket is uniquely rain-fragile: rain stops play and ruins the outfield.
      if (prob >= 60) return -40;
      if (prob >= 40) return -25;
      if (h.windSpeed > 35) return -10;
      return 0;
    },
    describe: (h) =>
      (h.precipitationProbability ?? 0) >= 40 ? "Play likely to be interrupted by rain" : null,
  },
  football: {
    label: "Football",
    adjust: (h) => ((h.precipitationProbability ?? 0) >= 60 ? -10 : 0),
    describe: (h) =>
      (h.precipitationProbability ?? 0) >= 60 ? "Heavy pitch and poor ball control likely" : null,
  },
  "outdoor-work": {
    label: "Outdoor work",
    adjust: (h) => {
      if (h.temperature > 32) return -20;
      if (h.temperature < 0) return -15;
      return 0;
    },
    describe: (h) =>
      h.temperature > 32
        ? "Heat stress risk during sustained effort"
        : h.temperature < 0
          ? "Freezing conditions; take warm-up breaks"
          : null,
  },
};

/** Assess an activity across the next 24 hours. Deterministic and explainable. */
export function assessActivity(activity: ActivityId, bundle: WeatherBundle): ActivityAssessment {
  const rule = ACTIVITY_RULES[activity];
  const now = Date.now();
  const next24 = bundle.hourly.filter(
    (h) => new Date(h.time).getTime() >= now - 60 * 60 * 1000,
  );

  const base = summarize(next24);
  const worstHour = next24.reduce<HourlyPoint | null>(
    (worst, h) => {
      const adj = rule.adjust(h);
      return worst == null || adj < rule.adjust(worst) ? h : worst;
    },
    null,
  );

  const adjustment = worstHour ? rule.adjust(worstHour) : 0;
  const score = clamp(base.avgScore + adjustment, 0, 100);

  const factors: ActivityAssessment["factors"] = [];
  const baseDetail = outdoorScoreForHour(next24[0] ?? bundle.hourly[0]!);
  for (const f of baseDetail.factors) {
    factors.push({ label: f.label, detail: f.detail, penalty: f.penalty });
  }
  const note = worstHour ? rule.describe(worstHour) : null;
  if (note && adjustment < 0) {
    factors.push({ label: rule.label, detail: note, penalty: Math.abs(adjustment) });
  }

  const summary =
    score >= 80
      ? `${rule.label} conditions are ${score >= 90 ? "excellent" : "very good"} in the next 24 hours.`
      : score >= 60
        ? `${rule.label} conditions are fair. Check the best time below.`
        : `${rule.label} conditions are poor in the next 24 hours. Consider postponing.`;

  return {
    activity,
    score,
    summary,
    bestWindow: base.window,
    factors,
  };
}

/** All supported activities with display metadata. */
export const ACTIVITY_CATALOG: Array<{ id: ActivityId; label: string; icon: string }> = [
  { id: "running", label: "Running", icon: "directions_run" },
  { id: "cycling", label: "Cycling", icon: "directions_bike" },
  { id: "walking", label: "Walking", icon: "directions_walk" },
  { id: "hiking", label: "Hiking", icon: "hiking" },
  { id: "picnic", label: "Picnic", icon: "park" },
  { id: "photography", label: "Photography", icon: "photo_camera" },
  { id: "cricket", label: "Cricket", icon: "sports_cricket" },
  { id: "football", label: "Football", icon: "sports_soccer" },
  { id: "outdoor-work", label: "Outdoor work", icon: "construction" },
];
