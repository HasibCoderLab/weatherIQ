"use client";

import { useState } from "react";
import { LocationSearch } from "@/components/weather/LocationSearch";
import { SavedLocationsMenu } from "@/components/weather/SavedLocationsMenu";
import { EmptyState, IconButton } from "@/components/ui/primitives";
import { useSavedLocations, type SavedLocation } from "@/stores/locations";
import { usePreferences } from "@/stores/preferences";
import { useWeather } from "@/hooks/use-weather";
import { WeatherIcon } from "@/components/weather/WeatherIcon";
import { formatTemperatureLabel, type TemperatureUnit } from "@/lib/utils/format";
import type { GeoLocation } from "@/types/domain";

/** Saved locations manager (PRD §16): search-add, reorder, rename, default. */
export function SavedLocationsManager() {
  const { locations, isLoaded, addLocation, moveLocation } = useSavedLocations();
  const { unit } = usePreferences();
  const [addedId, setAddedId] = useState<string | null>(null);

  const handleAddFromSearch = (location: GeoLocation) => {
    const saved = addLocation(location);
    setAddedId(saved.id);
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-on-surface">Saved locations</h1>
        <p className="mt-1 text-sm text-on-surface-muted">
          Saved on this device — no account needed. Reorder, rename, or set a default.
        </p>
      </div>

      <LocationSearch onSelect={handleAddFromSearch} className="max-w-xl" />

      {addedId ? (
        <p role="status" className="text-sm text-primary">
          Location saved.
        </p>
      ) : null}

      {!isLoaded ? null : locations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-outline-variant px-6 py-12">
          <EmptyState
            icon="bookmarks"
            title="No saved locations yet"
            description="Search above and save the places you check most — home, office, family, or a favorite travel spot."
          />
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {locations.map((saved, index) => (
            <SavedLocationRow
              key={saved.id}
              saved={saved}
              unit={unit}
              index={index}
              count={locations.length}
              onMove={(direction) => moveLocation(saved.id, direction)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function SavedLocationRow({
  saved,
  unit,
  index,
  count,
  onMove,
}: {
  saved: SavedLocation;
  unit: TemperatureUnit;
  index: number;
  count: number;
  onMove: (direction: -1 | 1) => void;
}) {
  const { bundle } = useWeather({
    latitude: saved.latitude,
    longitude: saved.longitude,
    name: saved.name,
    country: saved.country,
  });

  return (
    <li className="wiq-card flex items-center gap-2 p-3">
      <div className="flex flex-col">
        <IconButton
          label={`Move ${saved.label ?? saved.name} up`}
          disabled={index === 0}
          onClick={() => onMove(-1)}
          className="size-8"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-base">
            keyboard_arrow_up
          </span>
        </IconButton>
        <IconButton
          label={`Move ${saved.label ?? saved.name} down`}
          disabled={index === count - 1}
          onClick={() => onMove(1)}
          className="size-8"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-base">
            keyboard_arrow_down
          </span>
        </IconButton>
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-on-surface">
          {saved.label ?? saved.name}
          {saved.isDefault ? (
            <span
              aria-hidden="true"
              className="material-symbols-outlined ml-1.5 align-[-3px] text-sm text-primary"
            >
              home
            </span>
          ) : null}
        </p>
        <p className="truncate text-xs text-on-surface-muted">
          {[saved.admin1, saved.country].filter(Boolean).join(", ")}
        </p>
      </div>

      {bundle ? (
        <div className="flex items-center gap-2 text-right">
          <WeatherIcon condition={bundle.current.condition} size="sm" />
          <div>
            <span className="text-lg font-semibold text-on-surface">
              {formatTemperatureLabel(bundle.current.temperature, unit)}
            </span>
            <span className="block text-xs text-on-surface-muted">
              {bundle.current.condition.label}
            </span>
          </div>
        </div>
      ) : (
        <span className="text-xs text-on-surface-muted">Loading…</span>
      )}

      <SavedLocationsMenu location={saved} />
    </li>
  );
}
