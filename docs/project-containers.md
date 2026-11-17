# Project containers

The About preview follows Skills and uses the existing catalog in
`src/data/projects.ts`. Its heading is Project Containers, followed by
“Built to ship.” The main Projects section and its data remain unchanged.

Each native button contains one CSS shipping container with a corrugated side
and roof, paired hinged doors, locking bars, latches, and an amber count plate.
Hover and keyboard focus lift it slightly and illuminate the latch while
keeping both doors closed.

`project-container-motion.ts` uses the existing GSAP dependency. On activation,
it freezes the computed hover position, moves the actual artwork node into a
native dialog, and animates from the original slot's exact viewport bounds.
The slot remains in normal flow. A 300 ms flight grows and rotates the end to
face forward; a brief unlatch precedes the 200 ms door swing. Cargo cards rise
into their grid as the doors open. No visible copy, replacement panel, inline
expanded grid, extra WebGL scene, or page scroll is used.

The dialog occupies the browser top layer above the navbar. Its close button
and footer stay fixed within the container while the card area scrolls. Cards
show only the shared thumbnail/title fallback and project name. The sole CTA
closes the dialog, restores focus and scroll lock, then navigates to #projects.

Close, Escape, and backdrop activation recede the cards, close the doors, and
fly the original node home. Native modal inertness and a Tab loop keep focus
inside. Reduced motion directly shows the same open container and restores it
without flight, door movement, or stagger. Opening can also be interrupted by
closing, and resizing an open container adjusts its viewport fit.

Add actual screenshots using `public/projects/README.md`. Existing lazy-loading
and reserved thumbnail dimensions remain shared with main Projects.

Run browser checks against the existing local server:

```sh
PLAYWRIGHT_MODULE=/path/to/playwright BASE_URL=http://localhost:3000 node tests/project-containers.browser.cjs
```

The test captures source identity, exact position and angle, per-frame travel
and closed-door timing, desktop and mobile return behavior, focus/scroll
restoration, backdrop/Escape closing, internal scrolling, reduced motion,
viewport fit, and the final Projects navigation. Screenshots and motion traces
are written to `verification/project-containers/`.
