/**
 * Central environment configuration.
 * Only NEXT_PUBLIC_* values are safe on the client. Everything else is
 * server-only and must never be imported from a client component.
 */

export const siteConfig = {
  name: "WeatherIQ",
  tagline: "Weather that helps you decide.",
  description:
    "WeatherIQ is a personalized weather intelligence platform that turns live weather data into actionable insights for everyday activities, travel, and planning.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
} as const;
