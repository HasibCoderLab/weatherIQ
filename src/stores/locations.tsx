"use client";

/**
 * Saved locations, persisted to localStorage for anonymous users.
 *
 * Implemented as an external store read via `useSyncExternalStore`: the
 * server snapshot is empty, hydration is safe, and mutators write through to
 * localStorage then notify subscribers. No setState-in-effect hydration.
 *
 * The shape intentionally matches the future `FavoriteLocation` DB entity
 * (PRD §33) so a Phase-5 migration to server storage is a data move, not a
 * type rewrite.
 */

import { useCallback, useSyncExternalStore, type ReactNode } from "react";
import type { GeoLocation } from "@/types/domain";

export interface SavedLocation extends GeoLocation {
  id: string;
  label: string | null;
  isDefault: boolean;
  savedAt: string;
}

const STORAGE_KEY = "weatheriq.locations.v1";
const EMPTY: SavedLocation[] = [];

let cache: SavedLocation[] = EMPTY;
let initialized = false;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function validateList(value: unknown): SavedLocation[] {
  if (!Array.isArray(value)) return [];
  const valid: SavedLocation[] = [];
  for (const item of value) {
    if (
      item &&
      typeof item === "object" &&
      typeof (item as SavedLocation).id === "string" &&
      typeof (item as SavedLocation).name === "string" &&
      typeof (item as SavedLocation).latitude === "number" &&
      typeof (item as SavedLocation).longitude === "number"
    ) {
      valid.push(item as SavedLocation);
    }
  }
  return valid;
}

function read(): SavedLocation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    return validateList(JSON.parse(raw) as unknown);
  } catch {
    return EMPTY;
  }
}

function persist(next: SavedLocation[]): void {
  cache = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // storage unavailable — in-memory copy stays authoritative this session
  }
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function getSnapshot(): SavedLocation[] {
  if (!initialized) {
    initialized = true;
    cache = read();
  }
  return cache;
}

function getServerSnapshot(): SavedLocation[] {
  return EMPTY;
}

export function useSavedLocations() {
  const locations = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const addLocation = useCallback((location: GeoLocation, label?: string): SavedLocation => {
    const saved: SavedLocation = {
      ...location,
      id: `${location.latitude.toFixed(4)},${location.longitude.toFixed(4)}`,
      label: label ?? null,
      isDefault: false,
      savedAt: new Date().toISOString(),
    };
    const current = getSnapshot();
    if (current.some((l) => l.id === saved.id)) {
      return current.find((l) => l.id === saved.id)!;
    }
    const next = [saved, ...current];
    // First saved location becomes the default.
    if (next.length === 1) next[0] = { ...next[0]!, isDefault: true };
    persist(next);
    return next[0]!;
  }, []);

  const removeLocation = useCallback((id: string) => {
    const next = getSnapshot().filter((l) => l.id !== id);
    // Keep exactly one default when possible.
    if (next.length > 0 && !next.some((l) => l.isDefault)) {
      next[0] = { ...next[0]!, isDefault: true };
    }
    persist(next);
  }, []);

  const renameLocation = useCallback((id: string, label: string) => {
    persist(getSnapshot().map((l) => (l.id === id ? { ...l, label } : l)));
  }, []);

  const moveLocation = useCallback((id: string, direction: -1 | 1) => {
    const prev = getSnapshot();
    const index = prev.findIndex((l) => l.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= prev.length) return;
    const next = [...prev];
    const item = next[index]!;
    next[index] = next[target]!;
    next[target] = item;
    persist(next);
  }, []);

  const setDefaultLocation = useCallback((id: string) => {
    persist(getSnapshot().map((l) => ({ ...l, isDefault: l.id === id })));
  }, []);

  return {
    locations,
    /** Hydration is instant via the external store; kept for API compatibility. */
    isLoaded: true,
    addLocation,
    removeLocation,
    renameLocation,
    moveLocation,
    setDefaultLocation,
  };
}

/**
 * Kept so the provider tree in the root layout stays stable; the store is
 * module-scoped, so no actual provider value is needed anymore.
 */
export function LocationsProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
