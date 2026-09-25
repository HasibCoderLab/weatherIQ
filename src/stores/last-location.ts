"use client";

/**
 * Last-viewed location, persisted to localStorage.
 *
 * External store so the dashboard can derive its initial selection without a
 * setState-in-effect: the server snapshot is `null` (empty state), and React
 * re-checks the client snapshot after hydration — no mismatch warnings.
 */

import { useSyncExternalStore } from "react";

import type { GeoLocation } from "@/types/domain";

const KEY = "weatheriq.lastLocation.v1";

let cache: GeoLocation | null | undefined;
const listeners = new Set<() => void>();

function validate(value: unknown): GeoLocation | null {
  if (
    value &&
    typeof value === "object" &&
    typeof (value as GeoLocation).latitude === "number" &&
    typeof (value as GeoLocation).longitude === "number" &&
    typeof (value as GeoLocation).name === "string"
  ) {
    return value as GeoLocation;
  }
  return null;
}

function read(): GeoLocation | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return validate(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export function setLastLocation(location: GeoLocation): void {
  cache = location;
  try {
    localStorage.setItem(KEY, JSON.stringify(location));
  } catch {
    // storage unavailable — in-memory copy stays authoritative this session
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function getSnapshot(): GeoLocation | null {
  if (cache === undefined) cache = read();
  return cache;
}

function getServerSnapshot(): GeoLocation | null {
  return null;
}

/** Last-viewed location (null on the server / before first read). */
export function useLastLocation(): GeoLocation | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
