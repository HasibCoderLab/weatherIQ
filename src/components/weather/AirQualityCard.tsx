"use client";

import { Badge, Card, CardHeader, CardTitle, Skeleton } from "@/components/ui/primitives";
import { categorizeAqi, dominantPollutant } from "@/features/air-quality/aqi";
import type { AirQuality } from "@/types/domain";

const TONE_BADGE: Record<string, "good" | "info" | "warning" | "danger" | "neutral"> = {
  good: "good",
  fair: "good",
  moderate: "info",
  poor: "warning",
  "very-poor": "danger",
  "extremely-poor": "danger",
  unknown: "neutral",
};

function Pollutant({ label, value }: { label: string; value: number | null; unit?: string }) {
  return (
    <div className="rounded-lg bg-surface-container-high/40 px-3 py-2">
      <p className="text-xs text-on-surface-muted">{label}</p>
      <p className="text-sm font-medium text-on-surface">
        {value != null ? value.toFixed(1) : "--"}
        <span className="ml-0.5 text-xs font-normal text-on-surface-muted">µg/m³</span>
      </p>
    </div>
  );
}

export function AirQualityCardLoading() {
  return (
    <Card aria-busy="true" aria-label="Loading air quality">
      <CardHeader>
        <CardTitle>Air quality</CardTitle>
      </CardHeader>
      <Skeleton className="h-28 w-full" />
    </Card>
  );
}

/**
 * Air quality (PRD §19): AQI category, cautious informational guidance, and
 * the full pollutant breakdown. Health language is never prescriptive.
 */
export function AirQualityCard({ airQuality }: { airQuality: AirQuality | null }) {
  if (!airQuality) {
    return (
      <Card aria-labelledby="aqi-heading">
        <CardHeader>
          <CardTitle>
            <span aria-hidden="true" className="material-symbols-outlined text-primary">
              air
            </span>
            Air quality
          </CardTitle>
        </CardHeader>
        <p className="text-sm text-on-surface-muted">
          Air quality data is unavailable for this location right now.
        </p>
      </Card>
    );
  }

  const category = categorizeAqi(airQuality.aqi);
  const dominant = dominantPollutant(airQuality);

  return (
    <Card aria-labelledby="aqi-heading">
      <CardHeader>
        <CardTitle>
          <span aria-hidden="true" className="material-symbols-outlined text-primary">
            air
          </span>
          Air quality
        </CardTitle>
        {dominant ? <Badge tone="neutral">Main pollutant: {dominant}</Badge> : null}
      </CardHeader>

      <div className="flex items-center gap-4">
        <div className="flex flex-col items-center">
          <span className="text-4xl font-bold text-on-surface">{Math.round(airQuality.aqi)}</span>
          <span className="text-xs text-on-surface-muted">European AQI</span>
        </div>
        <div className="min-w-0 flex-1">
          <Badge tone={TONE_BADGE[category.tone] ?? "neutral"}>{category.label}</Badge>
          <p className="mt-2 text-sm text-on-surface-muted">{category.advice}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Pollutant label="PM2.5" value={airQuality.pm2_5} />
        <Pollutant label="PM10" value={airQuality.pm10} />
        <Pollutant label="NO₂" value={airQuality.nitrogenDioxide} />
        <Pollutant label="O₃" value={airQuality.ozone} />
        <Pollutant label="SO₂" value={airQuality.sulphurDioxide} />
        <Pollutant label="CO" value={airQuality.carbonMonoxide} />
        <Pollutant label="NH₃" value={airQuality.ammonia} />
      </div>
    </Card>
  );
}
