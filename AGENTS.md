# Repository guidance

## Project shape

- This is a single-page static site. The application lives in `index.html`.
- `CNAME` contains the Surge deployment hostname: `able-purpose-bando.surge.sh`.
- `README.md` documents local use and deployment.

## Editing conventions

- Keep the site dependency-free and deployable as static files.
- Preserve the existing English (UK) spelling, Japanese names, route links, and date plan unless the task explicitly changes them.
- Keep user progress backwards-compatible when changing the `localStorage` key or data structure; migrate old keys when practical.
- Use semantic HTML, accessible labels, and `target="_blank"` links with `rel="noopener"` for external destinations.
- Do not add a build system or framework for small tracker changes.

## Validation

- Open `index.html` in a browser or serve the directory with `python3 -m http.server 8000`.
- Check the day selector, map links, filters, export/reset controls, and progress persistence after changes.
- Before deploying, confirm the static files are served from the repository root and that the Surge hostname remains `https://able-purpose-bando.surge.sh/`.
