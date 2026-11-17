The final block inside About is a transparent, viewport-height title stage. The
whole PROJECT outline is centered using its font bounds, at 88% of viewport width
(with a vertical fit limit for unusually wide screens). A fixed-size inline SVG
changes its viewBox; no title wrapper is scaled. The paths come from the current
Bricolage Grotesque 96pt Latin font at weight 750, with the original -0.055em
tracking. The generator is `scripts/generate-project-title.mjs`; its fontkit tool
is needed only when regenerating paths, never by the application. The original
font license is retained under `public/fonts`.

The existing GSAP ScrollTrigger pins the stage for 2.5 viewport heights. The first
4% holds the complete centered word. The SVG camera then zooms toward the E stem
until 58%. The surface switches to black at 59% after the stem fills the viewport;
the title fades out by 60%. From 60–80% only the shared animated contour field and
navbar remain. The real Projects content enters during the last 20%, settles to
normal size, and resumes normal document flow. All phases reverse on the same
timeline. Reduced motion skips the pin and empty phase.

Contact clicks animate actual page scroll from its current position. The route
uses smooth speed ramps, traveling more slowly through the pin and first card
row. It never plays a second title animation. Wheel, touch, navigation keys,
Escape, other navbar links, history navigation, resize, and motion-preference
changes cancel the automatic movement. The navbar highlight continues to follow
the visible section. Projects links still jump directly to the real showcase.

Browser checks are `tests/projects-transition.browser.cjs`,
`tests/project-title-edges.browser.cjs`, and `tests/contact-scroll.browser.cjs`.
They accept `PLAYWRIGHT_MODULE`, `CHROME_PATH`, and `BASE_URL`. The Contact test
records a complete click-driven trip; its recording metadata is saved in
`verification/contact-scroll/recording.json`.
