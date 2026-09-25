import type { Metadata } from "next";
import { WeatherDashboard } from "@/components/weather/WeatherDashboard";
import { siteConfig } from "@/config/env";

export const metadata: Metadata = {
  title: `${siteConfig.name} — ${siteConfig.tagline}`,
  description: siteConfig.description,
};

export default function HomePage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-on-surface md:text-3xl">
          What does the weather mean for you today?
        </h1>
        <p className="text-sm text-on-surface-muted">
          Live data → understanding → recommendation → action. No login needed
          for core weather.
        </p>
      </div>
      <WeatherDashboard />
    </div>
  );
}
