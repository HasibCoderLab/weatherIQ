import { NextResponse } from "next/server";
import { z } from "zod";
import { OpenMeteoProvider, reverseGeocode } from "@/features/weather/open-meteo";
import { cacheGet, cacheSet, CACHE_TTL } from "@/lib/api/cache";
import { clientKey, rateLimit } from "@/lib/api/rate-limit";

export const runtime = "nodejs";

const searchSchema = z.object({ q: z.string().min(2).max(80) }).strict();
const reverseSchema = z
  .object({
    lat: z.coerce.number().min(-90).max(90),
    lon: z.coerce.number().min(-180).max(180),
  })
  .strict();

/**
 * GET /api/geocode?q=london   → forward search
 * GET /api/geocode?lat=&lon=  → reverse geocode
 *
 * Proxies Open-Meteo's geocoding API server-side, applies Nominatim-style
 * usage discipline via rate limiting, and caches results for a day.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const limit = rateLimit(clientKey(request, "geocode"), 40, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const url = new URL(request.url);
  const q = url.searchParams.get("q");
  const lat = url.searchParams.get("lat");
  const lon = url.searchParams.get("lon");

  if (q != null) {
    const parsed = searchSchema.safeParse({ q });
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid search query." }, { status: 400 });
    }
    const key = `geocode:q:${parsed.data.q.toLowerCase().trim()}`;
    const cached = cacheGet<unknown>(key);
    if (cached) return NextResponse.json(cached);

    const provider = new OpenMeteoProvider();
    const results = await provider.searchLocations(parsed.data.q);
    cacheSet(key, results, CACHE_TTL.geocodingMs);
    return NextResponse.json(results);
  }

  if (lat != null && lon != null) {
    const parsed = reverseSchema.safeParse({ lat, lon });
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid coordinates." }, { status: 400 });
    }
    const key = `geocode:r:${parsed.data.lat.toFixed(2)},${parsed.data.lon.toFixed(2)}`;
    const cached = cacheGet<unknown>(key);
    if (cached) return NextResponse.json(cached);

    const location = await reverseGeocode({
      latitude: parsed.data.lat,
      longitude: parsed.data.lon,
    });
    if (!location) {
      return NextResponse.json({ error: "Location not found." }, { status: 404 });
    }
    cacheSet(key, location, CACHE_TTL.geocodingMs);
    return NextResponse.json(location);
  }

  return NextResponse.json({ error: "Provide q, or lat and lon." }, { status: 400 });
}
