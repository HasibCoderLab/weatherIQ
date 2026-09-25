import { describe, expect, it } from "vitest";
import { CACHE_TTL, cacheGet, cacheGetStale, cacheSet, coordKey } from "@/lib/api/cache";
import { clientKey, rateLimit } from "@/lib/api/rate-limit";

describe("cache", () => {
  it("returns values before expiry", () => {
    cacheSet("test:fresh", { a: 1 }, 60_000);
    expect(cacheGet<{ a: number }>("test:fresh")).toEqual({ a: 1 });
  });

  it("misses after expiry but keeps a stale fallback", () => {
    cacheSet("test:expiring", "value", 1);
    // Advance past expiry.
    busyWait(5);
    expect(cacheGet("test:expiring")).toBeNull();
    expect(cacheGetStale("test:expiring")).toBe("value");
  });

  it("returns null for unknown keys", () => {
    expect(cacheGet("test:unknown")).toBeNull();
    expect(cacheGetStale("test:unknown")).toBeNull();
  });

  it("rounds coordinates to a stable cache grid", () => {
    expect(coordKey(51.5072, -0.1276)).toBe(coordKey(51.5079, -0.1271));
    expect(coordKey(51.5072, -0.1276)).toBe("51.51,-0.13");
  });

  it("documents weather/geocoding TTLs", () => {
    expect(CACHE_TTL.weatherBundleMs).toBe(10 * 60 * 1000);
    expect(CACHE_TTL.geocodingMs).toBe(24 * 60 * 60 * 1000);
  });
});

/** Busy-wait: the cache's expiry check is wall-clock based. */
function busyWait(ms: number): void {
  const start = Date.now();
  while (Date.now() - start < ms) {
    // spin
  }
}

describe("rateLimit", () => {
  it("allows requests under the limit and blocks beyond it", () => {
    const key = "test:rl-burst";
    const results = Array.from({ length: 5 }, () => rateLimit(key, 3, 60_000, 1_000_000));
    expect(results[0]!.allowed).toBe(true);
    expect(results[2]!.allowed).toBe(true);
    expect(results[3]!.allowed).toBe(false);
    expect(results[4]!.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("slides the window", () => {
    const key = "test:rl-slide";
    expect(rateLimit(key, 1, 1_000, 2_000_000).allowed).toBe(true);
    expect(rateLimit(key, 1, 1_000, 2_000_500).allowed).toBe(false);
    expect(rateLimit(key, 1, 1_000, 3_000_001).allowed).toBe(true);
  });

  it("scopes keys per route via clientKey", () => {
    const request = new Request("https://weatheriq.test/api/weather", {
      headers: { "x-forwarded-for": "203.0.113.7, 70.41.3.2" },
    });
    const key = clientKey(request, "weather");
    expect(key).toBe("weather:203.0.113.7");
  });
});
