# About Me and Wolverine portrait reveal

`AboutSection` is the second section in `src/app/page.tsx`, immediately after the existing hero. There is one `id="about"`, used by the existing navbar. The gate, hero, rack, navbar styling, theme variables, and fonts are unchanged.

The [reference About layout](https://ekawahyu-portofolio.vercel.app/#About) informed the portrait-led three-column balance. Its images, copy, blue palette, custom cursor, and backdrop were not reused. Desktop shows the IBM Plex Mono ABOUT ME label and Bricolage greeting at left, a large portrait in the center, and the supplied DevOps bio at right. Mobile stacks greeting, portrait, and bio. The hover-only hint reads “Move over the portrait.” The portrait has no card border or frame.

## Portrait assets and loading

The default image is `/My_Pic/me.svg` and the reveal is `/My_Pic/Wolverine.svg`.
The capital W is required on case-sensitive hosts. Both supplied SVGs are served
locally without modifying or rasterizing the source files. There are no rendered
placeholder images, monograms, or pending-asset labels.

Both images retain native lazy loading in the initial HTML. A portrait-only
IntersectionObserver observes About with a 300px root margin and promotes both
images to eager loading together as About approaches, including the transparent
overlay. The existing contour loader and scroll entrances are unchanged.
`next/image` calls the load handlers after decoding; the overlay and its amber
glow remain hidden until both images are ready. A slow or failed alternate image
therefore leaves the real portrait visible, including if the toggle was pressed
while it was loading. Once ready, the full reveal hides the base layer so its
cutout cannot show through the alternate's transparent edges.

The existing 4:5 frame reserves the same layout space. Both images use
`object-fit: contain` and bottom-centered positioning to preserve their native
proportions. The default has a fixed -6% horizontal offset; the alternate has a
fixed -4.2% vertical offset and a uniform 1.08 scale to bring the eyes closer in
registration. These adjustments stay constant during cursor movement. The
artworks have different poses and facial shapes, so they are not exact matches.

## Mask, lighting, and accessibility

The small client component in `src/components/portrait-reveal.tsx` uses the existing `motion/react` package. `useMotionValue` tracks client coordinates relative to the portrait rectangle; `useSpring` smooths the point/radius; `useMotionTemplate` creates a soft circular mask on the alternate layer. The images never translate, scale, tilt, or resize during the reveal. Entry seeds the springs at the entry point, and exit/cancel immediately hides the mask and light.

The neutral atmosphere is stationary: a very faint black pencil wash on white in light mode, a low-opacity white pool on black in dark mode, and a fixed graphite-grain SVG. An enclosing radial mask fades the atmosphere before it reaches either text column. There are no particles, grid, custom cursor, backdrop animation, or blue tones.

The localized amber glow uses exactly the same spring coordinates as the reveal mask. A constant gutter offset compensates for its larger background layer, so the mask and light occupy the same page point. Its layer is behind the portrait, clipped to the center atmosphere, and never recolors the text. Pointer exit restores the neutral wash. The pinned toggle uses a neutral backdrop.

“Reveal Wolverine” is an always-available 44-pixel keyboard/touch target with `aria-pressed`, `aria-controls`, and a visible focus indicator. It switches the full portrait pair. Reduced motion disables the moving mask and glow and uses an instant switch. The default portrait has descriptive alt text; the overlay has `alt=""` and is decorative. The base image and exact bio remain server-rendered without JavaScript or interaction. Pointer movement updates MotionValues rather than re-rendering the server-rendered About section.

## Verification

`tests/portrait-assets.browser.cjs` checks the supplied SVG URLs, alt text,
readiness before the first hover, a moving local mask, stationary image geometry,
and an exact pixel restoration after pointer exit. It also holds the Wolverine
response to check the default fallback while hovering and toggling, then checks
mobile taps in both themes, Enter/Space, and reduced motion. The existing single
contour canvas is checked for continued motion with the pointer outside About.
Screenshots and results are in `verification/portrait-assets`.

## Skills catalog

`src/components/skills-catalog.tsx` replaces the previous Tech Stack block in place, below the portrait and bio. It lists the six supplied groups as 37 informational logo/name labels, with Kubernetes in a separate Currently learning row. The grid has three columns from 1024px, two from 640px, and one below 640px. Corner brackets and translucent label backgrounds keep the existing contours visible. Labels wrap naturally, allow long names to break when necessary, and retain text if an image fails.

The component stays server-rendered and adds no animation lifecycle. The existing single section-wide canvas and its ResizeObserver cover the expanded section. Its autonomous terrain clock runs whenever About is visible, including when the pointer is outside About; reduced motion still freezes it.

Local assets and attribution are in `public/tech/README.md` and `public/tech/sources.json`. Dark marks use a contrast filter that preserves interior detail, and selected multicolor marks use a small white backing. Docker Compose and Docker Hub share the Docker whale; Spring Data JPA uses the Spring mark; SQL uses a generic database symbol.

Run `tests/skills-catalog.browser.cjs` with `PLAYWRIGHT_MODULE` pointing to an installed Playwright module and `BASE_URL` set to the preview server. It checks desktop, tablet, and narrow phones in both themes, visible logo pixels, clipping, enlarged text wrapping, image failure fallback, the single canvas, and autonomous animation with the pointer outside About. Screenshots and results go to `verification/skills-catalog`. The existing rack/About browser check also verifies the updated catalog while exercising the gate, doors, navbar, server controls, and Wolverine toggle.
