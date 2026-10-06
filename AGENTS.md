# Repository guidance

## Project shape

- This is a dependency-free single-page static site composed of a semantic shell, native ES modules, and local static assets.
- `index.html` contains the semantic page shell.
- `styles.css` contains the responsive visual system.
- `app.js` owns application state, filters, progress persistence, URL day queries, and event handling.
- `data/itinerary.js` owns the calendar, temple, fare, and route data.
- `components/day-card.js` renders day panels and temple cards.
- `shan-shui-reference.html` contains the local procedural Shan Shui background renderer.
- `CNAME` contains the Surge deployment hostname: `able-purpose-bando.surge.sh`.
- `README.md` documents local use, deployment, and the module structure.

## Editing conventions

- Keep the site dependency-free and deployable as static files.
- Preserve the existing English (UK) spelling, Japanese names, route links, and date plan unless the task explicitly changes them.
- Keep user progress backwards-compatible when changing the `localStorage` key or data structure; migrate old keys when practical.
- Use semantic HTML, accessible labels, and `target="_blank"` links with `rel="noopener"` for external destinations.
- Do not add a build system or framework for small tracker changes.
- Keep native ES modules working from a static HTTP server; do not re-inline the data, app logic, or stylesheet into `index.html` without a clear reason.
- Keep day-specific query URLs (`?day=YYYY-MM-DD`) and the `window.BANDO33` data interface backwards-compatible when changing the query experience.

## Validation

- Serve the directory with `python3 -m http.server 8000`; native modules may not work when opening `index.html` directly as a `file://` URL.
- Check the day selector, map links, filters, export/reset controls, and progress persistence after changes.
- Check a direct day URL such as `/?day=2026-11-10`, the “Ask ChatGPT” prompt control, and the `window.BANDO33` data object.
- Check that the day-card component renders all filter states and stamp interactions correctly.
- Before deploying, confirm the static files are served from the repository root and that the Surge hostname remains `https://able-purpose-bando.surge.sh/`.
