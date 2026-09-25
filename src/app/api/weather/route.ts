import { NextResponse } from "next/server";
import { z } from "zod";
import { OpenMeteoProvider, ProviderError, reverseGeocode } from "@/features/weather/open-meteo";
import { cacheGet, cacheGetStale, cacheSet, CACHE_TTL, coordKey } from "@/lib/api/cache";
import { clientKey, rateLimit } from "@/lib/api/rate-limit";

export const runtime = "nodejs";

const querySchema = z
  .object({
    lat: z.coerce.number().min(-90).max(90),
    lon: z.coerce.number().min(-180).max(180),
    name: z.string().max(120).optional(),
    country: z.string().max(120).optional(),
  })
  .strict();

/**
 * GET /api/weather?lat=&lon=&name=&country=
 *
 * Browser → Next.js server → cache → provider. The browser never sees
 * provider URLs or credentials. Failures fall back to stale cache with a
 * `stale: true` marker so the UI can communicate data freshness honestly.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const limit = rateLimit(clientKey(request, "weather"), 30, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    lat: url.searchParams.get("lat"),
    lon: url.searchParams.get("lon"),
    name: url.searchParams.get("name") ?? undefined,
    country: url.searchParams.get("country") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid location parameters." }, { status: 400 });
  }

  const { lat, lon, name, country } = parsed.data;
  const key = `weather:${coordKey(lat, lon)}`;

  const cached = cacheGet<unknown>(key);
  if (cached) {
    return NextResponse.json(cached, { headers: { "Cache-Control": "public, max-age=300" } });
  }

  const provider = new OpenMeteoProvider();
  try {
    const location =
      name && country
        ? { name, country, countryCode: "", admin1: null, latitude: lat, longitude: lon, timezone: "auto" }
        : ((await reverseGeocode({ latitude: lat, longitude: lon })) ?? {
            name: name ?? "Unknown location",
            country: country ?? "",
            countryCode: "",
            admin1: null,
            latitude: lat,
            longitude: lon,
            timezone: "auto",
          });

    const bundle = await provider.getBundle(location);
    cacheSet(key, bundle, CACHE_TTL.weatherBundleMs);
    return NextResponse.json(bundle, { headers: { "Cache-Control": "public, max-age=300" } });
  } catch (error) {
    // Stale-while-error: serve last-known data rather than a hard failure.
    const stale = cacheGetStale<unknown>(key);
    if (stale) {
      return NextResponse.json(stale, {
        status: 200,
        headers: { "Cache-Control": "no-store", "X-WeatherIQ-Stale": "true" },
      });
    }
    const message =
      error instanceof ProviderError
        ? "Weather data is temporarily unavailable. Please try again shortly."
        : "Something went wrong while fetching weather data.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
