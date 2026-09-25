# WeatherIQ

> Weather that helps you decide.

WeatherIQ is a personal weather intelligence platform that turns live weather
data into actionable insights for everyday activities, travel, and planning.
It does not stop at "31°C, 65% rain" — it tells you **when** rain is likely,
**which hours** are best for being outside, and **whether** to take an
umbrella.

## Product loop

```text
Weather Data → Understanding → Personal Context → Intelligence → Recommendation → Action
```

Every feature strengthens this loop. Scores and recommendations are
deterministic and explainable, and are never presented as official weather
warnings.

## Current status — MVP core dashboard (PRD Phases 0–3)

**Implemented**

- Current conditions: temperature, feels-like, hi/lo, humidity, wind + gusts,
  pressure, cloud cover, dew point, precipitation
- Weather Intelligence card: rain onset, UV, wind trends, temperature swings,
  best outdoor window, umbrella recommendation — every insight tagged with its
  source (observed / forecast / calculated / recommendation)
- Hourly strip (next 24 h) and 7-day forecast with expandable details
- Air quality (European AQI + PM2.5, PM10, NO₂, O₃, SO₂, CO, NH₃) with cautious
  health copy
- Astronomy: sunrise, sunset, daylight duration, moon phase
- Debounced city search (combobox pattern) + browser geolocation
- Saved locations: add, rename, remove, reorder, set default (localStorage,
  anonymous-first — no login wall)
- Temperature unit (°C/°F) and light/dark/system theme, persisted
- Offline banner and honest data-freshness labeling ("updated 12 minutes ago",
  "Last known data" when serving stale cache)
- Server-side weather proxy with caching, rate limiting, and stale-while-error
  fallback; zero provider exposure to the browser

**Next (PRD Phases 4–9)**: 3D globe, activity planner UI, travel planner,
authentication, alerts, AI assistant, PWA, SEO location pages, CI/CD.

## Tech stack

- Next.js 16 (App Router, Server Components by default), React 19, strict
  TypeScript (no `any`)
- Tailwind CSS v4 (CSS-first tokens, semantic light/dark themes)
- TanStack Query for client-side server-state sync
- Zod-validated Open-Meteo provider behind a swap-friendly `WeatherProvider`
  interface
- Vitest for pure domain logic (75 tests)

## Getting started

```bash
npm install
cp .env.example .env.local   # optional — works with zero configuration
npm run dev                  # http://localhost:3000
```

No API keys are required: Open-Meteo is free and key-less. All provider traffic
goes through WeatherIQ's own `/api/weather` and `/api/geocode` routes, so
nothing is exposed to the browser.

## Scripts

```bash
npm run dev         # development server
npm run build       # production build
npm run start       # serve the production build
npm run lint        # eslint (zero warnings allowed)
npm run typecheck   # tsc --noEmit
npm test            # vitest unit tests (domain logic)
```

## Architecture

```text
src/
├── app/                 # App Router: pages, API route handlers
│   ├── api/weather/     # Server proxy: cache → provider → stale fallback
│   ├── api/geocode/     # Search + reverse geocoding proxy
│   ├── saved/           # Saved locations manager
│   └── loading/error/not-found
├── components/
│   ├── ui/              # Primitives: Button, Card, Badge, Skeleton…
│   ├── navigation/      # AppShell, unit/theme controls, offline banner
│   └── weather/         # Domain cards; presentational, receive domain types
├── features/            # Business logic — no React
│   └── weather/         # Provider, Zod schemas, intelligence engine, WMO
├── hooks/               # use-weather, use-geolocation, use-now…
├── stores/              # External stores: locations, preferences, last view
├── lib/                 # API client, cache, rate limiting, formatters
├── config/              # Environment & site config
├── styles/              # Tailwind v4 design tokens
└── types/               # Domain types (UI never sees provider shapes)

legacy/                  # Archived SkyLens vanilla-JS app (feature reference)
```

Rules of thumb: business logic lives in `features/`, never in components;
external API responses are Zod-validated before entering the domain; secrets
stay server-side; every card has loading, error, empty, and stale states.

## Icon font

`public/fonts/material-symbols-outlined.woff2` is a ~6 KB subset of Material
Symbols containing only the ligatures the UI uses. See
`public/fonts/README.md` to regenerate it after adding icons.

## Legacy

The original SkyLens vanilla-JS dashboard (static HTML/CSS/JS with hardcoded
keys) is archived under `legacy/` for feature-parity reference. It is excluded
from build, typecheck, and lint. Do not copy its credentials patterns; the
OpenWeatherMap key that was committed historically must be rotated.
