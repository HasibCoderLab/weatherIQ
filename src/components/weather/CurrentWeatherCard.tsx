"use client";

import { WeatherIcon } from "@/components/weather/WeatherIcon";
import { Badge, Card, Skeleton } from "@/components/ui/primitives";
import {
  formatPercentage,
  formatTemperatureLabel,
  formatTimeAgo,
  formatVisibility,
  formatWindDirection,
  formatWindSpeed,
  type TemperatureUnit,
} from "@/lib/utils/format";
import { formatClockInZone } from "@/lib/utils/datetime";
import type { CurrentWeather, GeoLocation } from "@/types/domain";
import { useNowMs } from "@/hooks/use-now";

function Metric({
  icon,
  label,
  value,
  sub,
}: {
  icon: string;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl bg-surface-container-high/40 px-3 py-2.5">
      <span aria-hidden="true" className="material-symbols-outlined mt-0.5 text-xl text-primary">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs text-on-surface-muted">{label}</p>
        <p className="truncate text-sm font-medium text-on-surface">
          {value}
          {sub ? <span className="ml-1 font-normal text-on-surface-muted">{sub}</span> : null}
        </p>
      </div>
    </div>
  );
}

export function CurrentWeatherCardLoading() {
  return (
    <Card aria-busy="true" aria-label="Loading current weather">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-16 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-20 w-20 rounded-full" />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-14" />
        ))}
      </div>
    </Card>
  );
}

/**
 * Hero conditions card (PRD §8.3): where am I, what's the weather, when was
 * it observed. Freshness is always communicated — never presented as live
 * when it isn't.
 */
export function CurrentWeatherCard({
  location,
  current,
  daily,
  fetchedAt,
  isStale,
  unit,
  onRefresh,
  isRefreshing,
}: {
  location: GeoLocation;
  current: CurrentWeather;
  daily: { tempMin: number; tempMax: number; precipitationProbability: number | null } | undefined;
  fetchedAt: string;
  isStale: boolean;
  unit: TemperatureUnit;
  onRefresh: () => void;
  isRefreshing: boolean;
}) {
  // Ticks with the shared clock; falls back to fetch time on the server so
  // SSR renders an honest "just now" label.
  const nowMs = useNowMs(new Date(fetchedAt).getTime());
  const timezone = location.timezone || "UTC";
  const placeParts = [location.name, location.admin1, location.country].filter(Boolean);
  const place = placeParts.join(", ");

  return (
    <Card className="wiq-card-glow">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h1 className="text-xl font-semibold tracking-tight text-on-surface">{place}</h1>
            {isStale ? <Badge tone="warning">Last known data</Badge> : null}
          </div>
          <p className="mt-0.5 text-xs text-on-surface-muted">
            {formatClockInZone(fetchedAt, timezone)} local time · updated {formatTimeAgo(fetchedAt, new Date(nowMs))}
          </p>

          <div className="mt-4 flex items-center gap-4">
            <WeatherIcon condition={current.condition} size="xl" animated />
            <div>
              <p className="text-6xl font-bold leading-none tracking-tight text-on-surface">
                {formatTemperatureLabel(current.temperature, unit)}
              </p>
              <p className="mt-1.5 text-sm text-on-surface-muted">
                Feels like {formatTemperatureLabel(current.apparentTemperature, unit)}
              </p>
            </div>
          </div>

          <p className="mt-3 text-sm font-medium text-on-surface">{current.condition.label}</p>
          {daily ? (
            <p className="mt-0.5 text-sm text-on-surface-muted">
              H {formatTemperatureLabel(daily.tempMax, unit)} · L{" "}
              {formatTemperatureLabel(daily.tempMin, unit)} ·{" "}
              {formatPercentage(daily.precipitationProbability)} rain
            </p>
          ) : null}
        </div>

        <div className="flex flex-col items-end gap-2">
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="inline-flex h-11 items-center gap-1.5 rounded-full border border-outline-variant bg-surface-container-high px-3 text-sm text-on-surface transition-colors hover:bg-surface-bright disabled:opacity-50"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-base">
              refresh
            </span>
            {isRefreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Metric
          icon="humidity_percentage"
          label="Humidity"
          value={`${Math.round(current.humidity)}%`}
        />
        <Metric
          icon="air"
          label="Wind"
          value={`${formatWindSpeed(current.windSpeed)} km/h`}
          sub={formatWindDirection(current.windDirection)}
        />
        {current.windGust != null ? (
          <Metric
            icon="storm"
            label="Gusts"
            value={`${formatWindSpeed(current.windGust)} km/h`}
          />
        ) : null}
        <Metric
          icon="umbrella"
          label="Precipitation"
          value={`${current.precipitation.toFixed(1)} mm`}
        />
        <Metric icon="cloud" label="Cloud cover" value={`${Math.round(current.cloudCover)}%`} />
        <Metric
          icon="compress"
          label="Pressure"
          value={`${Math.round(current.pressure)} hPa`}
        />
        {current.visibility != null ? (
          <Metric icon="visibility" label="Visibility" value={formatVisibility(current.visibility)} />
        ) : null}
        {current.uvIndex != null ? (
          <Metric icon="wb_sunny" label="UV index" value={current.uvIndex.toFixed(1)} />
        ) : null}
        {current.dewPoint != null ? (
          <Metric
            icon="water_drop"
            label="Dew point"
            value={formatTemperatureLabel(current.dewPoint, unit)}
          />
        ) : null}
      </div>
    </Card>
  );
}
