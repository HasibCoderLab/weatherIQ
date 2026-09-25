/**
 * Tiny `cn` helper — joins conditional class names without pulling in
 * clsx/tailwind-merge for an MVP that doesn't need conflict resolution.
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
