"use client";

import { useMemo } from "react";
import { Badge, Card, CardHeader, CardTitle } from "@/components/ui/primitives";
import { formatClockInZone, formatHourInZone } from "@/lib/utils/datetime";
import {
  findBestOutdoorWindow,
  generateInsights,
  umbrellaRecommendation,
} from "@/features/weather/intelligence";
import type { WeatherBundle, WeatherInsight } from "@/types/domain";

const SEVERITY_TONE: Record<WeatherInsight["severity"], "neutral" | "info" | "warning" | "danger"> = {
  info: "info",
  moderate: "warning",
  high: "danger",
  severe: "danger",
};

const SOURCE_LABEL: Record<WeatherInsight["source"], string> = {
  observed: "Observed",
  forecast: "Forecast",
  calculated: "Calculated",
  recommendation: "Recommendation",
};

function InsightRow({ insight, timezone }: { insight: WeatherInsight; timezone: string }) {
  const icon =
    insight.id === "rain-onset"
      ? "umbrella"
      : insight.id === "uv-high"
        ? "wb_sunny"
        : insight.id === "wind-increase"
          ? "air"
          : insight.id === "best-window" || insight.id === "no-good-window"
            ? "schedule"
            : "insights";
  return (
    <li className="flex items-start gap-3 rounded-xl bg-surface-container-high/50 px-3 py-2.5">
      <span aria-hidden="true" className="material-symbols-outlined mt-0.5 text-xl text-primary">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-on-surface">{insight.message}</p>
        <p className="mt-0.5 flex items-center gap-2 text-[11px] uppercase tracking-wide text-on-surface-muted">
          <Badge tone={SEVERITY_TONE[insight.severity]}>{SOURCE_LABEL[insight.source]}</Badge>
        </p>
      </div>
    </li>
  );
}

/**
 * The differentiator (PRD §8.4, §12): what the weather *means* today.
 * Every insight is tagged with its source category — recommendations are
 * never presented as official warnings.
 */
export function IntelligenceCard({ bundle }: { bundle: WeatherBundle }) {
  const timezone = bundle.location.timezone;

  const insights = useMemo(() => generateInsights(bundle), [bundle]);
  const umbrella = useMemo(() => umbrellaRecommendation(bundle), [bundle]);
  // Anchor "now" to the bundle's fetch time (a prop) instead of
  // Date.now() — keeps render pure (react-hooks/purity) and stable.
  const bestWindow = useMemo(() => {
    const cutoff = new Date(bundle.fetchedAt).getTime() - 3_600_000;
    return findBestOutdoorWindow(
      bundle.hourly.filter((h) => new Date(h.time).getTime() >= cutoff),
    );
  }, [bundle]);

  return (
    <Card aria-labelledby="intelligence-heading">
      <CardHeader>
        <CardTitle>
          <span aria-hidden="true" className="material-symbols-outlined text-primary">
            insights
          </span>
          Today&apos;s weather intelligence
        </CardTitle>
        <Badge tone="neutral">Not an official warning</Badge>
      </CardHeader>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="flex items-start gap-3 rounded-xl border border-outline-variant bg-surface-container-high/40 px-3 py-3">
          <span aria-hidden="true" className="material-symbols-outlined mt-0.5 text-2xl text-primary">
            umbrella
          </span>
          <div>
            <p className="text-sm font-medium text-on-surface">
              Umbrella: {umbrella.recommended ? "Recommended" : "Not needed"}
            </p>
            <p className="mt-0.5 text-xs text-on-surface-muted">{umbrella.reason}</p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-xl border border-outline-variant bg-surface-container-high/40 px-3 py-3">
          <span aria-hidden="true" className="material-symbols-outlined mt-0.5 text-2xl text-primary">
            schedule
          </span>
          <div>
            <p className="text-sm font-medium text-on-surface">Best outdoor window</p>
            <p className="mt-0.5 text-xs text-on-surface-muted">
              {bestWindow
                ? `${formatClockInZone(bestWindow.start, timezone)} – ${formatClockInZone(bestWindow.end, timezone)} today`
                : "No comfortable window in the next 24 hours."}
            </p>
          </div>
        </div>
      </div>

      <ul className="mt-3 flex flex-col gap-2">
        {insights.map((insight) => (
          <InsightRow key={insight.id} insight={insight} timezone={timezone} />
        ))}
      </ul>
    </Card>
  );
}
