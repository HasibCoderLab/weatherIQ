import { weatherIconName } from "@/features/weather/wmo";
import type { WeatherCondition } from "@/types/domain";
import { cn } from "@/lib/utils/cn";

/** Material Symbols glyph for a weather condition. */
export function WeatherIcon({
  condition,
  size = "md",
  animated = false,
  className,
}: {
  condition: WeatherCondition;
  size?: "sm" | "md" | "lg" | "xl";
  animated?: boolean;
  className?: string;
}) {
  const sizeClass = { sm: "text-xl", md: "text-3xl", lg: "text-5xl", xl: "text-7xl md:text-8xl" }[
    size
  ];
  return (
    <span
      className={cn(
        "material-symbols-outlined text-primary select-none",
        sizeClass,
        animated && "wiq-float",
        className,
      )}
      aria-hidden="true"
      translate="no"
    >
      {weatherIconName(condition.kind, condition.isDaytime)}
    </span>
  );
}
