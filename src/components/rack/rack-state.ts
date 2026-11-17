export type Point3 = [number, number, number];
export type DragKind = "disk" | "replacement" | "server" | "lid-slide" | "lid-lift" | "cable";
export type DiskStage = "locked" | "released" | "removed" | "seating" | "closing";
export type LidStage = "closed" | "slid" | "lifted";
export const PORTS: Point3[] = [[-0.45, -1.05, -1.14], [0.45, -1.05, -1.14]];
export const SERVER_TRAVEL = 2.5;
export const TRAY_TRAVEL = 1.4;

export interface RackState {
  disk: DiskStage;
  tray: number;
  swaps: number;
  server: number;
  lid: LidStage;
  lidBack: number;
  lidLift: number;
  port: number;
  detached: boolean;
  plug: Point3;
  drag: DragKind | null;
  busy: boolean;
  resetting: boolean;
}

export function initialRackState(): RackState {
  return { disk: "locked", tray: 0, swaps: 0, server: 0, lid: "closed", lidBack: 0, lidLift: 0, port: 0, detached: false, plug: [...PORTS[0]], drag: null, busy: false, resetting: false };
}

export type RackAction =
  | { type: "reset" | "motion-done" | "unlatch" | "eject" | "insert" | "server" | "lid-slide" | "lid-lift" | "unplug" | "cancel-drag" }
  | { type: "connect"; port: number }
  | { type: "drag-start"; kind: DragKind }
  | { type: "drag-move"; kind: DragKind; value: number | Point3 }
  | { type: "drag-end"; port?: number };

const clamp = (n: number, low: number, high: number) => Math.min(high, Math.max(low, n));
export function canInteract(s: RackState, kind: DragKind | "latch") {
  if (s.busy || s.drag) return false;
  switch (kind) {
    case "latch": return s.disk === "locked" && s.server === 0;
    case "disk": return s.disk === "released" && s.server === 0;
    case "replacement": return s.disk === "removed" && s.server === 0;
    case "server": return s.disk === "locked" && s.lid === "closed";
    case "lid-slide": return s.server === SERVER_TRAVEL && s.lid !== "lifted";
    case "lid-lift": return s.server === SERVER_TRAVEL && s.lid !== "closed";
    case "cable": return true;
  }
}

function resetStep(s: RackState): RackState {
  const next = { ...s, resetting: true, drag: null, busy: true };
  // Close in clearance order: lower, slide lid forward, then retract the server.
  if (s.lidLift > 0) return { ...next, lid: "slid", lidLift: 0 };
  if (s.lidBack > 0) return { ...next, lid: "closed", lidBack: 0 };
  if (s.server > 0) return { ...next, server: 0 };
  if (s.tray > 0) return { ...next, tray: 0, disk: "seating" };
  if (s.disk !== "locked") return { ...next, disk: "locked" };
  return { ...initialRackState(), busy: true };
}

export function rackReducer(s: RackState, a: RackAction): RackState {
  if (a.type === "reset") return s.resetting ? s : resetStep(s);
  if (a.type === "motion-done") {
    if (!s.busy || s.drag) return s;
    if (s.resetting) return resetStep(s);
    if (s.disk === "seating") return { ...s, disk: "closing" };
    if (s.disk === "closing") return { ...s, disk: "locked", swaps: s.swaps + 1, busy: false };
    return { ...s, busy: false };
  }
  if (a.type === "cancel-drag") {
    if (!s.drag) return s;
    const next = { ...s, drag: null, busy: true };
    switch (s.drag) {
      case "disk": return { ...next, tray: 0.18 };
      case "replacement": return { ...next, tray: TRAY_TRAVEL };
      case "server": return { ...next, server: s.server >= SERVER_TRAVEL / 2 ? SERVER_TRAVEL : 0 };
      case "lid-slide": return { ...next, lidBack: s.lid === "closed" ? 0 : 0.34 };
      case "lid-lift": return { ...next, lidLift: s.lid === "lifted" ? 1.05 : 0 };
      case "cable": return { ...next, detached: false, plug: [...PORTS[s.port]] };
    }
  }
  if (a.type === "drag-move") {
    if (s.drag !== a.kind) return s;
    if (a.kind === "cable" && Array.isArray(a.value)) {
      return { ...s, plug: [clamp(a.value[0], -1.5, 1.5), clamp(a.value[1], -1.6, 0.1), -1.55] };
    }
    if (typeof a.value !== "number" || !Number.isFinite(a.value)) return s;
    switch (a.kind) {
      case "disk": case "replacement": return { ...s, tray: clamp(a.value, 0, TRAY_TRAVEL) };
      case "server": return { ...s, server: clamp(a.value, 0, SERVER_TRAVEL) };
      case "lid-slide": return { ...s, lidBack: clamp(a.value, 0, 0.34) };
      case "lid-lift": return { ...s, lidLift: clamp(a.value, 0, 1.05) };
      default: return s;
    }
  }
  if (a.type === "drag-end") {
    if (!s.drag) return s;
    const next = { ...s, drag: null, busy: true };
    switch (s.drag) {
      case "disk": return s.tray > 1.1 ? { ...next, disk: "removed", tray: TRAY_TRAVEL } : { ...next, tray: 0.18 };
      case "replacement": return s.tray < 0.2 ? { ...next, disk: "seating", tray: 0 } : { ...next, tray: TRAY_TRAVEL };
      case "server": return { ...next, server: s.server > 1.25 ? SERVER_TRAVEL : 0 };
      case "lid-slide": return { ...next, lid: s.lidBack > 0.17 ? "slid" : "closed", lidBack: s.lidBack > 0.17 ? 0.34 : 0 };
      case "lid-lift": return { ...next, lid: s.lidLift > 0.5 ? "lifted" : "slid", lidLift: s.lidLift > 0.5 ? 1.05 : 0 };
      case "cable": {
        const candidate = a.port === 0 || a.port === 1 ? a.port : PORTS.findIndex(p => Math.hypot(p[0] - s.plug[0], p[1] - s.plug[1]) < 0.32);
        const port = candidate < 0 ? s.port : candidate;
        return { ...next, port, detached: false, plug: [...PORTS[port]] };
      }
    }
  }
  if (a.type === "drag-start") {
    if (!canInteract(s, a.kind)) return s;
    return { ...s, drag: a.kind, detached: a.kind === "cable" ? true : s.detached };
  }
  if (s.busy || s.drag) return s;
  switch (a.type) {
    case "unlatch": return canInteract(s, "latch") ? { ...s, disk: "released", tray: 0.18, busy: true } : s;
    case "eject": return canInteract(s, "disk") ? { ...s, disk: "removed", tray: TRAY_TRAVEL, busy: true } : s;
    case "insert": return canInteract(s, "replacement") ? { ...s, disk: "seating", tray: 0, busy: true } : s;
    case "server": return canInteract(s, "server") ? { ...s, server: s.server === 0 ? SERVER_TRAVEL : 0, busy: true } : s;
    case "lid-slide": return canInteract(s, "lid-slide") ? { ...s, lid: s.lid === "closed" ? "slid" : "closed", lidBack: s.lid === "closed" ? 0.34 : 0, busy: true } : s;
    case "lid-lift": return canInteract(s, "lid-lift") ? { ...s, lid: s.lid === "lifted" ? "slid" : "lifted", lidLift: s.lid === "lifted" ? 0 : 1.05, busy: true } : s;
    case "unplug": return { ...s, detached: true, plug: [PORTS[s.port][0], PORTS[s.port][1], -1.65], busy: true };
    case "connect": return a.port === 0 || a.port === 1 ? { ...s, port: a.port, detached: false, plug: [...PORTS[a.port]], busy: true } : s;
    default: return s;
  }
}

export function rackMotion(s: RackState) {
  return { server: s.server, tray: s.tray, latch: s.disk === "locked" || s.disk === "closing" ? 0 : -1.15, lidBack: s.lidBack, lidLift: s.lidLift, plugX: s.plug[0], plugY: s.plug[1], plugZ: s.plug[2] };
}
