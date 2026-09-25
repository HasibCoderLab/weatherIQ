import type { ReactNode } from "react";
import { siteConfig } from "@/config/env";

/**
 * Application shell: header, main landmark and footer.
 * Server Component — interactive elements live in client components below.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-outline-variant/60 bg-surface/85 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <span
              className="material-symbols-outlined text-primary"
              aria-hidden="true"
            >
              partly_cloudy_day
            </span>
            <span className="text-lg font-semibold tracking-tight text-on-surface">
              {siteConfig.name}
            </span>
            <span className="rounded-full border border-outline-variant px-2 py-0.5 text-[11px] text-on-surface-muted">
              MVP
            </span>
          </div>
          <p className="hidden text-sm text-on-surface-muted md:block">
            {siteConfig.tagline}
          </p>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {children}
      </main>
      <footer className="border-t border-outline-variant/60 py-6">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 text-xs text-on-surface-muted">
          <p>
            Weather data: Open-Meteo · Geocoding: OpenStreetMap Nominatim ·
            Calculated insights are labeled and are never official warnings.
          </p>
          <p>Legacy SkyLens dashboard preserved in legacy/.</p>
        </div>
      </footer>
    </div>
  );
}
