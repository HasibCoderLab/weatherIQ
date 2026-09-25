"use client";

import { useMemo } from "react";
import { LocationSearch } from "@/components/weather/LocationSearch";
import {
  CurrentWeatherCard,
  CurrentWeatherCardLoading,
} from "@/components/weather/CurrentWeatherCard";
import { IntelligenceCard } from "@/components/weather/IntelligenceCard";
import { HourlyForecast } from "@/components/weather/HourlyForecast";
import { DailyForecast } from "@/components/weather/DailyForecast";
import { AirQualityCard } from "@/components/weather/AirQualityCard";
import { AstronomyCard } from "@/components/weather/AstronomyCard";
import { SavedLocationsCard } from "@/components/weather/SavedLocationsCard";
import { useWeather } from "@/hooks/use-weather";
import { useSavedLocations } from "@/stores/locations";
import { usePreferences } from "@/stores/preferences";
import { useLastLocation, setLastLocation } from "@/stores/last-location";
import type { GeoLocation } from "@/types/domain";

function isSamePlace(a: GeoLocation, b: { latitude: number; longitude: number }): boolean {
  return Math.abs(a.latitude - b.latitude) < 0.01 && Math.abs(a.longitude - b.longitude) < 0.01;
}

/**
 * Dashboard composer (PRD §8): search → current conditions → intelligence →
 * hourly → daily → AQI → astronomy. The client boundary for weather state;
 * all cards are presentational and receive plain domain types.
 *
 * The selected location is *derived* (last viewed → saved default → prompt)
 * from external stores, so there is no hydration effect at all.
 */
export function WeatherDashboard() {
  const { locations, addLocation, removeLocation } = useSavedLocations();
  const { unit } = usePreferences();
  const lastLocation = useLastLocation();

  const selected: GeoLocation | null =
    lastLocation ??
    locations.find((l) => l.isDefault) ??
    locations[0] ??
    null;

  const handleSelect = (location: GeoLocation) => {
    setLastLocation(location);
  };

  const weather = useWeather({
    latitude: selected?.latitude ?? 0,
    longitude: selected?.longitude ?? 0,
    name: selected?.name,
    country: selected?.country,
    // Don't hit the API until a location exists (no spurious 0,0 request).
    enabled: selected != null,
  });

  const savedMatch = useMemo(
    () => (selected ? locations.find((l) => isSamePlace(l, selected)) ?? null : null),
    [locations, selected],
  );

  const toggleSaved = () => {
    if (!selected) return;
    if (savedMatch) {
      removeLocation(savedMatch.id);
    } else {
      addLocation(selected);
    }
  };

  if (!selected) {
    return (
      <div className="flex flex-col gap-4">
        <LocationSearch onSelect={handleSelect} />
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-outline-variant px-6 py-14 text-center">
          <span aria-hidden="true" className="material-symbols-outlined text-4xl text-on-surface-muted/60">
            travel_explore
          </span>
          <p className="text-base font-medium text-on-surface">Search for a city to begin</p>
          <p className="max-w-sm text-sm text-on-surface-muted">
            Get current conditions, an hourly and 7-day outlook, air quality, and plain-language
            insights — no account needed.
          </p>
        </div>
      </div>
    );
  }

  const { bundle, isPending, isError, isStale, refetch, isFetching } = weather;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-2">
        <LocationSearch onSelect={handleSelect} className="max-w-xl flex-1" />
        <button
          type="button"
          onClick={toggleSaved}
          aria-pressed={savedMatch != null}
          className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border border-outline-variant bg-surface-container px-3.5 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container-high"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-lg text-primary">
            {savedMatch ? "bookmark_added" : "bookmark_add"}
          </span>
          {savedMatch ? "Saved" : "Save"}
        </button>
      </div>

      {isError ? (
        <div
          role="alert"
          className="flex flex-col items-start gap-2 rounded-2xl border border-danger/30 bg-danger/10 px-5 py-4"
        >
          <p className="text-sm font-medium text-on-surface">Weather temporarily unavailable.</p>
          <p className="text-sm text-on-surface-muted">
            {weather.error?.message ?? "Please try again shortly."}
          </p>
          <button
            type="button"
            onClick={refetch}
            className="mt-1 inline-flex h-10 items-center rounded-full bg-primary px-4 text-sm font-medium text-on-primary"
          >
            Retry
          </button>
        </div>
      ) : null}

      {isPending || !bundle ? (
        <CurrentWeatherCardLoading />
      ) : (
        <>
          <CurrentWeatherCard
            location={bundle.location}
            current={bundle.current}
            daily={bundle.daily[0]}
            fetchedAt={bundle.fetchedAt}
            isStale={isStale}
            unit={unit}
            onRefresh={refetch}
            isRefreshing={isFetching}
          />

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
              <IntelligenceCard bundle={bundle} />
              <HourlyForecast
                hours={bundle.hourly}
                unit={unit}
                timezone={bundle.location.timezone}
                nowIso={bundle.fetchedAt}
              />
              <DailyForecast days={bundle.daily} unit={unit} timezone={bundle.location.timezone} />
            </div>
            <div className="flex min-w-0 flex-col gap-4">
              <SavedLocationsCard onSelect={handleSelect} activeLocation={selected} />
              <AirQualityCard airQuality={bundle.airQuality} />
              <AstronomyCard astronomy={bundle.astronomy} timezone={bundle.location.timezone} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
