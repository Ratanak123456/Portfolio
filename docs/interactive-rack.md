# Interactive rack

The hero keeps its server-rendered text and links. `RackViewer` loads the 3D experience separately and retains the original `ServerRack` SVG until the scene is ready. WebGL2 failure, renderer errors and context loss show the same static fallback. The former GSAP rack scroll effects are removed, so the model does not move until used.

The viewer uses original Three.js geometry, React Three Fiber 9, and Drei OrbitControls. It renders on demand, and animates part positions inside `useFrame`; there is no additional animation package. Reduced motion applies target positions directly. GPU resources, pointer capture and window listeners are released when the scene unmounts.

Drag empty space to orbit, or use Front and Rear. Hover highlights only available handles. Part dragging disables orbit. Disk trays and servers follow one rail axis; the lid slides before it lifts. Invalid cable drops restore the previous port, while the far cable endpoint stays fixed. Reset closes an open lid before retracting the server.

The hero uses a viewport-aware, borderless canvas. Front, Rear, −/+, and Reset sit inside the viewer. Native contextual buttons beside the drive bay, chassis, and rear Ethernet ports provide all progressive actions and their reverse steps, with no Actions menu. Controls for the opposite service face are hidden from both pointer and keyboard navigation. On touch devices, dragging is off initially so swipes over the model scroll the page; the compact Drag model control opts into gestures, and Stop dragging or Escape restores touch scrolling.

`rack-state.ts` contains movement constraints and snap decisions, independent of rendering. Run the state checks using a Node version with TypeScript stripping (the workspace uses Node 26):

```sh
node --experimental-strip-types tests/rack-interactions.test.mjs
npm run lint
npm run build
```


The zoom buttons dolly the camera along its current orbit, bounded between 6 and 10.5 world units. Close views focus on the top bay or rear ports. Hardware drags and camera transitions are mutually exclusive. Zoom uses the existing demand-render loop and snaps immediately with reduced motion. A non-passive wheel listener on the canvas alone updates the same zoom target and limits as − / +. It ignores browser zoom modifiers, horizontal gestures, and locked hardware states. Continued wheel movement at either limit passes to the page; leaving the canvas immediately restores normal scrolling. The toolbar and contextual controls are siblings of the canvas and never capture wheel input. Touch gestures are unchanged. Reset restores the original front three-quarter angle, focus and distance.

The hero intro and viewer have separate, explicit grid-column wrappers in the same desktop row. Critical stage sizing is shared through `rack-layout.ts`, including loading and failure artwork. `rackFieldOfView` fits the static whole-scene bounds and service envelope on resize, without depending on part state. Update those bounds if the chassis geometry changes. Desktop before/after screenshots and measurements live in `verification/hero-layout`.

The rack, tiles, floor grid, contact shadows, and four tool cables now share one Three.js scene and camera. `ground-layout.ts` defines fixed world positions on the feet's ground plane. `ground-tools.tsx` builds shallow beveled tiles with local monochrome Simple Icons textures on their horizontal top faces, physical amber outlines, and contact shadows. There are no screen-space tool cards, connector overlays, projected endpoints, or billboard labels. Hidden native buttons retain keyboard access to tile highlights.

Each dedicated floor cable is a Catmull–Rom tube authored from its tile socket to its own underside/base socket. Both socket markers use the same curve endpoints. The cables stay close to the floor and below the front drive bays. Shader signals follow increasing tube UV coordinates from card to rack, with a bright tip, fading tail, 1.2-second travel, 1-second rest, and 0.5-second stagger. A slightly wider transparent tube supplies a soft amber halo. Reduced motion preserves geometry and outlines and disables the signal render loop.

The entire ground assembly is a sibling of the rack mechanism, independent of tray, server, lid, and Ethernet state. Orbit and dolly zoom therefore change perspective without moving the tiles or cable ends. The camera retains the elevated front-right direction; its resting target and static lens fit frame the full ground setup and hardware service envelope. Reset restores that same camera and zoom. Preset lens fitting is independent of hardware state.

Fresh-load, orbited rear, zoom, Reset, drive, chassis, and mobile captures are in `verification/ground-scene`. Browser measurements verify all four tile bottoms on the feet's floor, cable endpoints attached to sockets, fixed tile world matrices throughout hardware actions, and an exact Reset within floating-point precision.

The rack backdrop adds a static radial falloff and a few faint drafting ticks and corner marks, with one small amber dash. It is transparent at its perimeter, confined to the viewer, and ignores pointer events. The left hero, typography, navbar, continuous theme backgrounds, ground grid, and 3D geometry are unchanged. Browser verification of wheel direction, both zoom limits and page pass-through, outside/toolbar/navbar scrolling, browser zoom modifiers, all keyboard/touch hardware actions, Reset, and touch scrolling is recorded in `verification/hero-polish`.
