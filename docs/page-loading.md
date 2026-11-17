# Continuous-page loading and entrances

The homepage keeps its section order, anchors, server-rendered headings, copy,
and links. `ScrollEntrances` progressively enhances the existing content groups
without wrapping sections in loading boundaries. HTML and base styles show all
content, including when JavaScript is disabled or fails to download.

## Loading

`DeferredTopography` is the small client boundary around the optional About
renderer. Its loading observer uses `rootMargin: "300px 0px"`. It waits while the
home content is inert behind the intro, then imports `TopographicBackground`
and its terrain math once About approaches. About can already be inside the
300px margin on a large initial viewport; that legitimately starts warmup as
soon as the intro finishes. No section content waits for this import.

Once mounted, the canvas remains mounted through scrolling. The renderer's
separate visibility observer starts and pauses drawing. Its autonomous terrain
clock remains independent of pointer ripple strength and pauses offscreen or
when the tab is hidden. Reduced motion renders a static field.

Both portrait SVGs use native lazy loading through `next/image` in the HTML.
As About comes within 300px, their portrait observer starts both layers together
and keeps the alternate hidden until decoding finishes. The existing 4:5 frame
reserves their dimensions. The small, local technology
logos keep their simple existing behavior. Projects, Lab Notes and Contact
currently have no media or interactive demos to defer.

The rack scene is warmed during the key/door intro. Its existing static SVG
fallback and the live renderer share a definite-size stage, including while
loading or after WebGL failure. If the live scene is late when unlocked, the
doors keep moving and uncover the static stage; a late scene stays in its normal
hero bounds. When ready on time, the original framed rack, push-in and pullback
cinematic continues on the same live canvas.

## Entrances

A separate observer watches actual content groups, using a near-zero threshold
and a 24px bottom inset. About greeting, portrait and bio use 0/60/120ms delays.
The portrait and bio wait for the centered desktop greeting to enter, even
when their top edges intersect first. Skills groups animate as units; their 60ms stagger is derived from actual row
positions, so tablet rows have two steps and phone rows have one. The Skills
header and learning row, Projects content, Lab Notes and Contact headings use
the same restrained entrance. The hero retains its existing door reveal.

Web Animations applies a 16px rise and fade over 400ms. Transforms do not change
layout dimensions. Finished groups are never hidden again during the page
visit. Already visible content is not concealed during late hydration. Reduced
motion, section links (including repeated clicks), direct hashes and focus into
a section settle its groups immediately without preventing native navigation.

## Verification

Run a production build, start the server, then run:

```sh
PLAYWRIGHT_MODULE=/path/to/playwright BASE_URL=http://127.0.0.1:3011 node tests/page-loading.browser.cjs
```

This records DevTools Network events with cache disabled, 150ms latency and
200,000 bytes/second download throughput. A fresh intro deliberately holds the
rack chunk to verify warmup and fallback behavior; a short phone viewport puts
About beyond the 300px margin to verify that its renderer is absent initially
and requested before entering view. `verification/page-loading/network.json`
contains the requests, and `checks.json` records the results. Further checks
cover fast scrolling, once-only reveals, row delays, stable Skills dimensions,
mobile light/dark clipping, focus, direct/navbar links, no-JS HTML, reduced
motion, retained canvas identity, offscreen pause and pointer-independent motion.

`tests/rack-overlays-about.browser.cjs` separately exercises the original ready
rack cinematic, drive/chassis/cable controls, camera, Wolverine toggle and
WebGL fallback. The existing terrain and rack unit checks remain applicable.
