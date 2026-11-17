# SSH Key Gate

The entrance is a layered architectural pencil illustration. It wraps the original server-rendered homepage with the existing two-step key interaction and live rack camera reveal. It never requests credentials or makes an SSH connection.

## Artwork and layout

`src/app/ssh-key-gate/entrance-artwork.tsx` contains separate vector drawings for the two door leaves, casing/rebate/threshold, wall marks, floor, iron plate, strike, and key contact shadow. The movable key is its own vector drawing in `ssh-key-gate.tsx`. Labels and interactive targets are real HTML buttons and text.

Each white door leaf has exactly one large upper recessed panel and one shorter lower panel. Doubled, slightly offset contours, sparse curved grain, and varied hatch marks describe the painted rails, bevels, and deep joints. Shadow hatching is concentrated on the upper/left inner cuts and the casing's lower/right outer edges, consistent with light from the upper left. There are no evenly spaced board stripes, repeated CSS gradients, or raster backgrounds. The palette is black, white, and `#F6B94F`; the initial key is the only amber object. Gray values come from graphite marks and their opacity.

The doorway is centered within visible white wall, with a thick lintel, jambs, recessed lip, and sloping threshold. Its inner opening remains transparent. A fixed `.ssh-door-clip` clips both moving leaves at the jambs. The iron plate and bolt belong to the left leaf, and the separate strike belongs to the right leaf. The plate has two visible screw heads and a recessed keyhole centered on the closed seam. The inserted key follows the left leaf through a matching, stationary clip.

The floor is a separate stationary white drawing with a few perspective seams and restrained grain. A diagonally foreshortened amber key sits in front of the threshold, with an open circular bow, shaft, teeth, black shaded thickness, and a separate contact shadow. Its 104-pixel target is larger than the visible artwork. The title and labels use self-hosted IBM Plex Mono scoped to the intro only. The homepage's fonts, layout, navbar, theme, scene, and controls are unchanged.

## Interaction and reveal

A first click, tap, Enter, or Space picks up the key without unlocking. The key rises and turns into an insertion-ready held pose, its shadow softens, **Pick up the key** changes to **Insert the key**, and a thin amber keyhole highlight appears. Keyboard focus moves to the separate lock button. Activating the held key focuses that lock; it does not unlock by itself.

Drag the held key's actual transformed tip within 34 CSS pixels of the keyhole, or activate the lock with tap/click/Enter/Space. The tip snaps into place, inserts five pixels, turns 90 degrees, and retracts the latch. Missed and canceled drops settle at a reachable held position. On desktop, an upward drag can pick the floor key up and continue toward the lock. Pointer capture, release-coordinate sampling, secondary-pointer rejection, and drag-click suppression preserve the original gesture behavior.

The pickup, key insertion, turn, and latch timing is unchanged. The post-unlock reveal uses a single clock with these stages:

1. Slide the leaves outward over 650 ms while showing the rack at a recognizable medium distance inside the doorway. Hold that framed view for another 250 ms. The live canvas has the actual doorway dimensions, with the name, navigation, links, and viewer UI hidden.
2. Push toward the front-right drive bays over 450 ms. The actual canvas expands from the opening into the viewport, while the camera moves from `[4.9, 1.3, 7.6]` toward the earlier low close-up `[3.45, -0.25, 4.4]`. The jambs expand to the viewport edges and the floor/threshold move out of view as the camera passes through the doorway. The frame/floor clear completely by the close-up. No CSS scale is applied to the canvas.
3. Pull back over 750 ms into the exact original camera, target, field of view, and hero bounds. The four connected tiles become fully visible and the name, quote, navbar, and links appear during this stage. Viewer buttons and contextual controls remain hidden until the cinematic finishes.

`RackIntroShot` carries separate push and pullback progress values to the existing live scene. Quintic easing has zero speed and acceleration at the closest point, so the camera reverses smoothly. The same perspective camera and Canvas render all three shots; bounds and the drawing buffer are synchronized before drawing. The normal preset constants, reducer state, saved zoom, and Reset pose are unchanged. Completion removes the entire overlay and restores the original render-area styles, with the final cinematic frame already at the normal hero pose.

## Preserved entry behavior

Skip and Escape can interrupt any phase. They restore the live homepage before uncovering it, cancel pending animation and pointer capture, release scrolling/inert/ARIA state, and return reading focus to the original hero heading without scrolling. Direct section hashes bypass the intro; hash changes while active also clear it. Focus is trapped within the entrance while it is active.

Reduced motion keeps pickup and unlocking as distinct actions, with immediate pose changes and no lift, turn, sliding-door, or camera animation. A drag starting on the floor cannot bypass the separate unlock action in this mode. The original `portfolio:firewall-gate:v1=complete` session marker keeps completed visits completed in that tab. No JavaScript, denied storage, missing gate styles, or intro errors leave the server-rendered homepage accessible. Unavailable WebGL has the existing four-second fallback after unlocking, with Skip/Escape always available.

## Verification

Run a production build and server, then `node tests/ssh-key-gate.browser.cjs`. `BASE_URL`, `CHROME_PATH`, and `PLAYWRIGHT_MODULE` can select another server, Chrome binary, or external Playwright installation. Playwright is not an application runtime dependency.

The earlier artwork review artifacts are in `verification/ssh-graphite-gate`. Current three-shot reveal measurements, screenshots, and recordings are in `verification/ssh-server-reveal`. Desktop and mobile closed-state captures were inspected before animation testing, against the written scene requirements. The referenced sketch attachment was not available in the conversation, so an image-to-image comparison was not possible. `art-review-desktop.png` and `art-review-mobile.png` are the initial visual review captures (development HUD hidden for the capture). The remaining captures and measurements come from the production browser runner.

The runner checks the four recesses, two screws, white panels, IBM Plex Mono, clipped portal, grounded floor pose, pickup-only first action, tip alignment, separate unlock, latch sequencing, equal slide distances, matching key travel, and the doorway-sized first shot, full-resolution close-up, hidden controls, and frame/floor clearing before handoff. It compares the final canvas bounds and projected controls with a direct-load baseline and exercises the live drive, chassis, cable, zoom, Front/Rear, and Reset controls. It also covers missed-drop retry, tap, Enter/Space, native touch, small portrait/landscape viewports, Skip during pullback, Escape, reduced motion, session reloads, section links, both themes, unavailable WebGL, and no JavaScript.
