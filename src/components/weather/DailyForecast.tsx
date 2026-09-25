"use client";

import { useState } from "react";
import { WeatherIcon } from "@/components/weather/WeatherIcon";
import { Card, CardHeader, CardTitle, Skeleton } from "@/components/ui/primitives";
import { formatDayMonthInZone, formatWeekdayInZone, formatClockInZone } from "@/lib/utils/datetime";
import {
  formatPercentage,
  formatTemperatureLabel,
  formatWindSpeed,
  type TemperatureUnit,
} from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { DailyPoint } from "@/types/domain";

function DayRow({
  day,
  unit,
  timezone,
  expanded,
  onToggle,
  rangeMin,
  rangeMax,
}: {
  day: DailyPoint;
  unit: TemperatureUnit;
  timezone: string;
  expanded: boolean;
  onToggle: () => void;
  rangeMin: number;
  rangeMax: number;
}) {
  const span = Math.max(rangeMax - rangeMin, 1);
  const left = ((day.tempMin - rangeMin) / span) * 100;
  const width = ((day.tempMax - day.tempMin) / span) * 100;

  return (
    <li>
      <button
        type="button"
        aria-expanded={expanded}
        onClick={onToggle}
        className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-surface-container-high/60"
      >
        <span className="w-24 shrink-0">
          <span className="block text-sm font-medium text-on-surface">
            {formatWeekdayInZone(`${day.date}T12:00:00`, timezone)}
          </span>
          <span className="block text-xs text-on-surface-muted">
            {formatDayMonthInZone(`${day.date}T12:00:00`, timezone)}
          </span>
        </span>

        <WeatherIcon condition={day.condition} size="sm" />

        <span className="w-11 shrink-0 text-right text-xs text-primary">
          {formatPercentage(day.precipitationProbability)}
        </span>

        <span className="flex min-w-0 flex-1 items-center gap-2">
          <span className="w-9 shrink-0 text-right text-sm text-on-surface-muted">
            {formatTemperatureLabel(day.tempMin, unit)}
          </span>
          <span className="relative h-1.5 min-w-8 flex-1 overflow-hidden rounded-full bg-surface-bright">
            <span
              className="absolute inset-y-0 rounded-full bg-gradient-to-r from-primary/60 to-primary"
              style={{ left: `${left}%`, width: `${Math.max(width, 8)}%` }}
            />
          </span>
          <span className="w-9 shrink-0 text-sm font-semibold text-on-surface">
            {formatTemperatureLabel(day.tempMax, unit)}
          </span>
        </span>

        <span
          aria-hidden="true"
          className={cn(
            "material-symbols-outlined text-lg text-on-surface-muted transition-transform",
            expanded && "rotate-180",
          )}
        >
          expand_more
        </span>
      </button>

      {expanded ? (
        <div className="mb-2 grid grid-cols-2 gap-2 px-2 text-sm sm:grid-cols-4">
          <div className="rounded-lg bg-surface-container-high/40 px-3 py-2">
            <p className="text-xs text-on-surface-muted">Condition</p>
            <p className="text-on-surface">{day.condition.label}</p>
          </div>
          <div className="rounded-lg bg-surface-container-high/40 px-3 py-2">
            <p className="text-xs text-on-surface-muted">Precipitation</p>
            <p className="text-on-surface">
              {day.precipitationSum.toFixed(1)} mm · {formatPercentage(day.precipitationProbability)}
            </p>
          </div>
          <div className="rounded-lg bg-surface-container-high/40 px-3 py-2">
            <p className="text-xs text-on-surface-muted">Max wind</p>
            <p className="text-on-surface">{formatWindSpeed(day.windMax)} km/h</p>
          </div>
          <div className="rounded-lg bg-surface-container-high/40 px-3 py-2">
            <p className="text-xs text-on-surface-muted">UV max</p>
            <p className="text-on-surface">
              {day.uvIndexMax != null ? day.uvIndexMax.toFixed(1) : "--"}
            </p>
          </div>
          <div className="rounded-lg bg-surface-container-high/40 px-3 py-2">
            <p className="text-xs text-on-surface-muted">Sunrise</p>
            <p className="text-on-surface">
              {day.sunrise ? formatClockInZone(day.sunrise, timezone) : "--"}
            </p>
          </div>
          <div className="rounded-lg bg-surface-container-high/40 px-3 py-2">
            <p className="text-xs text-on-surface-muted">Sunset</p>
            <p className="text-on-surface">
              {day.sunset ? formatClockInZone(day.sunset, timezone) : "--"}
            </p>
          </div>
          <div className="rounded-lg bg-surface-container-high/40 px-3 py-2">
            <p className="text-xs text-on-surface-muted">Humidity</p>
            <p className="text-on-surface">
              {day.humidityMean != null ? `${Math.round(day.humidityMean)}%` : "--"}
            </p>
          </div>
          <div className="rounded-lg bg-surface-container-high/40 px-3 py-2">
            <p className="text-xs text-on-surface-muted">Gusts</p>
            <p className="text-on-surface">
              {day.windGustMax != null ? `${formatWindSpeed(day.windGustMax)} km/h` : "--"}
            </p>
          </div>
        </div>
      ) : null}
    </li>
  );
}

export function DailyForecastLoading() {
  return (
    <Card aria-busy="true" aria-label="Loading daily forecast">
      <CardHeader>
        <CardTitle>7-day forecast</CardTitle>
      </CardHeader>
      <div className="flex flex-col gap-2">
        {Array.from({ length: 7 }, (_, i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
    </Card>
  );
}

/** 7-day outlook (PRD §10) with expandable per-day details. */
export function DailyForecast({
  days,
  unit,
  timezone,
}: {
  days: DailyPoint[];
  unit: TemperatureUnit;
  timezone: string;
}) {
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  if (days.length === 0) return null;

  const rangeMin = Math.min(...days.map((d) => d.tempMin));
  const rangeMax = Math.max(...days.map((d) => d.tempMax));

  return (
    <Card aria-labelledby="daily-heading">
      <CardHeader>
        <CardTitle>
          <span aria-hidden="true" className="material-symbols-outlined text-primary">
            calendar_view_day
          </span>
          7-day forecast
        </CardTitle>
        <span className="text-xs text-on-surface-muted">Tap a day for details</span>
      </CardHeader>
      <ul className="flex flex-col">
        {days.map((day) => (
          <DayRow
            key={day.date}
            day={day}
            unit={unit}
            timezone={timezone}
            expanded={expandedDate === day.date}
            onToggle={() => setExpandedDate(expandedDate === day.date ? null : day.date)}
            rangeMin={rangeMin}
            rangeMax={rangeMax}
          />
        ))}
      </ul>
    </Card>
  );
}
