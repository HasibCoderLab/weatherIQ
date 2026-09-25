"use client";

import { WeatherIcon } from "@/components/weather/WeatherIcon";
import { Card, CardHeader, CardTitle, Skeleton } from "@/components/ui/primitives";
import { formatHourInZone } from "@/lib/utils/datetime";
import { formatTemperatureLabel, formatPercentage, formatWindSpeed, type TemperatureUnit } from "@/lib/utils/format";
import type { HourlyPoint } from "@/types/domain";

function HourCard({
  hour,
  unit,
  timezone,
  isNow,
}: {
  hour: HourlyPoint;
  unit: TemperatureUnit;
  timezone: string;
  isNow: boolean;
}) {
  return (
    <li
      className="flex min-w-[4.75rem] snap-start flex-col items-center gap-1.5 rounded-2xl border px-2 py-3"
      aria-label={`${formatHourInZone(hour.time, timezone)}: ${hour.condition.label}, ${formatTemperatureLabel(hour.temperature, unit)}, ${formatPercentage(hour.precipitationProbability)} chance of precipitation`}
    >
      <span className={isNow ? "text-xs font-semibold text-primary" : "text-xs text-on-surface-muted"}>
        {isNow ? "Now" : formatHourInZone(hour.time, timezone)}
      </span>
      <WeatherIcon condition={hour.condition} size="md" />
      <span className="text-sm font-semibold text-on-surface">
        {formatTemperatureLabel(hour.temperature, unit)}
      </span>
      <span
        className={`text-[11px] ${(hour.precipitationProbability ?? 0) >= 30 ? "text-primary" : "text-on-surface-muted/60"}`}
      >
        {formatPercentage(hour.precipitationProbability)}
      </span>
    </li>
  );
}

export function HourlyForecastLoading() {
  return (
    <Card aria-busy="true" aria-label="Loading hourly forecast">
      <CardHeader>
        <CardTitle>Hourly forecast</CardTitle>
      </CardHeader>
      <Skeleton className="h-32 w-full" />
    </Card>
  );
}

/**
 * Next-24-hours strip (PRD §9): horizontal scroll, snap, per-hour accessible
 * labels. The hour containing "now" is pinned first.
 */
export function HourlyForecast({
  hours,
  unit,
  timezone,
  nowIso,
}: {
  hours: HourlyPoint[];
  unit: TemperatureUnit;
  timezone: string;
  /** Reference time for the 24h window — passed in so render stays pure. */
  nowIso: string;
}) {
  if (hours.length === 0) return null;
  const cutoff = new Date(nowIso).getTime() - 3_600_000;
  const next24 = hours
    .filter((h) => new Date(h.time).getTime() >= cutoff)
    .slice(0, 24);

  return (
    <Card aria-labelledby="hourly-heading">
      <CardHeader>
        <CardTitle>
          <span aria-hidden="true" className="material-symbols-outlined text-primary">
            schedule
          </span>
          Hourly forecast
        </CardTitle>
        <span className="text-xs text-on-surface-muted">Next 24 hours</span>
      </CardHeader>
      <ul className="no-scrollbar flex snap-x gap-2 overflow-x-auto pb-1">
        {next24.map((hour, index) => (
          <HourCard
            key={hour.time}
            hour={hour}
            unit={unit}
            timezone={timezone}
            isNow={index === 0}
          />
        ))}
      </ul>
    </Card>
  );
}
