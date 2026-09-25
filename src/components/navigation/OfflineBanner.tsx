"use client";

import { useOnlineStatus } from "@/hooks/use-online-status";

/**
 * Offline indicator (PRD §26/§35). Data staleness itself is shown per-card via
 * `formatTimeAgo` — this banner only communicates connectivity status.
 */
export function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;

  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 bg-amber-500/15 px-4 py-1.5 text-sm text-amber-500"
    >
      <span aria-hidden="true" className="material-symbols-outlined text-base">
        wifi_off
      </span>
      You&apos;re offline. Showing the last known data.
    </div>
  );
}
