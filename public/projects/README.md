# Project images

Put real project screenshots or hardware photos here, then set that project's
optional `thumbnail` in `src/data/projects.ts` to `/projects/<filename>`.
Both the About containers and main Projects section use that same path. Until a
thumbnail is set, both show a branded title tile. No stock images are used.

Landscape images work best; the reserved thumbnail area has a 16:10 ratio and
crops from the top. WebP, PNG, and JPEG are supported. The shared catalog also
accepts optional `githubUrl` and `liveUrl` fields for the main Projects section.
Only add those when actual URLs are available; About cards remain preview-only.
