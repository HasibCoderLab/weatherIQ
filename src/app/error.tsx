"use client";

import { useEffect } from "react";

/**
 * Route-level error boundary (PRD §39). Shows a safe message — never a stack
 * trace or internal detail — with a recovery action.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Hook point for observability (Sentry) in the production phase.
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl border border-danger/30 bg-danger/10 px-6 py-10">
      <span aria-hidden="true" className="material-symbols-outlined text-3xl text-danger">
        cloud_off
      </span>
      <h1 className="text-lg font-semibold text-on-surface">Something went wrong</h1>
      <p className="max-w-md text-sm text-on-surface-muted">
        WeatherIQ couldn&apos;t load this view. Your saved locations are safe on this device.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-2 inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-medium text-on-primary"
      >
        Try again
      </button>
    </div>
  );
}
