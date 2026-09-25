/**
 * Typed client for WeatherIQ's own API routes.
 * Browser code must only talk to these endpoints, never to weather providers.
 */

import type { GeoLocation, WeatherBundle } from "@/types/domain";

export class ApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function parse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = "Request failed. Please try again.";
    try {
      const body = (await response.json()) as { error?: string };
      if (typeof body.error === "string") message = body.error;
    } catch {
      // keep default message
    }
    throw new ApiError(message, response.status);
  }
  return (await response.json()) as T;
}

export interface WeatherBundleResult {
  bundle: WeatherBundle;
  /** True when the server served last-known data after a provider failure. */
  isStale: boolean;
}

export async function fetchWeatherBundle(params: {
  latitude: number;
  longitude: number;
  name?: string;
  country?: string;
}): Promise<WeatherBundleResult> {
  const qs = new URLSearchParams({
    lat: params.latitude.toFixed(4),
    lon: params.longitude.toFixed(4),
  });
  if (params.name) qs.set("name", params.name);
  if (params.country) qs.set("country", params.country);

  const response = await fetch(`/api/weather?${qs.toString()}`, {
    headers: { Accept: "application/json" },
  });
  const bundle = await parse<WeatherBundle>(response);
  // Stale-while-error responses carry this marker (PRD §26: never present
  // stale data as live).
  const isStale = response.headers.get("X-WeatherIQ-Stale") === "true";
  return { bundle, isStale };
}

export async function searchLocations(query: string): Promise<GeoLocation[]> {
  const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`, {
    headers: { Accept: "application/json" },
  });
  return parse<GeoLocation[]>(response);
}

export async function reverseGeocodeClient(
  latitude: number,
  longitude: number,
): Promise<GeoLocation | null> {
  try {
    const response = await fetch(`/api/geocode?lat=${latitude}&lon=${longitude}`, {
      headers: { Accept: "application/json" },
    });
    if (response.status === 404) return null;
    return await parse<GeoLocation>(response);
  } catch {
    return null;
  }
}
