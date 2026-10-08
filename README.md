# Bandō 33 tracker

A static tracker and Three.js atlas for the Bandō 33 pilgrimage, planned from Shinjuku and nearby overnight bases. It includes temple order, opening-hour notes, Google Maps routes, travel guidance, Japanese phrases for the nōkyō-jiku, browser-local progress tracking, and day-specific prompts for ChatGPT itinerary optimisation.

## Structure

- `index.html` — semantic page shell and tracker content.
- `atlas.html` — standalone interactive pilgrimage atlas page.
- `styles.css` — visual design system and responsive layout.
- `app.js` — application state, filters, progress, URL queries, and event handling.
- `data/itinerary.js` — calendar, temple, fare, and route data.
- `components/day-card.js` — reusable day-panel and temple-card renderer.
- `shan-shui-reference.html` — local Shan Shui background renderer.
- `atlas.js` — interactive Three.js route atlas and marker selection.
- `package.json` — pnpm metadata and lightweight validation scripts.
- `vite.config.js` — bundles both the tracker and standalone atlas pages.

## Live site

https://able-purpose-bando.surge.sh/

## Run locally

Install dependencies and run the Vite development server:

```sh
npm install
npm run dev
```

Then visit http://localhost:5173/.

Create a static production bundle with `npm run build`; preview it locally with `npm run preview`. The generated `dist/` directory is suitable for static hosting.

The atlas uses Three.js 0.180 as a pnpm/npm dependency and Vite resolves the package imports during development and production builds.

To open a specific day directly, use its ISO date in the query string:

```text
http://localhost:8000/?day=2026-11-10
```

The “Ask ChatGPT” control copies a structured prompt for the selected day. The page also exposes its data as `window.BANDO33` for lightweight integrations.

## Deploy with Surge

Install Surge if needed, authenticate, then publish the repository directory:

```sh
npm install --global surge
surge . https://able-purpose-bando.surge.sh
```

The root `CNAME` file records the intended Surge hostname. Keep the site as a static deployment; there is no build step or backend.

## Notes

- Progress is stored in the browser's `localStorage` and is not synced between devices.
- Route times and transport details are planning estimates. Check current timetables, fares, temple hours, closures, and weather before travelling.
- Some remote stops are marked as requiring a taxi or hire car; the route links are useful for navigation but do not guarantee public-transport availability.

## Fare research

The estimates in the tracker are one-way adult planning ranges for the rail/local-transit leg shown in the itinerary. They use current operator fare guidance and route-planner checks, but are not quotations for a particular departure. Add reserved-seat or limited-express supplements where applicable, and budget separately for taxis, hire cars, buses on remote legs, admission, and luggage.

Reference points:

- [JR East ticket guide](https://www.jreast.co.jp/en/multi/ticket/guide.html) — basic fares and separate express/Shinkansen ticket rules.
- [JR East timetable](https://timetables.jreast.co.jp/en/) — planned JR corridors and service checks.
- [Odakyu transport guide](https://www.odakyu.jp/english/transport/riding/howto/) — Shinjuku–Odawara route and fare search.
- [Tobu Ikebukuro station](https://www.tobu.co.jp/en/service/station/7105.html) — Tōbu Tōjō fare-search entry point.

Fares should be rechecked shortly before the November 2026 trip because operators can revise fares, supplements, timetables, and service patterns.

## Compressed option

The tracker keeps the safer 3–20 November itinerary as its default and records a compressed alternative in the collapsible trip notes. That version finishes the temples by 16 November and leaves 17 November as a contingency day. It assumes overnight hubs, a hire car from 12–16 November, and very early starts for the three-stop days. The original plan remains the fallback if weather, closures, or timing make the compressed route impractical.
