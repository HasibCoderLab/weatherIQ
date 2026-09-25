# 📊 SkyLens Weather Dashboard — Full Codebase Analysis

> Generated: September 25, 2026 · Branch: `main`

---

## 1. Project Overview

**SkyLens** is a real-time **weather dashboard PWA** (Progressive Web App) featuring an interactive **3D Earth globe**, hourly/7-day forecasts, air quality metrics, and a glassmorphism UI. It is a **100% static, client-side app** — no backend, no build step, no package manager. Deployable directly to GitHub Pages / Netlify / any static host.

---

## 2. Technology Stack

| Layer | Technology | Version / Details |
|-------|-----------|-------------------|
| **Core** | Vanilla HTML5 / CSS3 / JavaScript (ES6+) | No framework (React/Vue/etc.), no bundler |
| **Styling** | Tailwind CSS | Via **CDN** (`cdn.tailwindcss.com`) with custom config (Material 3 tokens) |
| **Design System** | Material Design 3 color tokens | `surface-container`, `primary-fixed-dim`, etc. |
| **Icons** | Material Symbols Outlined | Google Fonts, variable weight/fill |
| **Typography** | Inter | Google Fonts (400/600/700) |
| **3D Globe** | CesiumJS | v1.121 (CDN), WebGL, `UrlTemplateImageryProvider` tiles |
| **2D Map** | Leaflet | Present in code (`js/map.js`, `js/components/map.js`) but **not loaded in index.html** (legacy) |
| **Weather API** | OpenWeatherMap | Current weather, 5-day forecast, UV, air pollution, map tiles |
| **Forecast API** | Open-Meteo | Hourly forecast data |
| **Geocoding** | Nominatim (OpenStreetMap) | Search + reverse geocoding |
| **Map Tiles** | CARTO (dark), Esri World Imagery, OpenStreetMap | CORS-safe free sources |
| **PWA** | `manifest.json` + `sw.js` (Service Worker) | Installable, offline-capable |
| **Browser APIs** | Geolocation, WebGL, localStorage, Fetch, Clipboard/Share API, Cache Storage | |
| **Storage** | localStorage + Cache API (SW) | Theme, favorites, temp unit, last location, offline data |

---

## 3. Project Structure

```
├── index.html                  # Single-page app (SPA shell) — Tailwind CDN + Material 3 config
├── manifest.json               # PWA manifest (name, icons, theme colors)
├── sw.js                       # Service Worker — 3 caching strategies
├── structure.txt               # Old file tree (outdated, UTF-16 encoded)
│
├── css/
│   ├── styles.css              # ~4,000 lines — design tokens, glassmorphism, components, utilities
│   └── leaflet-overrides.css   # Leaflet skin (legacy)
│
├── js/
│   ├── app.js                  # ⭐ MAIN RUNTIME — ~3,700-line IIFE monolith (v3.1, active)
│   ├── cesium-globe.js         # ⭐ 3D Globe module — IIFE singleton (CesiumGlobe)
│   │
│   ├── config.js               # ES module: CONFIG + STORAGE_KEYS (duplicate of app.js config)
│   ├── state.js                # AppState class — pub/sub state management (ES module)
│   ├── geolocation.js          # GeolocationManager class (legacy, script-style)
│   ├── weather.js              # WeatherManager class (legacy, script-style)
│   ├── map.js                  # MapManager class — Leaflet (legacy, script-style)
│   │
│   ├── components/
│   │   ├── ui.js               # UIManager — toasts, suggestions (ES module)
│   │   └── map.js              # MapComponent — Leaflet wrapper (ES module)
│   │
│   ├── services/
│   │   ├── weather.js          # WeatherService — fetch + retry + cache (ES module)
│   │   ├── geocoding.js        # GeocodingService — Nominatim wrapper (ES module)
│   │   └── cache.js            # WeatherCache (in-memory TTL) + OfflineStorage (localStorage)
│   │
│   └── utils/
│       ├── format.js           # formatTime/Temperature/Wind/Visibility, debounce
│       └── validators.js       # sanitizeInput, validateCoordinates, rateLimiter
│
├── assets/
│   ├── icons/
│   └── images/                 # PWA icons
│
├── stitch_skypulse_weather_dashboard/   # Design prototypes (from Stitch AI)
│   ├── atmospheric_glass/DESIGN.md
│   ├── weather_dashboard_london/{code.html, screen.png}
│   └── weather_dashboard_london_mobile/{code.html, screen.png}
│
├── IMPROVEMENTS.md             # Feature roadmap (UI/UX, APIs, performance)
├── CSS_IMPROVEMENTS.md         # CSS audit doc (duplicates, organization issues)
└── CODEBASE_ANALYSIS.md        # ← This file
```

---

## 4. Architecture Analysis

### 4.1 Two Generations of Code Coexist

| Generation | Files | Style | Status |
|------------|-------|-------|--------|
| **v1 (Legacy)** | `js/weather.js`, `js/map.js`, `js/geolocation.js`, `js/components/map.js` | Global `class` + script tags, Leaflet 2D map | ❌ Not loaded by `index.html` — dead code |
| **v2 (Modular refactor)** | `js/state.js`, `js/services/*`, `js/components/ui.js`, `js/utils/*`, `js/config.js` | ES modules with imports/exports, pub/sub state | ⚠️ Written but **never wired in** — `index.html` doesn't load them, and `<script type="module">` is never used |
| **v3 (Active)** | `js/app.js` + `js/cesium-globe.js` | One big IIFE + one IIFE singleton, Cesium 3D globe | ✅ This is what actually runs |

**Result:** roughly half of `js/` is unused at runtime. The refactor was abandoned mid-way.

### 4.2 Active Data Flow (v3)

```
DOM ready
  └─ app.js init()
      ├─ initElements()        → 100+ getElementById references
      ├─ bindEvents()          → search, theme, favorites, share, globe toolbar
      ├─ initGlobe()           → CesiumGlobe.init() with retry loop (15 × 300ms)
      └─ getCurrentPosition()
          └─ fetch weather (OWM) + forecast + hourly (Open-Meteo)
              ├─ weatherCache{}  → in-memory, 10-min TTL
              ├─ Nominatim       → reverse geocode city name
              └─ render to DOM   → direct innerHTML/textContent updates
```

### 4.3 State Management (Active App)
- Hand-rolled: `appState` object + `weatherCache` map + `elements` registry.
- No reactive system — UI is updated imperatively through render functions.
- Persistence: `localStorage` under `skylens_*` keys (note: `js/config.js` uses different `geoweather_*` keys — another sign of the split codebase).

### 4.4 Service Worker Caching Strategies (`sw.js`)

| Request Type | Strategy |
|--------------|----------|
| Cesium CDN assets | **Network-first**, fallback cache |
| Weather/Geo APIs (OWM, Nominatim, Open-Meteo) | **Stale-while-revalidate** with 10-min TTL header (`x-cached-time`) |
| Same-origin static | **Cache-first**, fallback network |
| External (Tailwind, fonts) | **Cache-first**, 503 on failure |
| Install | Pre-cache static assets, `skipWaiting()` |
| Activate | Delete old caches, `clients.claim()` |

---

## 5. Design & Style Analysis

### 5.1 Visual Style — Glassmorphism + Space Theme
- **Glass panels:** `rgba(255,255,255,0.05)` bg + `backdrop-filter: blur(20px)` + 1px translucent border — used on every card.
- **Color palette (dark default):** deep indigo/navy space background (`#0b0c3d`, `#060538`) with **cyan accents** (`#00dbe7`, `#00f2ff`) and purple/amber secondaries — Material 3 token naming.
- **Glow effects:** blurred radial orbs behind hero, neon drop-shadows on icons, `box-shadow: 0 0 20px rgba(34,211,238,.3)`.
- **Animations:** animated gradient background (20s shift), floating orbs, shimmer skeletons, floating weather icon, spin loaders.
- **Themes:** dark (default) + light via `data-theme` attribute + Tailwind `darkMode: "class"`.

### 5.2 CSS Composition
- `css/styles.css` (~4,000 lines): design tokens → base → components (header, sidebar, weather, map, forecast, toast, footer) → responsive → utility classes → print styles.
- **Hybrid styling:** index.html uses **Tailwind utility classes** for the active UI, while `styles.css` styles a *different older layout* (`.dashboard`, `.sidebar`, `.menu-item` classes that no longer exist in HTML). Two design languages overlap.
- Known issues (documented in `CSS_IMPROVEMENTS.md`): duplicate selectors (`.accuracy-display`, `.loading`, `.map-container` twice), mixed naming conventions (BEM-ish `btn--loading` vs Tailwind-ish utilities), unused legacy blocks.

### 5.3 Responsive & Mobile
- Breakpoints: 480 / 768 / 1200 / 1400px.
- Mobile: bottom navigation bar (Home / Globe / Forecast / Alerts), full-screen search overlay, `safe-area-inset` padding, touch targets ≥ 44px.
- Desktop: 12-column grid (8-col main + 4-col sidebar).

### 5.4 Accessibility ✅ (notably good)
- Skip-to-content link, ARIA labels/roles on all buttons & regions, `aria-live` regions, listbox for suggestions.
- `:focus-visible` outlines, `prefers-reduced-motion` support, semantic landmarks, print stylesheet.

---

## 6. Features Implemented

- ✅ Current weather (temp, feels-like, hi/lo, humidity, pressure, visibility, clouds, dew point, wind + gusts + direction)
- ✅ Hourly forecast ribbon (next 8 hours, Open-Meteo)
- ✅ 7-day forecast with temp range bars
- ✅ AQI + pollutant breakdown (CO, NO₂, O₃, SO₂, NH₃, PM2.5, PM10) with health advice
- ✅ Sunrise / sunset / daylight duration / moon phase (emoji)
- ✅ **3D CesiumJS globe** — satellite/dark/streets base layers, 5 weather tile overlays (clouds, precip, temp, wind, pressure), custom canvas marker, camera fly-to/zoom/tilt/reset, WebGL fallback
- ✅ City search with debounced autocomplete (Nominatim), desktop + mobile
- ✅ Geolocation with permission prompt + retry + accuracy display
- ✅ Favorites (save/list/remove locations), temperature unit toggle (°C/°F), dark/light theme
- ✅ Share via Web Share API (clipboard fallback)
- ✅ Offline mode: offline banner, cached data fallback, toasts
- ✅ Skeleton loading states, toast notification system

---

## 7. Security Observations ⚠️

| Issue | Location | Severity |
|-------|----------|----------|
| **OpenWeatherMap API key hardcoded** and committed in plain text (4 separate files) | `js/app.js`, `js/config.js`, `js/weather.js`, `js/cesium-globe.js` (tile URLs) | 🔴 High — key is public in git history; should be rotated and moved to env/edge function |
| **Cesium Ion access token hardcoded** | `js/cesium-globe.js` | 🟡 Medium — currently unused but committed |
| No CSP (Content-Security-Policy) meta tag | `index.html` | 🟡 Medium |
| `sanitizeInput()` exists but output rendered with `innerHTML` in places | `js/components/ui.js`, `app.js` suggestions | 🟡 Low-Medium — XSS-hardening opportunity |

> Client-side keys can never be fully hidden without a proxy — the standard fix for a static app is a free serverless function (Cloudflare Workers / Vercel Edge) as an API proxy.

---

## 8. Code Quality Summary

### Strengths 💪
- Zero-dependency, zero-build, instantly deployable
- Excellent accessibility and mobile PWA practices
- Robust SW with multiple cache strategies and offline fallback
- Defensive globe init (WebGL check, container size retry, graceful fallback UI)
- Retry with exponential backoff (`fetchWithRetry`), debounce, rate limiting utilities
- Well-documented roadmap files (`IMPROVEMENTS.md`, `CSS_IMPROVEMENTS.md`)

### Weaknesses / Tech Debt 🔧
1. **~50% dead code** — legacy Leaflet/map/weather/geolocation files and the unused ES-module refactor.
2. **`js/app.js` monolith (~3,700 lines)** — config duplicated from `config.js`, 100+ manual DOM refs.
3. **Two CSS design systems overlapping** — Tailwind utilities vs. a legacy 4,000-line stylesheet for markup that no longer exists (page weight + specificity confusion).
4. **Tailwind via CDN** — fine for dev, not for production (warning + render-blocking; should be compiled).
5. **Duplicated storage keys & config constants** across the two code generations.
6. **No tests, no linter, no CI** (0 test files detected).
7. `structure.txt` is outdated + UTF-16 encoded (odd characters).
8. `manifest.json` icons point to a JPEG `project-weather.jpg` — PNG 192/512 icons recommended for better install UX.

---

## 9. External Services Used

| Service | Purpose | Cost |
|---------|---------|------|
| OpenWeatherMap | Current weather, forecast, AQI, UV, map tiles | Free tier (60 calls/min) |
| Open-Meteo | Hourly forecast | Free, no key |
| Nominatim (OSM) | Geocoding / reverse geocoding | Free (usage policy) |
| CesiumJS CDN | 3D globe engine | Free |
| CARTO / Esri / OpenStreetMap tiles | Globe base imagery | Free |
| Google Fonts + Tailwind CDN | Fonts, icons, CSS framework | Free |

---

## 10. Recommended Next Steps

1. **Rotate the exposed API key** 🔴 and proxy OWM calls through a serverless function.
2. **Delete dead code:** `js/weather.js`, `js/map.js`, `js/geolocation.js`, `js/components/map.js`, `css/leaflet-overrides.css` — or finish wiring the modular refactor with `<script type="module">`.
3. **Split `app.js`** into modules (render / api / globe / ui) — the `services/` + `state.js` refactor is already 80% written, adopt it.
4. **Purge legacy CSS** — remove selectors not present in current markup; consider compiling Tailwind instead of CDN.
5. Add **ESLint + a few smoke tests** and a minimal CI workflow.
6. Replace JPEG PWA icons with proper **192/512 PNGs**.
