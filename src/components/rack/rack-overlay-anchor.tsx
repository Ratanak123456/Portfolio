"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, type RefObject } from "react";
import { Group, Vector3 } from "three";
import type { Point3 } from "./rack-state";

export type RackOverlayElements = {
  drive: RefObject<HTMLDivElement | null>;
  chassis: RefObject<HTMLDivElement | null>;
  cable: RefObject<HTMLDivElement | null>;
  latch: RefObject<HTMLDivElement | null>;
};

// The scene owns only the anchor. React DOM owns the label/button in the page
// tree, avoiding Html's separate root and synchronous layout-effect unmount.
export function RackOverlayAnchor({ element, position, front, enabled = true }: {
  element: RefObject<HTMLDivElement | null>; position: Point3; front?: boolean; enabled?: boolean;
}) {
  const anchor = useRef<Group>(null);
  const point = useMemo(() => new Vector3(), []);
  useFrame(({ camera, size }) => {
    const node = element.current;
    if (!node || !anchor.current) return;
    camera.updateMatrixWorld();
    anchor.current.updateWorldMatrix(true, false);
    anchor.current.getWorldPosition(point).project(camera);
    const wrongFace = front === undefined ? false : front ? camera.position.z < 0 : camera.position.z >= 0;
    node.hidden = !enabled || wrongFace || point.z < -1 || point.z > 1;
    node.style.transform = `translate3d(${(point.x + 1) * size.width / 2}px, ${(1 - point.y) * size.height / 2}px, 0)`;
  });
  return <group ref={anchor} position={position} />;
}
