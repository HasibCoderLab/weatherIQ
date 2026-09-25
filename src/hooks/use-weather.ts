"use client";

import { useQuery } from "@tanstack/react-query";
import type { WeatherBundle } from "@/types/domain";
import { fetchWeatherBundle } from "@/lib/api/client";

export interface WeatherQueryResult {
  bundle: WeatherBundle | undefined;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  /** True when serving data while offline. */
  isOffline: boolean;
  /** True when the server served last-known data after a provider failure. */
  isStale: boolean;
  refetch: () => void;
  isFetching: boolean;
}

/**
 * Client-side weather data hook.
 * TanStack Query handles dedup, retries and window refocus — the right tool
 * for client-side server-state sync (PRD §29).
 */
export function useWeather(params: {
  latitude: number;
  longitude: number;
  name?: string;
  country?: string;
  /** Skip the query entirely (e.g. before a location is chosen). */
  enabled?: boolean;
}): WeatherQueryResult {
  const query = useQuery({
    queryKey: ["weather", params.latitude.toFixed(3), params.longitude.toFixed(3)],
    queryFn: () => fetchWeatherBundle(params),
    enabled: params.enabled ?? true,
    staleTime: 10 * 60 * 1000,
    retry: 1,
    // Keep the last-known bundle visible on provider failure (PRD §39).
    placeholderData: (previous) => previous,
  });

  return {
    bundle: query.data?.bundle,
    isPending: query.isPending,
    isError: query.isError,
    error: query.error instanceof Error ? query.error : null,
    isOffline: typeof navigator !== "undefined" && !navigator.onLine,
    isStale: query.data?.isStale ?? false,
    refetch: () => void query.refetch(),
    isFetching: query.isFetching,
  };
}
