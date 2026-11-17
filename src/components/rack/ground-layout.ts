import type { Point3 } from "./rack-state";

export const FLOOR_Y = -1.665;
export const TILE_WIDTH = 1.45;
export const TILE_DEPTH = 1.05;
export const TILE_HEIGHT = .14;
export const TILE_ANGLE = Math.atan2(4.1, 6.15);
const right = [Math.cos(TILE_ANGLE), -Math.sin(TILE_ANGLE)];
const forward = [Math.sin(TILE_ANGLE), Math.cos(TILE_ANGLE)];

// Fixed world positions; independent of camera and every rack mechanism.
export const GROUND_TOOLS = [
  { id: "github", label: "GitHub", dark: true, across: -3.6, depth: -1.3, rack: [-1.15, -1.57, -.8] as Point3 },
  { id: "jenkins", label: "Jenkins", dark: false, across: 3.6, depth: -1.3, rack: [.7, -1.57, -1.08] as Point3 },
  { id: "docker", label: "Docker", dark: true, across: -2.25, depth: 2.1, rack: [-.75, -1.57, 1.05] as Point3 },
  { id: "kubernetes", label: "Kubernetes", dark: true, across: 2.25, depth: 2.1, rack: [1.24, -1.57, .55] as Point3 },
].map(tool => ({ ...tool, position: [
  right[0] * tool.across + forward[0] * tool.depth,
  FLOOR_Y,
  right[1] * tool.across + forward[1] * tool.depth,
] as Point3 }));
