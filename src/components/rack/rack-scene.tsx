"use client";

import { Edges, OrbitControls } from "@react-three/drei";
import { useFrame, useThree, type ThreeEvent, type ThreeElements } from "@react-three/fiber";
import { useContext, useEffect, useMemo, useRef, useState, type ComponentRef, type Dispatch, type ReactNode, type RefObject } from "react";
import { CatmullRomCurve3, DataTexture, Group, LinearFilter, MathUtils, Mesh, PerspectiveCamera, Plane, RGBAFormat, TubeGeometry, Vector3 } from "three";
import { RACK_DEFAULT, RACK_DEFAULT_TARGET, RACK_FRONT, RACK_REAR, RACK_TARGET, RACK_MIN_DISTANCE, RACK_MAX_DISTANCE, RACK_DEFAULT_DISTANCE, RACK_ZOOM_TARGET, RACK_REAR_TARGET, rackFieldOfView } from "./rack-camera";
import { canInteract, PORTS, rackMotion, type DragKind, type Point3, type RackAction, type RackState } from "./rack-state";

import { RackIntroContext, type RackIntroShot } from "./rack-intro";
import { RackOverlayAnchor, type RackOverlayElements } from "./rack-overlay-anchor";

const AMBER = "#F6B94F";
type PointerEvent3 = ThreeEvent<PointerEvent>;
type Capture = EventTarget & { setPointerCapture: (id: number) => void; releasePointerCapture: (id: number) => void };
type Events = Pick<ThreeElements["group"], "onPointerDown" | "onPointerMove" | "onPointerUp" | "onPointerCancel" | "onLostPointerCapture" | "onPointerOver" | "onPointerOut" | "onClick">;

function Box({ size, position = [0, 0, 0], color, edge, passEvents = false, children }: { size: Point3; position?: Point3; color: string; edge?: string; passEvents?: boolean; children?: ReactNode }) {
  return <mesh position={position} onPointerOver={passEvents ? undefined : event => event.stopPropagation()}>
    <boxGeometry args={size} />
    <meshStandardMaterial color={color} roughness={0.5} metalness={0.25} />
    {edge && <Edges color={edge} />}
    {children}
  </mesh>;
}

function Lamp({ position, on }: { position: Point3; on: boolean }) {
  return <mesh position={position}><sphereGeometry args={[0.027, 10, 8]} /><meshBasicMaterial color={on ? AMBER : "#000000"} /></mesh>;
}

function Drive({ shell, ink, edge }: { shell: string; ink: string; edge: string }) {
  return <>
    <Box size={[0.72, 0.23, 1.02]} position={[0, 0, -0.47]} color={shell} edge={edge} passEvents />
    <Box size={[0.73, 0.25, 0.07]} color={shell} edge={edge} passEvents />
    <Box size={[0.55, 0.025, 0.07]} position={[0.02, -0.045, 0.041]} color={ink} passEvents />
    <Box size={[0.45, 0.025, 0.07]} position={[0.02, 0.045, 0.041]} color={ink} passEvents />
    <Box size={[0.55, 0.03, 0.8]} position={[0, 0.14, -0.48]} color={ink} passEvents />
  </>;
}

function Interior({ shell, ink }: { shell: string; ink: string }) {
  return <group>
    <Box size={[1.78, 0.035, 1.57]} position={[0, -0.12, -0.05]} color={ink} />
    {[-0.62, 0, 0.62].map(x => <group key={x} position={[x, -0.015, -0.56]}>
      <Box size={[0.45, 0.09, 0.43]} color={shell} edge={ink} />
      <mesh position={[0, 0.06, 0]}><cylinderGeometry args={[0.17, 0.17, 0.035, 16]} /><meshStandardMaterial color={ink} /></mesh>
      {[0, 1, 2, 3].map(blade => <group key={blade} rotation={[0, blade * Math.PI / 2, 0]}><Box size={[0.2, 0.018, 0.045]} position={[0.045, 0.085, 0]} color={shell} /></group>)}
    </group>)}
    {[0.15, 0.35, 0.55, 0.75].map(x => <group key={x} position={[x, -0.005, 0.12]}>
      <Box size={[0.055, 0.2, 0.42]} color={shell} edge={ink} />
      {[-0.12, 0, 0.12].map(z => <Box key={z} size={[0.065, 0.08, 0.08]} position={[0, 0.02, z]} color={ink} />)}
    </group>)}
    <Box size={[0.5, 0.12, 0.48]} position={[0.5, -0.01, 0.58]} color={shell} edge={ink} />
    {[0, 1, 2, 3, 4, 5].map(fin => <Box key={fin} size={[0.025, 0.12, 0.44]} position={[0.32 + fin * 0.07, 0.08, 0.58]} color={ink} />)}
    <Box size={[0.8, 0.28, 0.045]} position={[-0.5, 0, -0.08]} color={shell} edge={ink} />
    {[-0.75, -0.5, -0.25].map(x => <Box key={x} size={[0.22, 0.09, 0.075]} position={[x, 0.02, -0.05]} color={ink} />)}
  </group>;
}

function GroundShadow() {
  const texture = useMemo(() => {
    const size = 64, pixels = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const distance = Math.hypot((x - size / 2) / (size / 2), (y - size / 2) / (size / 2));
        const value = Math.round(255 * Math.pow(Math.max(0, 1 - distance), 2));
        const index = (y * size + x) * 4;
        pixels[index] = pixels[index + 1] = pixels[index + 2] = value;
        pixels[index + 3] = 255;
      }
    }
    const result = new DataTexture(pixels, size, size, RGBAFormat);
    result.minFilter = result.magFilter = LinearFilter;
    result.needsUpdate = true;
    return result;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.675, 0]}>
    <planeGeometry args={[6, 5]} />
    <meshBasicMaterial color="#000000" alphaMap={texture} transparent opacity={0.28} depthWrite={false} />
  </mesh>;
}

function cableCurve(point: Vector3) {
  return new CatmullRomCurve3([new Vector3(1.75, -1.5, -2.15), new Vector3(1.5, -1.65, -2.4), new Vector3(point.x * 0.5, -1.4, -2.15), point.clone()]);
}

type DragSession = { kind: DragKind; plane: Plane; start: Vector3; axis: Vector3; base: number; pointer: number; capture: Capture };

function usePartInteraction(kind: DragKind, state: RackState, pointerEnabled: boolean, controlsRef: RefObject<ComponentRef<typeof OrbitControls> | null>, sessionRef: RefObject<DragSession | null>, dispatch: Dispatch<RackAction>, setHover: (value: string | null) => void, onPartSelect: (kind: DragKind | "latch") => void): Events {
  const { camera, gl } = useThree();
  function finish(event: PointerEvent3, cancel = false) {
    const drag = sessionRef.current;
    if (!drag) return;
    event.stopPropagation();
    sessionRef.current = null;
    try { drag.capture.releasePointerCapture(drag.pointer); } catch {}
    if (cancel) dispatch({ type: "cancel-drag" });
    else {
      // Snap by the port under the pointer too, so perspective/depth cannot
      // make a visually aligned rear connector miss its socket.
      const port = drag.kind === "cable" ? PORTS.findIndex(point => event.ray.distanceToPoint(new Vector3(...point)) < 0.22) : -1;
      dispatch({ type: "drag-end", port: port < 0 ? undefined : port });
    }
    if (controlsRef.current) controlsRef.current.enabled = pointerEnabled;
    gl.domElement.style.setProperty("cursor", "auto");
    setHover(null);
  }


    if (!pointerEnabled || !canInteract(state, kind)) {
      // Keep the captured handlers alive until pointerup, even after React sets drag.
      if (state.drag !== kind) return {};
    }
    return {
      onPointerOver: event => { event.stopPropagation(); if (!state.busy) { setHover(kind); gl.domElement.style.setProperty("cursor", "grab"); } },
      onPointerOut: () => { if (!sessionRef.current) { setHover(null); gl.domElement.style.setProperty("cursor", "auto"); } },
      onPointerDown: event => {
        if (!pointerEnabled || !canInteract(state, kind)) return;
        event.stopPropagation();
        const axis = kind === "lid-lift" ? new Vector3(0, 1, 0) : new Vector3(0, 0, kind === "lid-slide" ? -1 : 1);
        const direction = camera.getWorldDirection(new Vector3());
        const normal = kind === "cable" ? new Vector3(0, 0, 1) : direction.addScaledVector(axis, -direction.dot(axis)).normalize();
        const plane = new Plane().setFromNormalAndCoplanarPoint(normal, kind === "cable" ? new Vector3(0, 0, -1.55) : event.point);
        const start = event.ray.intersectPlane(plane, new Vector3());
        if (!start) return;
        if (controlsRef.current) controlsRef.current.enabled = false;
        const base = kind === "server" ? state.server : kind === "lid-slide" ? state.lidBack : kind === "lid-lift" ? state.lidLift : state.tray;
        const capture = event.target as Capture;
        capture.setPointerCapture(event.pointerId);
        sessionRef.current = { kind, plane, start: start.clone(), axis, base, pointer: event.pointerId, capture };
        onPartSelect(kind);
        dispatch({ type: "drag-start", kind });
        gl.domElement.style.setProperty("cursor", "grabbing");
      },
      onPointerMove: event => {
        const drag = sessionRef.current;
        if (!drag || drag.kind !== kind) return;
        event.stopPropagation();
        const point = event.ray.intersectPlane(drag.plane, new Vector3());
        if (!point) return;
        dispatch({ type: "drag-move", kind, value: kind === "cable" ? [point.x, point.y, -1.55] : drag.base + point.sub(drag.start).dot(drag.axis) });
      },
      onPointerUp: event => finish(event),
      onPointerCancel: event => finish(event, true),
      onLostPointerCapture: event => finish(event, true),
    };

}

export function RackScene({ state, dispatch, dark, reduced, pointerEnabled, view, onReady, onPartSelect, zoomDistance, zooming, onZoomSettled, onLatchActivate, overlays }: {
  overlays: RackOverlayElements;
  state: RackState; dispatch: Dispatch<RackAction>; dark: boolean; reduced: boolean; pointerEnabled: boolean;
  onLatchActivate: (clientX: number, clientY: number) => void;
  zoomDistance: number; zooming: boolean; onZoomSettled: () => void;
  view: { side: string; revision: number }; onReady: () => void; onPartSelect: (kind: DragKind | "latch") => void;
}) {
  const { camera, gl, invalidate, advance, size, get, setSize } = useThree();
  const intro = useContext(RackIntroContext);
  const introFrame = useRef<(() => void) | null>(null);
  const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null);
  const server = useRef<Group>(null), tray = useRef<Group>(null), latch = useRef<Group>(null), lid = useRef<Group>(null), plug = useRef<Group>(null), cable = useRef<Mesh>(null);
  const [hover, setHover] = useState<string | null>(null);
  const sessionRef = useRef<DragSession | null>(null);
  const latchPointerRef = useRef<{ capture: Capture; pointer: number } | null>(null);
  const motion = useRef(rackMotion(state));
  const lastPlug = useRef(new Vector3(...PORTS[0]));
  const initialTube = useMemo(() => new TubeGeometry(cableCurve(new Vector3(...PORTS[0])), 36, 0.025, 6, false), []);
  const shell = "#000000", ink = "#FFFFFF";
  const target = rackMotion(state);
  const lastViewRef = useRef<typeof view | null>(null);
  const zoomFocusRef = useRef(new Vector3(...RACK_TARGET));

  // A mechanism target can change without changing a Three.js JSX prop.
  // Explicitly wake the demand renderer for those keyboard/button actions.
  useEffect(() => { invalidate(); }, [state, reduced, invalidate]);

  useEffect(() => {
    const restingTarget = view.side === "default" ? RACK_DEFAULT_TARGET : RACK_TARGET;
    const closeFocus = zoomDistance < RACK_DEFAULT_DISTANCE - 0.001 ? RACK_ZOOM_TARGET : restingTarget;
    // Aim rear views at the ports; close front views at the serviceable top bay.
    // The focus eases with zoom, never while a visitor is dragging hardware.
    if (lastViewRef.current !== view) {
      lastViewRef.current = view;
      const center = new Vector3(...(view.side === "rear" ? RACK_REAR_TARGET : closeFocus));
      const direction = new Vector3(...(view.side === "default" ? RACK_DEFAULT : view.side === "rear" ? RACK_REAR : RACK_FRONT))
        .sub(new Vector3(...(view.side === "default" ? RACK_DEFAULT_TARGET : RACK_TARGET))).normalize();
      camera.position.copy(center).addScaledVector(direction, zoomDistance);
      camera.lookAt(center);
      controlsRef.current?.target.copy(center);
      controlsRef.current?.update();
      zoomFocusRef.current.copy(center);
    } else if (zooming) {
      const center = controlsRef.current?.target ?? new Vector3(...RACK_TARGET);
      zoomFocusRef.current.set(...(camera.position.z < center.z ? RACK_REAR_TARGET : closeFocus));
    }
    invalidate();
  }, [view, zoomDistance, zooming, camera, invalidate]);

  useEffect(() => {
    if (camera instanceof PerspectiveCamera && !intro?.active) {
      const fov = rackFieldOfView(size.width / size.height, view.side, window.innerWidth);
      camera.setFocalLength(camera.getFilmHeight() / (2 * Math.tan(fov * Math.PI / 360)));
      invalidate();
    }
  }, [camera, size.width, size.height, view.side, invalidate, intro]);

  useEffect(() => {
    if (!intro || !(camera instanceof PerspectiveCamera)) return;
    const stage = gl.domElement.closest<HTMLElement>(".rack-stage");
    const area = gl.domElement.closest<HTMLElement>(".rack-render-area");
    const home = stage?.closest<HTMLElement>("[data-ssh-home]");
    if (!stage || !area || !home) return;
    const normalPosition = new Vector3(...RACK_DEFAULT);
    const normalTarget = new Vector3(...RACK_DEFAULT_TARGET);
    const framedPosition = new Vector3(4.9, 1.3, 7.6);
    const framedTarget = new Vector3(0, -.25, .1);
    const closePosition = new Vector3(3.45, -.25, 4.4);
    const closeTarget = new Vector3(0, -.38, .1);
    const center = new Vector3();
    let prepared = false, controlsEnabled = true;
    let shot: RackIntroShot = { push: 0, pullback: 0 };
    // Fractions preserve the shot's alignment with the illustrated opening
    // if the viewport changes during the sequence.
    let opening = { left: 0, top: 0, width: 1, height: 1 };
    const readOpening = () => {
      const rect = document.querySelector<HTMLElement>("[data-gate-doorway]")?.getBoundingClientRect();
      if (rect) opening = { left: rect.left / window.innerWidth, top: rect.top / window.innerHeight, width: rect.width / window.innerWidth, height: rect.height / window.innerHeight };
    };
    let originalStyle: string | null = null;
    const fitBuffer = (width: number, height: number, top: number, left: number) => {
      const current = get().size;
      if (current.width !== width || current.height !== height || current.top !== top || current.left !== left) {
        // R3F owns renderer size and DPR. Update its size in the same frame as
        // the real render area, rather than magnifying a smaller drawing buffer.
        setSize(width, height, top, left);
      }
    };
    const sync = () => {
      const rect = stage.getBoundingClientRect();
      const { push, pullback } = shot;
      const framedWidth = opening.width * window.innerWidth, framedHeight = opening.height * window.innerHeight;
      const cinematicWidth = framedWidth + (window.innerWidth - framedWidth) * push;
      const cinematicHeight = framedHeight + (window.innerHeight - framedHeight) * push;
      const cinematicLeft = opening.left * window.innerWidth * (1 - push);
      const cinematicTop = opening.top * window.innerHeight * (1 - push);
      const width = cinematicWidth + (rect.width - cinematicWidth) * pullback;
      const height = cinematicHeight + (rect.height - cinematicHeight) * pullback;
      const left = cinematicLeft + (rect.left - cinematicLeft) * pullback;
      const top = cinematicTop + (rect.top - cinematicTop) * pullback;
      area.style.left = `${left}px`;
      area.style.top = `${top}px`;
      area.style.width = `${width}px`;
      area.style.height = `${height}px`;
      // Use the browser's actual subpixel layout, matching Canvas's observer.
      // Feeding unrounded interpolation values would needlessly resize/clear
      // the buffer again when that observer reports the same frame's bounds.
      const rendered = area.getBoundingClientRect();
      fitBuffer(rendered.width, rendered.height, rendered.top, rendered.left);
      home.style.setProperty("--rack-intro-ui", String(Math.max(0, (pullback - .12) / .88)));
      camera.aspect = rendered.width / rendered.height;
      const cinematicFov = 34 + 4 * push;
      camera.fov = cinematicFov + (rackFieldOfView(rect.width / rect.height, "default", window.innerWidth) - cinematicFov) * pullback;
      camera.position.lerpVectors(framedPosition, closePosition, push).lerp(normalPosition, pullback);
      center.lerpVectors(framedTarget, closeTarget, push).lerp(normalTarget, pullback);
      camera.lookAt(center);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
      if (controlsRef.current) controlsRef.current.enabled = false;
    };
    const reset = () => {
      if (!prepared) return;
      prepared = false;
      introFrame.current = null;
      if (originalStyle === null) area.removeAttribute("style");
      else area.setAttribute("style", originalStyle);
      home.removeAttribute("data-rack-intro");
      home.style.removeProperty("--rack-intro-ui");
      const rect = stage.getBoundingClientRect();
      fitBuffer(rect.width, rect.height, rect.top, rect.left);
      camera.position.copy(normalPosition);
      camera.aspect = rect.width / rect.height;
      camera.fov = rackFieldOfView(camera.aspect, "default", window.innerWidth);
      camera.lookAt(normalTarget);
      camera.updateProjectionMatrix();
      if (controlsRef.current) {
        controlsRef.current.target.copy(normalTarget);
        controlsRef.current.enabled = controlsEnabled;
        controlsRef.current.update();
      }
      // Render the normal buffer and projected controls before Skip/Escape
      // uncovers the homepage, or before removing the completed cinematic frame.
      advance(performance.now(), false);
    };
    const paint = (next: RackIntroShot) => {
      if (!prepared) {
        readOpening();
        originalStyle = area.getAttribute("style");
        controlsEnabled = controlsRef.current?.enabled ?? true;
        prepared = true;
        home.setAttribute("data-rack-intro", "");
        // ResizeObserver/Canvas configuration can arrive between animation
        // samples. Reconcile with the live area immediately before every draw.
        introFrame.current = sync;
      }
      shot = { push: Math.max(0, Math.min(1, next.push)), pullback: Math.max(0, Math.min(1, next.pullback)) };
      sync();
      advance(performance.now(), false);
    };
    const driver = { paint, reset };
    intro.setDriver(driver);
    if (intro.active) paint({ push: 0, pullback: 0 });
    intro.onReady?.();
    const resize = () => {
      if (prepared) {
        if (shot.push === 0 && shot.pullback === 0) readOpening();
        sync(); advance(performance.now(), false);
      }
    };
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      reset();
      if (intro.driver === driver) intro.setDriver(null);
    };
  }, [intro, camera, gl, advance, get, setSize]);

  useEffect(() => {
    const frame = requestAnimationFrame(onReady);
    return () => cancelAnimationFrame(frame);
  }, [onReady]);

  useEffect(() => {
    const canvas = gl.domElement;
    canvas.style.setProperty("touch-action", pointerEnabled ? "none" : "pan-y");
    return () => { canvas.style.setProperty("cursor", "auto"); };
  }, [gl, pointerEnabled]);

  useEffect(() => {
    const tube = cable.current;
    const release = () => {
      const drag = sessionRef.current;
      sessionRef.current = null;
      if (drag) { try { drag.capture.releasePointerCapture(drag.pointer); } catch {} }
      const latchPointer = latchPointerRef.current;
      latchPointerRef.current = null;
      if (latchPointer) { try { latchPointer.capture.releasePointerCapture(latchPointer.pointer); } catch {} }
    };
    const cancel = () => { release(); dispatch({ type: "cancel-drag" }); };
    window.addEventListener("blur", cancel);
    return () => {
      window.removeEventListener("blur", cancel);
      release();
      tube?.geometry.dispose();
      initialTube.dispose();
    };
  }, [initialTube, dispatch]);

  useEffect(() => {
    if (!state.drag && sessionRef.current) {
      const drag = sessionRef.current;
      sessionRef.current = null;
      try { drag.capture.releasePointerCapture(drag.pointer); } catch {}
    }
  }, [state.drag]);

  useFrame((_, delta) => {
    introFrame.current?.();
    let moving = false;
    if (zooming) {
      const center = controlsRef.current?.target.clone() ?? new Vector3(...RACK_TARGET);
      const offset = camera.position.clone().sub(center);
      const current = offset.length();
      const step = Math.min(delta, 0.08);
      const next = reduced ? zoomDistance : MathUtils.damp(current, zoomDistance, 12, step);
      const nextCenter = reduced ? zoomFocusRef.current.clone() : center.lerp(zoomFocusRef.current, 1 - Math.exp(-12 * step));
      const settled = Math.abs(next - zoomDistance) < 0.001 && nextCenter.distanceTo(zoomFocusRef.current) < 0.001;
      if (settled) nextCenter.copy(zoomFocusRef.current);
      camera.position.copy(nextCenter).addScaledVector(offset.normalize(), settled ? zoomDistance : next);
      camera.lookAt(nextCenter);
      controlsRef.current?.target.copy(nextCenter);
      controlsRef.current?.update();
      if (settled) onZoomSettled();
      else moving = true;
    }
    for (const key of Object.keys(target) as (keyof typeof target)[]) {
      const current = motion.current[key], destination = target[key];
      const next = reduced || state.drag ? destination : MathUtils.damp(current, destination, 14, Math.min(delta, 0.06));
      motion.current[key] = Math.abs(next - destination) < 0.001 ? destination : next;
      if (motion.current[key] !== destination) moving = true;
    }
    const m = motion.current;
    if (server.current) server.current.position.z = m.server;
    if (tray.current) tray.current.position.z = 0.99 + m.tray;
    if (latch.current) latch.current.rotation.y = m.latch;
    if (lid.current) lid.current.position.set(0, 0.235 + m.lidLift, -m.lidBack);
    if (plug.current) plug.current.position.set(m.plugX, m.plugY, m.plugZ);
    const point = new Vector3(m.plugX, m.plugY, m.plugZ);
    if (cable.current && point.distanceToSquared(lastPlug.current) > 0.0000001) {
      const old = cable.current.geometry;
      cable.current.geometry = new TubeGeometry(cableCurve(point), 36, 0.025, 6, false);
      old.dispose();
      lastPlug.current.copy(point);
    }
    if (moving) invalidate();
    else if (state.busy) dispatch({ type: "motion-done" });
  }, -1); // Update camera and mechanism transforms before projecting DOM anchors.

  const interactions = {
    disk: usePartInteraction("disk", state, pointerEnabled, controlsRef, sessionRef, dispatch, setHover, onPartSelect),
    replacement: usePartInteraction("replacement", state, pointerEnabled, controlsRef, sessionRef, dispatch, setHover, onPartSelect),
    server: usePartInteraction("server", state, pointerEnabled, controlsRef, sessionRef, dispatch, setHover, onPartSelect),
    "lid-slide": usePartInteraction("lid-slide", state, pointerEnabled, controlsRef, sessionRef, dispatch, setHover, onPartSelect),
    "lid-lift": usePartInteraction("lid-lift", state, pointerEnabled, controlsRef, sessionRef, dispatch, setHover, onPartSelect),
    cable: usePartInteraction("cable", state, pointerEnabled, controlsRef, sessionRef, dispatch, setHover, onPartSelect),
  };

  function releaseLatch(event: PointerEvent3) {
    event.stopPropagation();
    const pointer = latchPointerRef.current;
    latchPointerRef.current = null;
    if (pointer) { try { pointer.capture.releasePointerCapture(pointer.pointer); } catch {} }
    if (controlsRef.current) controlsRef.current.enabled = pointerEnabled;
  }

  const latchEvents: Events = pointerEnabled && canInteract(state, "latch") ? {
    onPointerOver: event => { if (event.pointerType !== "mouse") return; event.stopPropagation(); setHover("latch"); gl.domElement.style.setProperty("cursor", "pointer"); },
    onPointerOut: () => { setHover(null); gl.domElement.style.setProperty("cursor", "auto"); },
    onPointerDown: event => {
      event.stopPropagation();
      if (controlsRef.current) controlsRef.current.enabled = false;
      const capture = event.target as Capture;
      capture.setPointerCapture(event.pointerId);
      latchPointerRef.current = { capture, pointer: event.pointerId };
    },
    onPointerUp: releaseLatch,
    onPointerCancel: releaseLatch,
    onLostPointerCapture: releaseLatch,
    onClick: event => { event.stopPropagation(); if (event.delta < 5) { onLatchActivate(event.clientX, event.clientY); onPartSelect("latch"); dispatch({ type: "unlatch" }); } setHover(null); },
  } : {};

  const latchHovered = hover === "latch" && pointerEnabled && canInteract(state, "latch");
  const highlighted = (kind: string) => kind === "latch" && latchHovered ? AMBER : ink;
  const driveKind = state.disk === "removed" ? "replacement" : "disk";

  return <>
    {state.server === 0 && <RackOverlayAnchor element={overlays.drive} position={[-1.13, .92, 1.12]} front />}
    <RackOverlayAnchor element={overlays.chassis} position={[1.15, 1.35, .9]} front />
    <RackOverlayAnchor element={overlays.cable} position={[.75, -.65, -1.15]} front={false} />
    <ambientLight intensity={1.7} />
    <directionalLight position={[4, 6, 5]} intensity={2.8} />
    <directionalLight position={[-4, 2, -5]} intensity={1.5} />
    <OrbitControls ref={controlsRef} domElement={gl.domElement} makeDefault target={RACK_TARGET} enabled={pointerEnabled && !state.drag && !state.busy} enableZoom={false} minDistance={RACK_MIN_DISTANCE} maxDistance={RACK_MAX_DISTANCE} enablePan={false} enableDamping={false} minPolarAngle={0.35} maxPolarAngle={Math.PI * 0.72} />
    {!dark && <GroundShadow />}

    {/* One physical chassis with four fixed posts, roof, base and side panels. */}
    <group>
      <Box size={[2.5, 0.09, 2.2]} position={[0, 1.5, 0]} color={shell} edge={ink} />
      <Box size={[2.5, 0.12, 2.2]} position={[0, -1.5, 0]} color={shell} edge={ink} />
      {[-1.22, 1.22].map(x => <group key={x}>
        <Box size={[0.055, 2.91, 2.14]} position={[x, 0, 0]} color={shell} edge={ink} />
        {[-1.02, 1.02].map(z => <Box key={z} size={[0.1, 2.93, 0.1]} position={[x * 0.92, 0, z]} color={shell} edge={ink} />)}
        {Array.from({ length: 8 }, (_, row) => <group key={row}>
          {[-0.6, -0.3, 0, 0.3, 0.6].map(z => <mesh key={z} position={[x + Math.sign(x) * 0.03, -0.9 + row * 0.25, z]} rotation={[0, Math.PI / 2, 0]}><circleGeometry args={[0.025, 8]} /><meshBasicMaterial color={ink} side={2} /></mesh>)}
        </group>)}
      </group>)}
      {[-1, 1].map(x => [-0.8, 0.8].map(z => <Box key={`${x}:${z}`} size={[0.25, 0.13, 0.25]} position={[x, -1.6, z]} color={shell} edge={ink} />))}
    </group>

    {/* Three ordinary server units; the top unit has separately movable hardware. */}
    {[0.31, -0.31, -0.93].map((y, bay) => <group key={y} position={[0, y, 0]}>
      <Box size={[2.1, 0.45, 1.97]} color={shell} edge={ink} />
      {[-0.53, 0.25].map(x => <group key={x} position={[x, 0, 1.015]}>
        <Box size={[0.68, 0.25, 0.045]} color={shell} edge={ink} />
        <Box size={[0.46, 0.025, 0.025]} position={[0, -0.045, 0.035]} color={ink} />
        <Box size={[0.025, 0.18, 0.06]} position={[-0.25, 0, 0.045]} color={ink} />
      </group>)}
      <Lamp position={[0.87, 0.08, 1.025]} on />
      {[0, 1, 2, 3].map(col => <mesh key={col} position={[0.65 + col * 0.08, -0.08, 1.015]}><circleGeometry args={[0.017, 8]} /><meshBasicMaterial color={ink} /></mesh>)}
      <Box size={[1.7, 0.3, 0.045]} position={[0, 0, -1.015]} color={shell} edge={ink} />
      {bay < 2 && <Box size={[0.28, 0.14, 0.04]} position={[0.5, 0, -1.055]} color={ink} />}
    </group>)}

    {/* Fixed rails remain inside the rack, with telescoping rails following the server. */}
    {[-1.02, 1.02].map(x => <group key={x}>
      <Box size={[0.045, 0.08, 1.95]} position={[x, 0.72, 0]} color={shell} edge={ink} />
      <Box size={[0.03, 0.045, 2.5]} position={[x, 0.74, state.server / 2]} color={ink} />
    </group>)}
    <group ref={server} position={[0, 0.93, 0]}>
      <Box size={[2.06, 0.04, 1.98]} position={[0, -0.2, 0]} color={shell} edge={ink} />
      {[-1.01, 1.01].map(x => <Box key={x} size={[0.045, 0.4, 1.98]} position={[x, 0, 0]} color={shell} edge={ink} />)}
      <Box size={[2.04, 0.4, 0.04]} position={[0, 0, -0.98]} color={shell} edge={ink} />
      <Interior shell={shell} ink={ink} />
      <Box size={[2.1, 0.43, 0.04]} position={[0, 0, 0.97]} color={shell} edge={ink} />
      <Box size={[0.8, 0.3, 0.025]} position={[-0.5, 0, 1.001]} color="#000000" />
      {[-0.97, 0.97].map(x => <group key={x} {...interactions.server} position={[x, 0, 1.03]}>
        <Box size={[0.08, 0.29, 0.1]} color={shell} edge={highlighted("server")} passEvents />
      </group>)}
      <group ref={tray} position={[-0.5, 0, 0.99]} {...interactions[driveKind]}>
        <Drive shell={shell} ink={ink} edge={highlighted(driveKind)} />
        <group ref={latch} position={[-0.3, 0, 0.065]} {...latchEvents}>
          <Box size={[0.08, 0.22, 0.08]} position={[0.04, 0, 0]} color={shell} edge={highlighted("latch")} passEvents />
          <RackOverlayAnchor element={overlays.latch} position={[0.1, 0.24, 0.1]} enabled={latchHovered} />
        </group>
      </group>
      <Lamp position={[0.85, 0.08, 1.015]} on={state.disk === "locked"} />
      {[0, 1, 2].map(row => Array.from({ length: 9 }, (_, col) => <mesh key={`${row}:${col}`} position={[-0.02 + col * 0.085, -0.105 + row * 0.1, 1.005]}><circleGeometry args={[0.02, 8]} /><meshBasicMaterial color={ink} /></mesh>))}
      <group ref={lid} position={[0, 0.235, 0]}>
        <group {...interactions[state.lid === "closed" ? "lid-slide" : "lid-lift"]}>
          <Box size={[2.07, 0.035, 1.99]} color={shell} edge={highlighted(state.lid === "closed" ? "lid-slide" : "lid-lift")} passEvents />
          <Box size={[0.55, 0.025, 0.055]} position={[0, 0.035, 0.65]} color={ink} passEvents />
        </group>
        {state.lid === "slid" && <group {...interactions["lid-slide"]} position={[0, 0.04, 0.92]}><Box size={[0.4, 0.065, 0.08]} color={shell} edge={highlighted("lid-slide")} passEvents /></group>}
      </group>
    </group>

    {state.disk === "removed" && !state.busy && <group position={[-2.02, -1.35, 1.4]}><Drive shell={shell} ink={ink} edge={ink} /></group>}

    {/* Two real rear jacks and a separate plug. Cable's other end never moves. */}
    {PORTS.map((port, index) => <group key={index} position={port}>
      <Box size={[0.3, 0.21, 0.06]} color={shell} edge={ink} />
      <Box size={[0.22, 0.14, 0.07]} position={[0, 0, -0.035]} color="#000000" edge={ink} />
      {[-0.07, -0.035, 0, 0.035, 0.07].map(x => <Box key={x} size={[0.009, 0.04, 0.01]} position={[x, 0.015, -0.075]} color="#FFFFFF" />)}
      <Lamp position={[0.13, 0.15, -0.03]} on={!state.detached && state.port === index} />
    </group>)}
    <group ref={plug} position={PORTS[0]} {...interactions.cable}>
      <Box size={[0.18, 0.12, 0.3]} position={[0, 0, -0.14]} color={shell} edge={highlighted("cable")} passEvents />
      <Box size={[0.08, 0.03, 0.18]} position={[0, 0.09, -0.11]} color={shell} edge={highlighted("cable")} passEvents />
    </group>
    <mesh ref={cable} geometry={initialTube}><meshStandardMaterial color={dark ? "#FFFFFF" : "#000000"} roughness={0.8} /></mesh>
    <Box size={[0.28, 0.12, 0.2]} position={[1.75, -1.5, -2.15]} color={shell} edge={ink} />
  </>;
}
