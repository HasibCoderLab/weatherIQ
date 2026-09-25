"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, EmptyState, IconButton } from "@/components/ui/primitives";
import { SavedLocationsMenu } from "@/components/weather/SavedLocationsMenu";
import { useSavedLocations } from "@/stores/locations";
import type { GeoLocation } from "@/types/domain";

/** Saved locations panel (PRD §16): select, manage, or head to full manager. */
export function SavedLocationsCard({
  onSelect,
  activeLocation,
}: {
  onSelect: (location: GeoLocation) => void;
  activeLocation: GeoLocation | null;
}) {
  const { locations } = useSavedLocations();

  return (
    <Card aria-labelledby="saved-heading">
      <CardHeader>
        <CardTitle>
          <span aria-hidden="true" className="material-symbols-outlined text-primary">
            bookmarks
          </span>
          Saved locations
        </CardTitle>
        <Link
          href="/saved"
          className="text-xs text-on-surface-muted underline decoration-outline hover:text-on-surface"
        >
          Manage
        </Link>
      </CardHeader>

      {locations.length === 0 ? (
        <EmptyState
          icon="bookmark_add"
          title="No saved locations yet"
          description="Save a location to check its weather in one tap."
        />
      ) : (
        <ul className="flex flex-col gap-1">
          {locations.map((saved) => {
            const active =
              activeLocation != null &&
              Math.abs(activeLocation.latitude - saved.latitude) < 0.01 &&
              Math.abs(activeLocation.longitude - saved.longitude) < 0.01;
            return (
              <li key={saved.id} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onSelect(saved)}
                  aria-current={active ? "true" : undefined}
                  className="min-w-0 flex-1 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-surface-container-high/60"
                >
                  <span className="block truncate text-sm font-medium text-on-surface">
                    {saved.label ?? saved.name}
                    {saved.isDefault ? (
                      <span aria-hidden="true" className="material-symbols-outlined ml-1.5 align-[-3px] text-sm text-primary">
                        home
                      </span>
                    ) : null}
                  </span>
                  <span className="block truncate text-xs text-on-surface-muted">
                    {[saved.admin1, saved.country].filter(Boolean).join(", ")}
                  </span>
                </button>
                <SavedLocationsMenu location={saved} />
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
