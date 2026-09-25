"use client";

import { usePreferences } from "@/stores/preferences";
import { cn } from "@/lib/utils/cn";

const UNITS = [
  { value: "celsius", label: "°C" },
  { value: "fahrenheit", label: "°F" },
] as const;

/** Temperature-unit toggle for the header (persisted, PRD §24). */
export function UnitThemeControls() {
  const { unit, setUnit } = usePreferences();

  return (
    <div
      role="group"
      aria-label="Temperature unit"
      className="flex items-center rounded-full border border-outline-variant bg-surface-container p-0.5"
    >
      {UNITS.map((u) => (
        <button
          key={u.value}
          type="button"
          aria-pressed={unit === u.value}
          onClick={() => setUnit(u.value)}
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-semibold transition-colors",
            unit === u.value
              ? "bg-primary/15 text-primary"
              : "text-on-surface-muted hover:text-on-surface",
          )}
        >
          {u.label}
        </button>
      ))}
    </div>
  );
}
