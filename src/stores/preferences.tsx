"use client";

/**
 * Client preferences: temperature unit + theme (PRD §24).
 *
 * External store read via `useSyncExternalStore` — server snapshot uses
 * defaults, hydration is safe, and writes go through to localStorage. No
 * setState-in-effect hydration.
 */

import { useCallback, useSyncExternalStore, type ReactNode } from "react";
import type { TemperatureUnit } from "@/lib/utils/format";

export type ThemeMode = "light" | "dark" | "system";

interface Preferences {
  unit: TemperatureUnit;
  theme: ThemeMode;
  resolvedTheme: "light" | "dark";
}

const STORAGE_KEY = "weatheriq.preferences.v1";

const DEFAULTS: Preferences = { unit: "celsius", theme: "system", resolvedTheme: "light" };

let state: Preferences = DEFAULTS;
let initialized = false;
const listeners = new Set<() => void>();
let media: MediaQueryList | null = null;

function emit(): void {
  for (const listener of listeners) listener();
}

function resolve(theme: ThemeMode): "light" | "dark" {
  if (theme !== "system") return theme;
  const prefersDark =
    typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
}

function applyTheme(resolved: "light" | "dark"): void {
  document.documentElement.classList.toggle("dark", resolved === "dark");
}

function persist(next: Preferences): void {
  state = next;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ unit: next.unit, theme: next.theme } satisfies Pick<Preferences, "unit" | "theme">),
    );
  } catch {
    // storage unavailable — keep in-memory value
  }
  applyTheme(next.resolvedTheme);
  emit();
}

function isUnit(value: unknown): value is TemperatureUnit {
  return value === "celsius" || value === "fahrenheit";
}

function isTheme(value: unknown): value is ThemeMode {
  return value === "light" || value === "dark" || value === "system";
}

function initialize(): void {
  if (initialized) return;
  initialized = true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { unit?: unknown; theme?: unknown };
      const unit = isUnit(parsed.unit) ? parsed.unit : DEFAULTS.unit;
      const theme = isTheme(parsed.theme) ? parsed.theme : DEFAULTS.theme;
      const resolvedTheme = resolve(theme);
      state = { unit, theme, resolvedTheme };
      applyTheme(resolvedTheme);
      return;
    }
  } catch {
    // corrupted storage — fall back to defaults
  }
  applyTheme(DEFAULTS.resolvedTheme);
}

function onSystemThemeChange(): void {
  if (state.theme !== "system") return;
  const resolvedTheme = resolve("system");
  if (resolvedTheme === state.resolvedTheme) return;
  state = { ...state, resolvedTheme };
  applyTheme(resolvedTheme);
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (media == null) {
    media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", onSystemThemeChange);
    window.addEventListener("storage", (event) => {
      if (event.key === STORAGE_KEY) onSystemThemeChange();
    });
  }
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): Preferences {
  initialize();
  return state;
}

function getServerSnapshot(): Preferences {
  return DEFAULTS;
}

export function usePreferences() {
  const preferences = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setUnit = useCallback((unit: TemperatureUnit) => {
    persist({ ...getSnapshot(), unit });
  }, []);

  const setTheme = useCallback((theme: ThemeMode) => {
    persist({ ...getSnapshot(), theme, resolvedTheme: resolve(theme) });
  }, []);

  return { ...preferences, setUnit, setTheme };
}

/**
 * Kept so the provider tree in the root layout stays stable; the store is
 * module-scoped, so no actual provider value is needed anymore.
 */
export function PreferencesProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
