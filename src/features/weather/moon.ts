/**
 * Moon phase utilities.
 * Pure calculation from a known reference new moon (2000-01-06 18:14 UTC).
 * Accuracy is ±1 day; used for display only, never for decisions.
 */

/** Phase index 0..1 where 0 = new moon, 0.5 = full moon. */
export function moonPhaseIndex(date: Date): number {
  const knownNewMoon = Date.UTC(2000, 0, 6, 18, 14);
  const synodicMonth = 29.530588853 * 24 * 60 * 60 * 1000;
  const elapsed = date.getTime() - knownNewMoon;
  const phase = (elapsed % synodicMonth) / synodicMonth;
  return phase < 0 ? phase + 1 : phase;
}

const PHASE_NAMES: Array<{ max: number; name: string }> = [
  { max: 0.033863, name: "New Moon" },
  { max: 0.216106, name: "Waxing Crescent" },
  { max: 0.283894, name: "First Quarter" },
  { max: 0.466106, name: "Waxing Gibbous" },
  { max: 0.533894, name: "Full Moon" },
  { max: 0.716106, name: "Waning Gibbous" },
  { max: 0.783894, name: "Last Quarter" },
  { max: 0.966137, name: "Waning Crescent" },
  { max: Number.POSITIVE_INFINITY, name: "New Moon" },
];

/** Human-readable moon phase name from a 0..1 phase index. */
export function moonPhaseName(phase: number): string {
  const found = PHASE_NAMES.find((p) => phase <= p.max);
  return found?.name ?? "New Moon";
}

/** Emoji glyph for a 0..1 phase index (northern-hemisphere convention). */
export function moonPhaseEmoji(phase: number): string {
  if (phase < 0.033863 || phase >= 0.966137) return "🌑";
  if (phase < 0.216106) return "🌒";
  if (phase < 0.283894) return "🌓";
  if (phase < 0.466106) return "🌔";
  if (phase < 0.533894) return "🌕";
  if (phase < 0.716106) return "🌖";
  if (phase < 0.783894) return "🌗";
  return "🌘";
}
