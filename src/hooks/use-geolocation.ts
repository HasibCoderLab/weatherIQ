"use client";

import { useCallback, useRef, useState } from "react";

export type GeoStatus = "idle" | "locating" | "granted" | "denied" | "unavailable" | "timeout";

interface GeolocationState {
  status: GeoStatus;
  coordinates: { latitude: number; longitude: number } | null;
  request: () => void;
}

const FRIENDLY_ERRORS: Record<number, string> = {
  1: "Location permission was denied. You can still search for any city.",
  2: "Your location is currently unavailable.",
  3: "Locating you took too long. Please try again.",
};

/** Browser geolocation with explicit states and friendly error copy. */
export function useGeolocation(): GeolocationState {
  const [status, setStatus] = useState<GeoStatus>("idle");
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const watchId = useRef<number | null>(null);

  const request = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unavailable");
      return;
    }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setStatus("granted");
        if (watchId.current != null) {
          navigator.geolocation.clearWatch(watchId.current);
          watchId.current = null;
        }
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) setStatus("denied");
        else if (error.code === error.POSITION_UNAVAILABLE) setStatus("unavailable");
        else setStatus("timeout");
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60 * 1000 },
    );
  }, []);

  return { status, coordinates, request };
}
