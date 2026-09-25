"use client";

import { useSyncExternalStore } from "react";

/**
 * Ticking wall-clock milliseconds for relative labels ("12 minutes ago") and
 * "next N hours" windows.
 *
 * Snapshot contract: `getSnapshot` returns a cached value that only changes
 * when the shared interval ticks — returning `Date.now()` directly would
 * re-render forever. The server snapshot is `null`; callers pass a fallback
 * (e.g. the bundle's fetch time) so SSR output stays accurate ("just now").
 */

const SERVER_NOW = 0;

let current: number | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

function tick(): void {
  current = Date.now();
  for (const listener of listeners) listener();
}

function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  if (timer == null) {
    current = Date.now();
    timer = setInterval(tick, 30_000);
  }
  return () => {
    listeners.delete(onStoreChange);
    if (listeners.size === 0 && timer != null) {
      clearInterval(timer);
      timer = null;
      current = null;
    }
  };
}

function getSnapshot(): number {
  // First subscriber already initialized via subscribe(); safe fallback:
  return current ?? Date.now();
}
function getServerSnapshot(): number {
  return SERVER_NOW;
}

/**
 * Wall-clock milliseconds, updated every 30s while any component subscribes.
 * `fallbackMs` is used on the server (and during hydration) — pass the data's
 * fetch time so relative labels render sensibly in SSR HTML. Required (not a
 * default parameter) because Date.now() may not run during render.
 */
export function useNowMs(fallbackMs: number): number {
  return useSyncExternalStore(subscribe, getSnapshot, () => fallbackMs || SERVER_NOW);
}
