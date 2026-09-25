"use client";

import { Card, CardHeader, CardTitle, Skeleton } from "@/components/ui/primitives";
import { formatClockInZone } from "@/lib/utils/datetime";
import { formatDuration } from "@/lib/utils/format";
import { moonPhaseEmoji, moonPhaseName } from "@/features/weather/moon";
import type { Astronomy, GeoLocation } from "@/types/domain";

export function AstronomyCardLoading() {
  return (
    <Card aria-busy="true" aria-label="Loading astronomy">
      <CardHeader>
        <CardTitle>Sun &amp; moon</CardTitle>
      </CardHeader>
      <Skeleton className="h-24 w-full" />
    </Card>
  );
}

/** Sun and moon (PRD §20). Pure display — never used for decisions. */
export function AstronomyCard({
  astronomy,
  timezone,
}: {
  astronomy: Astronomy | null;
  timezone: string;
}) {
  if (!astronomy) return null;

  return (
    <Card aria-labelledby="astronomy-heading">
      <CardHeader>
        <CardTitle>
          <span aria-hidden="true" className="material-symbols-outlined text-primary">
            routine
          </span>
          Sun &amp; moon
        </CardTitle>
        <span className="text-xs text-on-surface-muted">
          {moonPhaseEmoji(astronomy.moonPhase)} {moonPhaseName(astronomy.moonPhase)}
        </span>
      </CardHeader>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-2.5 rounded-xl bg-surface-container-high/40 px-3 py-2.5">
          <span aria-hidden="true" className="material-symbols-outlined text-xl text-tertiary">
            wb_twilight
          </span>
          <div>
            <p className="text-xs text-on-surface-muted">Sunrise</p>
            <p className="text-sm font-medium text-on-surface">
              {astronomy.sunrise ? formatClockInZone(astronomy.sunrise, timezone) : "--"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 rounded-xl bg-surface-container-high/40 px-3 py-2.5">
          <span aria-hidden="true" className="material-symbols-outlined text-xl text-tertiary">
            nights_stay
          </span>
          <div>
            <p className="text-xs text-on-surface-muted">Sunset</p>
            <p className="text-sm font-medium text-on-surface">
              {astronomy.sunset ? formatClockInZone(astronomy.sunset, timezone) : "--"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 rounded-xl bg-surface-container-high/40 px-3 py-2.5">
          <span aria-hidden="true" className="material-symbols-outlined text-xl text-tertiary">
            light_mode
          </span>
          <div>
            <p className="text-xs text-on-surface-muted">Daylight</p>
            <p className="text-sm font-medium text-on-surface">
              {formatDuration(astronomy.daylightDuration)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 rounded-xl bg-surface-container-high/40 px-3 py-2.5">
          <span aria-hidden="true" className="material-symbols-outlined text-xl text-tertiary">
            brightness_3
          </span>
          <div>
            <p className="text-xs text-on-surface-muted">Moonrise</p>
            <p className="text-sm font-medium text-on-surface">
              {astronomy.moonRise ? formatClockInZone(astronomy.moonRise, timezone) : "--"}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
