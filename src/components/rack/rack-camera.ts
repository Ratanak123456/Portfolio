import { Matrix4, Vector3 } from "three";
import { FLOOR_Y, GROUND_TOOLS, TILE_ANGLE, TILE_DEPTH, TILE_WIDTH } from "./ground-layout";
import type { Point3 } from "./rack-state";

export const RACK_FRONT: Point3 = [4.6, 2.7, 6.3];
export const RACK_DEFAULT: Point3 = [4.1, 3.2, 6.25];
export const RACK_DEFAULT_TARGET: Point3 = [0, -0.7, 0.1];
export const RACK_REAR: Point3 = [-4.6, 2.7, -6.3];
export const RACK_TARGET: Point3 = [0, -0.2, 0.25];
export const RACK_ZOOM_TARGET: Point3 = [-0.3, 0.6, 1.15];
export const RACK_REAR_TARGET: Point3 = [0, -0.5, -1];
export const RACK_FOV = 38;
export const RACK_MIN_DISTANCE = 6;
export const RACK_MAX_DISTANCE = 10.5;
export const RACK_ZOOM_STEP = 0.65;
export const RACK_DEFAULT_DISTANCE = Math.hypot(
  RACK_DEFAULT[0] - RACK_DEFAULT_TARGET[0],
  RACK_DEFAULT[1] - RACK_DEFAULT_TARGET[1],
  RACK_DEFAULT[2] - RACK_DEFAULT_TARGET[2],
);

export function clampRackDistance(distance: number) {
  return Math.min(RACK_MAX_DISTANCE, Math.max(RACK_MIN_DISTANCE, distance));
}

// Frame the whole static setup, including the service envelope. Mechanism state
// never affects fitting. Each preset uses its own camera; zoom remains a dolly.
export function rackFieldOfView(aspect: number, side = "default", viewportWidth = 0) {
  if (!Number.isFinite(aspect) || aspect <= 0) return RACK_FOV;
  const target = side === "default" ? RACK_DEFAULT_TARGET : side === "rear" ? RACK_REAR_TARGET : RACK_TARGET;
  const original = side === "default" ? RACK_DEFAULT : side === "rear" ? RACK_REAR : RACK_FRONT;
  const position = new Vector3(...original).sub(new Vector3(...(side === "default" ? RACK_DEFAULT_TARGET : RACK_TARGET)))
    .normalize().multiplyScalar(RACK_DEFAULT_DISTANCE).add(new Vector3(...target));
  const view = new Matrix4().lookAt(position, new Vector3(...target), new Vector3(0, 1, 0)).setPosition(position).invert();
  const points: Vector3[] = [];
  for (const x of [-1.25, 1.25]) for (const y of [-1.665, 1.545]) for (const z of [-1.1, 1.1]) points.push(new Vector3(x, y, z));
  // Full server travel and lifted lid remain inside the same fixed envelope.
  for (const x of [-1.1, 1.1]) for (const y of [.7, 2.1]) points.push(new Vector3(x, y, 2.8));
  for (const tool of GROUND_TOOLS) for (const x of [-TILE_WIDTH / 2 - .06, TILE_WIDTH / 2 + .06]) for (const z of [-TILE_DEPTH / 2 - .06, TILE_DEPTH / 2 + .06]) {
    points.push(new Vector3(x, .14, z).applyAxisAngle(new Vector3(0, 1, 0), TILE_ANGLE).add(new Vector3(...tool.position)));
  }
  points.push(new Vector3(-2.4, FLOOR_Y, 1.4));
  // Spend some of the old lower padding on a tighter lens on desktop.
  // Ease in from small desktops; phones retain their original full-setup fit.
  const desktop = Math.min(1, Math.max(0, (viewportWidth - 1024) / 576));
  const lowerClearance = .61 + .11 * desktop;
  let tangent = 0;
  for (const point of points) {
    point.applyMatrix4(view);
    tangent = Math.max(tangent, Math.abs(point.x / -point.z) / (aspect * .91), Math.abs(point.y / -point.z) / (point.y < 0 ? lowerClearance : .91));
  }
  return 2 * Math.atan(tangent) * 180 / Math.PI;
}
