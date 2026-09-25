/**
 * Minimal server-side TTL cache with stale fallback.
 *
 * Weather data is public and slow-changing, so caching it is both a
 * performance and a provider-quota kindness (PRD §25). User-specific data
 * must NEVER pass through this cache.
 */

interface Entry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, Entry<unknown>>();

export function cacheGet<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    // Expired: keep as stale fallback but signal miss.
    return null;
  }
  return entry.value as T;
}

export function cacheGetStale<T>(key: string): T | null {
  const entry = store.get(key);
  return entry ? (entry.value as T) : null;
}

export function cacheSet<T>(key: string, value: T, ttlMs: number): void {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
  if (store.size > 5_000) {
    const now = Date.now();
    for (const [k, e] of store) {
      if (now > e.expiresAt) store.delete(k);
    }
  }
}

/** Cache TTLs by data type (PRD §25). */
export const CACHE_TTL = {
  weatherBundleMs: 10 * 60 * 1000,
  geocodingMs: 24 * 60 * 60 * 1000,
} as const;

/** Round coordinates to reduce cache fragmentation (~1.1 km grid). */
export function coordKey(lat: number, lon: number): string {
  return `${lat.toFixed(2)},${lon.toFixed(2)}`;
}
