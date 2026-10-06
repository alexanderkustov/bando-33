# Bandō 33 tracker

A self-contained HTML tracker for the Bandō 33 pilgrimage, planned from Shinjuku and nearby overnight bases. It includes temple order, opening-hour notes, Google Maps routes, travel guidance, Japanese phrases for the nōkyō-jiku, and browser-local progress tracking.

## Live site

https://able-purpose-bando.surge.sh/

## Run locally

Open `index.html` directly in a browser, or serve the folder with any static HTTP server:

```sh
python3 -m http.server 8000
```

Then visit http://localhost:8000/.

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
