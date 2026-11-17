"use client";

import { Canvas } from "@react-three/fiber";
import { useEffect, useReducer, useRef, useState, useSyncExternalStore } from "react";
import type { Dispatch, ReactNode, RefObject } from "react";
import type { RackOverlayElements } from "./rack-overlay-anchor";
import { GroundTools } from "./ground-tools";
import { RackScene } from "./rack-scene";
import { RACK_STAGE_SIZE } from "./rack-layout";
import { RACK_DEFAULT, RACK_FOV, RACK_DEFAULT_DISTANCE, RACK_MIN_DISTANCE, RACK_MAX_DISTANCE, RACK_ZOOM_STEP, clampRackDistance } from "./rack-camera";
import { canInteract, initialRackState, rackReducer, SERVER_TRAVEL, type RackState, type RackAction } from "./rack-state";

function subscribeMedia(notify: () => void) {
  const queries = [matchMedia("(prefers-color-scheme: dark)"), matchMedia("(prefers-reduced-motion: reduce)"), matchMedia("(pointer: fine) and (min-width: 768px)")];
  queries.forEach(query => query.addEventListener("change", notify));
  return () => queries.forEach(query => query.removeEventListener("change", notify));
}
function readMedia() {
  return `${matchMedia("(prefers-color-scheme: dark)").matches},${matchMedia("(prefers-reduced-motion: reduce)").matches},${matchMedia("(pointer: fine) and (min-width: 768px)").matches}`;
}

const viewButton = "min-h-11 min-w-9 border border-transparent bg-hero-background/90 px-1 py-2 text-[11px] font-technical font-normal outline-offset-2 hover:border-hero-amber focus-visible:outline-2 focus-visible:outline-hero-amber disabled:cursor-not-allowed disabled:opacity-40";

function instructions(s: RackState, task: string) {
  if (s.busy) return "Moving part into place…";
  if (task === "disk") {
    if (s.disk === "locked") return s.swaps ? "Replacement installed. Latch closed. Bay LED on." : "Open the top drive latch, then pull the tray along its rails.";
    if (s.disk === "released") return "Latch open. Pull the drive straight out along its rails.";
    return "Drive removed. Slide the replacement into the empty slot.";
  }
  if (task === "cable") return s.detached ? `Connector unplugged. Choose a port; an invalid drop returns it to port ${s.port + 1}.` : `Ethernet connected to port ${s.port + 1}. Drag the rear plug, or choose Unplug.`;
  if (!s.server) return "Pull the top server forward to access its lid.";
  if (s.lid === "closed") return "Server extended. Slide the lid back before lifting it.";
  if (s.lid === "slid") return "Lid released. Lift it to reveal the fans, RAM, motherboard and drive backplane.";
  return "Interior open. Lower the lid, slide it forward, then return the server.";
}

function nextAction(s: RackState, task: string): { label: string; enabled: boolean; action: RackAction } {
  if (task === "cable") return s.detached
    ? { label: `Connect port ${s.port === 0 ? 2 : 1}`, enabled: !s.busy && !s.drag, action: { type: "connect", port: s.port === 0 ? 1 : 0 } }
    : { label: "Unplug cable", enabled: canInteract(s, "cable"), action: { type: "unplug" } };
  if (task === "inside") {
    if (!s.server) return { label: "Pull server forward", enabled: canInteract(s, "server"), action: { type: "server" } };
    if (s.lid === "closed") return { label: "Slide lid back", enabled: canInteract(s, "lid-slide"), action: { type: "lid-slide" } };
    return { label: s.lid === "lifted" ? "Lower lid" : "Lift lid", enabled: canInteract(s, "lid-lift"), action: { type: "lid-lift" } };
  }
  if (s.disk === "locked") return { label: "Open drive bay", enabled: canInteract(s, "latch"), action: { type: "unlatch" } };
  if (s.disk === "released") return { label: "Pull drive out", enabled: canInteract(s, "disk"), action: { type: "eject" } };
  return { label: "Insert replacement", enabled: canInteract(s, "replacement"), action: { type: "insert" } };
}

export default function RackExperience({ onReady, onUnavailable }: { onReady: () => void; onUnavailable: () => void }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const driveControl = useRef<HTMLDivElement>(null), chassisControl = useRef<HTMLDivElement>(null);
  const cableControl = useRef<HTMLDivElement>(null), latchLabel = useRef<HTMLDivElement>(null);
  const overlays: RackOverlayElements = { drive: driveControl, chassis: chassisControl, cable: cableControl, latch: latchLabel };
  const ringTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ringIdRef = useRef(0);
  const [ring, setRing] = useState<{ id: number; x: number; y: number } | null>(null);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [state, dispatch] = useReducer(rackReducer, undefined, initialRackState);
  const [task, setTask] = useState("disk");
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [view, setView] = useState({ side: "default", revision: 0 });
  const [dragMode, setDragMode] = useState(false);
  const zoomTargetRef = useRef(RACK_DEFAULT_DISTANCE);
  const [zoomDistance, setZoomDistance] = useState(RACK_DEFAULT_DISTANCE);
  const [zooming, setZooming] = useState(false);
  const media = useSyncExternalStore(subscribeMedia, readMedia, () => "false,false,false").split(",");
  const dark = media[0] === "true", reduced = media[1] === "true", fine = media[2] === "true";
  const locked = state.busy || !!state.drag || zooming;
  const pointEnabled = fine || dragMode;
  useEffect(() => () => { if (ringTimerRef.current) clearTimeout(ringTimerRef.current); }, []);
  const clickFeedback = (clientX: number, clientY: number) => {
    const stage = stageRef.current;
    if (reduced || !stage) return;
    const rect = stage.getBoundingClientRect();
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return;
    if (ringTimerRef.current) clearTimeout(ringTimerRef.current);
    setRing({ id: ++ringIdRef.current, x: clientX - rect.left, y: clientY - rect.top });
    ringTimerRef.current = setTimeout(() => setRing(null), 360);
  };
  const zoomBy = (step: number) => {
    const next = clampRackDistance(zoomTargetRef.current + step);
    zoomTargetRef.current = next;
    setZoomDistance(next);
    setZooming(true);
  };
  // Listen on the drawing surface only. Native contextual buttons and the
  // toolbar are siblings, so they retain normal page scrolling.
  useEffect(() => {
    if (!canvas) return;
    const wheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || state.busy || state.drag || !event.deltaY || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      const pixels = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? canvas.clientHeight : 1);
      const step = Math.sign(pixels) * Math.min(Math.abs(pixels) * RACK_ZOOM_STEP / 120, RACK_ZOOM_STEP);
      const next = clampRackDistance(zoomTargetRef.current + step);
      if (next === zoomTargetRef.current) return; // Keep scrolling the page at either limit.
      event.preventDefault();
      zoomTargetRef.current = next;
      setZoomDistance(next);
      setZooming(true);
    };
    canvas.addEventListener("wheel", wheel, { passive: false });
    return () => canvas.removeEventListener("wheel", wheel);
  }, [canvas, state.busy, state.drag]);
  const face = (side: string) => setView(previous => ({ side, revision: previous.revision + 1 }));

  return (
    <div className="w-full text-hero-ink" onKeyDown={event => { if (event.key === "Escape") { dispatch({ type: "cancel-drag" }); setDragMode(false); } }}>
      <div ref={stageRef} className={`rack-stage relative w-full ${RACK_STAGE_SIZE}`} style={{ touchAction: pointEnabled ? "none" : "pan-y" }}>
        <div className="rack-render-area absolute inset-0">
          <div className="rack-backdrop pointer-events-none absolute inset-0" style={{ background: `radial-gradient(ellipse at 54% 48%, ${dark ? "rgb(255 255 255 / 5%)" : "rgb(0 0 0 / 4%)"}, transparent 67%)` }} aria-hidden="true">
            <svg className="h-full w-full text-hero-ink" viewBox="0 0 640 560" preserveAspectRatio="none" fill="none">
              <g stroke="currentColor" strokeOpacity=".13" strokeWidth="1">
                <path d="M42 168v24m-5-18h10m-10 12h10 M591 164v30m-5-24h10m-10 16h10" />
                <path d="M65 116h12m-12 0v12 M567 482h12v-12 M46 457h18m-12-5v10" />
              </g>
              <path d="M566 116h8" stroke="#F6B94F" strokeOpacity=".65" />
            </svg>
          </div>
          <Canvas
            aria-label="Interactive four-bay server rack. Use the contextual drive, chassis, and Ethernet buttons for keyboard controls."
            camera={{ position: RACK_DEFAULT, fov: RACK_FOV, near: 0.1, far: 50 }}
            dpr={[1, 1.5]}
            resize={{ debounce: 0 }}
            frameloop="demand"
            gl={{ antialias: true, alpha: true }}
            style={{ touchAction: pointEnabled ? "none" : "pan-y" }}
            onCreated={({ gl }) => {
              setCanvas(gl.domElement);
              const lost = (event: Event) => { event.preventDefault(); onUnavailable(); };
              gl.domElement.addEventListener("webglcontextlost", lost, { once: true });
            }}
          >
            <RackScene onLatchActivate={clickFeedback} state={state} dispatch={dispatch} dark={dark} reduced={reduced} pointerEnabled={pointEnabled && !zooming} zoomDistance={zoomDistance} zooming={zooming} onZoomSettled={() => setZooming(false)} view={view} onPartSelect={kind => setTask(kind === "cable" ? "cable" : kind === "disk" || kind === "replacement" || kind === "latch" ? "disk" : "inside")} onReady={onReady} overlays={overlays} />
            <GroundTools dark={dark} reduced={reduced} active={activeTool} onActivate={setActiveTool} />
          </Canvas>
          <RackPartControls state={state} dispatch={dispatch} zooming={zooming} onTask={setTask} overlays={overlays} />
          <div ref={latchLabel} hidden aria-hidden="true" className="pointer-events-none absolute left-0 top-0 z-[3]">
            <span className="block -translate-x-1/2 -translate-y-1/2 whitespace-nowrap border border-hero-amber bg-hero-background/95 px-2 py-1 font-technical font-normal text-[10px] text-hero-ink">Open drive bay</span>
          </div>
          {ring && !reduced && <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
            <span key={ring.id} className="rack-click-ring pointer-events-none absolute" style={{ left: ring.x, top: ring.y }} />
          </div>}
          <div className="pointer-events-none absolute inset-x-0 top-2 flex justify-between gap-4 font-technical font-normal text-[9px] tracking-[0.1em] text-hero-ink/45" aria-hidden="true">
            <span>FIG. 01</span><span>HOMELAB SERVER RACK</span>
          </div>
          {!fine && <button type="button" className={`${viewButton} absolute right-0 top-8`} aria-pressed={dragMode} aria-label={dragMode ? "Disable model dragging" : "Enable model dragging"} onClick={() => { if (dragMode) dispatch({ type: "cancel-drag" }); setDragMode(!dragMode); }}>{dragMode ? "Stop dragging" : "Drag model"}</button>}
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1" aria-label="Rack view controls">
            <div className="flex gap-0.5">
              <button type="button" className={viewButton} disabled={locked} onClick={() => { face("front"); setTask("disk"); }}>Front</button>
              <button type="button" className={viewButton} disabled={locked} onClick={() => { face("rear"); setTask("cable"); }}>Rear</button>
              <button type="button" className={`${viewButton} w-10`} aria-label="Zoom out" title="Zoom out" disabled={state.busy || !!state.drag || zoomDistance >= RACK_MAX_DISTANCE} onClick={() => zoomBy(RACK_ZOOM_STEP)}><span aria-hidden="true" className="text-lg leading-none">−</span></button>
              <button type="button" className={`${viewButton} w-10`} aria-label="Zoom in" title="Zoom in" disabled={state.busy || !!state.drag || zoomDistance <= RACK_MIN_DISTANCE} onClick={() => zoomBy(-RACK_ZOOM_STEP)}><span aria-hidden="true" className="text-lg leading-none">+</span></button>
            </div>
            <div className="flex gap-0.5">
              <button type="button" className={viewButton} disabled={state.resetting} onClick={() => { dispatch({ type: "reset" }); zoomTargetRef.current = RACK_DEFAULT_DISTANCE; setZoomDistance(RACK_DEFAULT_DISTANCE); setZooming(false); face("default"); setTask("disk"); setDragMode(false); }}>Reset</button>
            </div>
          </div>
        </div>
      </div>
      <div className="sr-only" aria-label="Homelab ground tiles">
        {["GitHub", "Jenkins", "Docker", "Kubernetes LAB"].map((name, index) => <button key={name} type="button" aria-pressed={activeTool === ["github", "jenkins", "docker", "kubernetes"][index]} onFocus={() => setActiveTool(["github", "jenkins", "docker", "kubernetes"][index])} onBlur={() => setActiveTool(null)} onClick={() => setActiveTool(["github", "jenkins", "docker", "kubernetes"][index])}>{name}</button>)}
      </div>
      <p role="status" aria-live="polite" className="sr-only">{instructions(state, task)}</p>
    </div>
  );
}

const partButton = "min-h-11 sm:min-h-9 border border-hero-ink/20 bg-hero-background/95 px-2 py-1.5 font-technical font-normal text-[9px] leading-tight text-hero-ink outline-offset-2 hover:border-hero-amber focus-visible:outline-2 focus-visible:outline-hero-amber disabled:opacity-40 disabled:cursor-not-allowed";

function PartControl({ element, children, side }: { element: RefObject<HTMLDivElement | null>; children: ReactNode; side: "left" | "right" }) {
  return <div ref={element} hidden className="pointer-events-none absolute left-0 top-0 z-[4]">
    <div className={`rack-part-control flex w-max max-w-40 flex-col gap-1 ${side === "left" ? "-translate-x-full -ml-3" : "ml-3"}`} style={{ pointerEvents: "auto" }} onPointerDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()}>
      {children}
    </div>
  </div>;
}

function RackPartControls({ state, dispatch, zooming, onTask, overlays }: { state: RackState; dispatch: Dispatch<RackAction>; zooming: boolean; onTask: (task: string) => void; overlays: RackOverlayElements }) {
  const drive = nextAction(state, "disk");
  const inside = nextAction(state, "inside");
  const actionButton = (label: string, action: RackAction, enabled: boolean) => <button key={action.type === "connect" ? `port-${action.port}` : undefined} type="button" className={partButton} disabled={zooming || !enabled} onClick={() => { onTask(action.type === "unplug" || action.type === "connect" ? "cable" : action.type === "server" || action.type === "lid-slide" || action.type === "lid-lift" ? "inside" : "disk"); dispatch(action); }}>{label}</button>;
  return <>
    {state.server === 0 && <PartControl element={overlays.drive} side="left">
      {actionButton(drive.label, drive.action, drive.enabled)}
    </PartControl>}
    <PartControl element={overlays.chassis} side="right">
      {actionButton(state.server ? inside.label : "Open chassis", inside.action, inside.enabled)}
      {state.server === SERVER_TRAVEL && state.lid === "closed" && actionButton("Return server", { type: "server" }, canInteract(state, "server"))}
      {state.lid === "slid" && actionButton("Slide lid forward", { type: "lid-slide" }, canInteract(state, "lid-slide"))}
    </PartControl>
    <PartControl element={overlays.cable} side="left">
      {state.detached ? [0, 1].map(port => actionButton(`Connect port ${port + 1}`, { type: "connect", port }, !state.busy && !state.drag)) : actionButton("Unplug cable", { type: "unplug" }, canInteract(state, "cable"))}
    </PartControl>
  </>;
}
