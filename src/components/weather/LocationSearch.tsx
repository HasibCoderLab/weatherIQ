"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { searchLocations, reverseGeocodeClient } from "@/lib/api/client";
import { useDebounce } from "@/hooks/use-debounce";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useSavedLocations } from "@/stores/locations";
import { IconButton, Spinner } from "@/components/ui/primitives";
import { cn } from "@/lib/utils/cn";
import type { GeoLocation } from "@/types/domain";

function locationLabel(location: GeoLocation): string {
  const parts = [location.name, location.admin1, location.country].filter(Boolean);
  return parts.join(", ");
}

function secondaryLabel(location: GeoLocation): string {
  return [location.admin1, location.country].filter(Boolean).join(", ");
}

/**
 * City search with debounced autocomplete (PRD §8.2), saved-location quick
 * picks, and geolocation. Implements the WAI-ARIA combobox/listbox pattern.
 */
export function LocationSearch({
  onSelect,
  className,
}: {
  onSelect: (location: GeoLocation) => void;
  className?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const debouncedQuery = useDebounce(query.trim(), 300);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { locations: savedLocations } = useSavedLocations();
  const geolocation = useGeolocation();

  const searchEnabled = debouncedQuery.length >= 2;
  const { data: results = [], isFetching } = useQuery({
    queryKey: ["geocode", debouncedQuery],
    queryFn: () => searchLocations(debouncedQuery),
    enabled: searchEnabled,
    staleTime: 24 * 60 * 60 * 1000,
    placeholderData: (previous) => previous,
  });

  // Geolocation resolved → reverse geocode to a named location and select it.
  useEffect(() => {
    if (geolocation.status !== "granted" || !geolocation.coordinates) return;
    let cancelled = false;
    void reverseGeocodeClient(geolocation.coordinates.latitude, geolocation.coordinates.longitude).then(
      (location) => {
        if (cancelled) return;
        if (location) {
          onSelect(location);
        } else {
          // Fall back to coordinates without a name — the API accepts them.
          onSelect({
            name: "My location",
            country: "",
            countryCode: "",
            admin1: null,
            latitude: geolocation.coordinates!.latitude,
            longitude: geolocation.coordinates!.longitude,
            timezone: "auto",
          });
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [geolocation.status, geolocation.coordinates, onSelect]);

  // Close on outside interaction.
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const showSaved = !searchEnabled && savedLocations.length > 0;
  const options: Array<{ key: string; location: GeoLocation; secondary: string | null }> = useMemo(() => {
    if (showSaved) {
      return savedLocations.slice(0, 6).map((saved) => ({
        key: saved.id,
        location: saved,
        secondary: secondaryLabel(saved),
      }));
    }
    return results.map((result, index) => ({
      key: `${result.latitude.toFixed(4)},${result.longitude.toFixed(4)},${index}`,
      location: result,
      secondary: secondaryLabel(result) || null,
    }));
  }, [results, savedLocations, showSaved]);

  const choose = (location: GeoLocation) => {
    setOpen(false);
    setQuery("");
    onSelect(location);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, options.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (event.key === "Enter") {
      const picked = options[highlight];
      if (open && picked) {
        event.preventDefault();
        choose(picked.location);
      }
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  const listboxId = "weatheriq-search-listbox";

  return (
    <div ref={rootRef} className={cn("relative w-full", className)}>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <span
            aria-hidden="true"
            className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xl text-on-surface-muted"
          >
            search
          </span>
          <input
            ref={inputRef}
            type="search"
            role="combobox"
            aria-expanded={open && options.length > 0}
            aria-controls={listboxId}
            aria-activedescendant={
              open && highlight >= 0 ? `${listboxId}-option-${highlight}` : undefined
            }
            aria-label="Search for a city"
            aria-autocomplete="list"
            autoComplete="off"
            placeholder="Search any city…"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              // Reset option highlight at the event source — avoids a
              // sync setState inside an effect (react-hooks/set-state-in-effect).
              setHighlight(-1);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            className="h-11 w-full rounded-full border border-outline-variant bg-surface-container pl-10 pr-10 text-sm text-on-surface placeholder:text-on-surface-muted focus:border-primary focus:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {isFetching ? (
            <Spinner className="absolute right-3 top-1/2 size-4 -translate-y-1/2" />
          ) : null}
        </div>
        <IconButton
          label="Use my current location"
          onClick={geolocation.request}
          disabled={geolocation.status === "locating"}
        >
          <span aria-hidden="true" className="material-symbols-outlined">
            my_location
          </span>
        </IconButton>
      </div>

      {/* Geolocation feedback (polite, non-blocking). */}
      <p aria-live="polite" className="min-h-5 px-1 pt-1 text-xs text-on-surface-muted">
        {geolocation.status === "locating" && "Finding your location…"}
        {geolocation.status === "denied" && "Location permission was denied — you can search instead."}
        {geolocation.status === "unavailable" && "Your location is currently unavailable."}
        {geolocation.status === "timeout" && "Locating took too long — please try again."}
      </p>

      {open && options.length > 0 ? (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={showSaved ? "Saved locations" : "Search results"}
          className="absolute z-30 mt-1 max-h-80 w-full overflow-auto rounded-2xl border border-outline-variant bg-surface-container p-1 shadow-xl"
        >
          {showSaved ? (
            <li aria-hidden="true" className="px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-on-surface-muted">
              Saved locations
            </li>
          ) : null}
          {options.map((option, index) => (
            <li
              key={option.key}
              id={`${listboxId}-option-${index}`}
              role="option"
              aria-selected={index === highlight}
              onMouseDown={(event) => {
                // Prevent input blur before click registers.
                event.preventDefault();
                choose(option.location);
              }}
              onMouseEnter={() => setHighlight(index)}
              className={cn(
                "cursor-pointer rounded-xl px-3 py-2.5",
                index === highlight ? "bg-surface-container-high" : "",
              )}
            >
              <p className="text-sm font-medium text-on-surface">{locationLabel(option.location)}</p>
              {option.secondary ? (
                <p className="text-xs text-on-surface-muted">{option.secondary}</p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
