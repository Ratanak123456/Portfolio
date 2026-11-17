"use client";

import { Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { CanvasTexture, CatmullRomCurve3, ExtrudeGeometry, ShaderMaterial, Shape, SRGBColorSpace, Vector3 } from "three";
import { FLOOR_Y, GROUND_TOOLS, TILE_ANGLE, TILE_DEPTH, TILE_HEIGHT, TILE_WIDTH } from "./ground-layout";
import { TOOL_LOGOS } from "./tool-logos";

const AMBER = "#F6B94F";
function tileShape() {
  const w = TILE_WIDTH / 2, d = TILE_DEPTH / 2, r = .055;
  const shape = new Shape();
  shape.moveTo(-w + r, -d);
  shape.lineTo(w - r, -d); shape.quadraticCurveTo(w, -d, w, -d + r);
  shape.lineTo(w, d - r); shape.quadraticCurveTo(w, d, w - r, d);
  shape.lineTo(-w + r, d); shape.quadraticCurveTo(-w, d, -w, d - r);
  shape.lineTo(-w, -d + r); shape.quadraticCurveTo(-w, -d, -w + r, -d);
  return shape;
}

function faceTexture(id: string, label: string, dark: boolean) {
  const canvas = document.createElement("canvas");
  canvas.width = 768; canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = dark ? "#101113" : "#ffffff";
  ctx.fillRect(0, 0, 768, 512);
  ctx.fillStyle = dark ? "#ffffff" : "#000000";
  ctx.save(); ctx.translate(264, 42); ctx.scale(10, 10);
  TOOL_LOGOS[id].forEach(path => ctx.fill(new Path2D(path)));
  ctx.restore();
  ctx.textAlign = "center";
  ctx.font = "600 64px monospace"; ctx.fillText(label, 384, 350);
  if (id === "kubernetes") { ctx.font = "500 32px monospace"; ctx.fillText("L A B", 384, 412); }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function Tile({ tool, active, onActivate }: { tool: typeof GROUND_TOOLS[number]; active: boolean; onActivate: (id: string | null) => void }) {
  const resources = useMemo(() => {
    const shape = tileShape();
    const geometry = new ExtrudeGeometry(shape, { depth: TILE_HEIGHT - .06, bevelEnabled: true, bevelThickness: .03, bevelSize: .025, bevelSegments: 2, steps: 1 });
    const edge = shape.getPoints(48).map(p => new Vector3(p.x, TILE_HEIGHT + .002, -p.y));
    edge.push(edge[0].clone());
    const texture = faceTexture(tool.id, tool.label, tool.dark);
    return { geometry, edge, texture };
  }, [tool]);
  useEffect(() => () => { resources.geometry.dispose(); resources.texture.dispose(); }, [resources]);
  return <group name={`ground-tile-${tool.id}`} position={tool.position} rotation={[0, TILE_ANGLE, 0]}>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .03, 0]} geometry={resources.geometry}
      onPointerOver={e => { e.stopPropagation(); onActivate(tool.id); }} onPointerOut={() => onActivate(null)}
      onClick={e => { e.stopPropagation(); if (e.delta < 5) onActivate(tool.id); }}>
      <meshStandardMaterial color={tool.dark ? "#25282c" : "#c9cbce"} roughness={.58} metalness={.25} />
    </mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, TILE_HEIGHT + .001, 0]} raycast={() => null}>
      <planeGeometry args={[TILE_WIDTH - .04, TILE_DEPTH - .04]} />
      <meshBasicMaterial map={resources.texture} toneMapped={false} />
    </mesh>
    <Line points={resources.edge} color={AMBER} lineWidth={active ? 1.8 : 1} raycast={() => null} />
  </group>;
}

// A floor cable is authored from its card socket toward its rack base socket.
// Tube UV.x increases in that same direction; the signal shader never reverses it.
export function floorCable(tool: typeof GROUND_TOOLS[number]) {
  const center = new Vector3(...tool.position);
  const inward = new Vector3(-center.x, 0, -center.z).normalize();
  const local = inward.clone().applyAxisAngle(new Vector3(0, 1, 0), -TILE_ANGLE);
  const travel = Math.min(TILE_WIDTH / 2 / Math.abs(local.x), TILE_DEPTH / 2 / Math.abs(local.z));
  const start = center.clone().addScaledVector(inward, travel + .025); start.y = FLOOR_Y + .075;
  const end = new Vector3(...tool.rack);
  const lead = start.clone().addScaledVector(inward, .35); lead.y = FLOOR_Y + .035;
  const approach = end.clone().multiplyScalar(1.25); approach.y = FLOOR_Y + .035;
  const middle = lead.clone().lerp(approach, .5); middle.y = FLOOR_Y + .035;
  return new CatmullRomCurve3([start, lead, middle, approach, end], false, "centripetal");
}

function FloorCable({ tool, index, dark, reduced, active }: { tool: typeof GROUND_TOOLS[number]; index: number; dark: boolean; reduced: boolean; active: boolean }) {
  const curve = useMemo(() => floorCable(tool), [tool]);
  const material = useMemo(() => new ShaderMaterial({
    uniforms: { time: { value: 0 }, delay: { value: index * .5 }, motion: { value: reduced ? 0 : 1 }, base: { value: dark ? .46 : .24 }, highlight: { value: active ? 1 : 0 }, halo: { value: 0 } },
    vertexShader: `varying float progress; varying vec3 surfaceNormal; void main() { surfaceNormal = normalize(normalMatrix * normal); progress = uv.x; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying float progress; varying vec3 surfaceNormal; uniform float time, delay, motion, base, highlight, halo;
      void main() {
        float phase = mod(max(0.0, time - delay), 2.2);
        float head = phase / 1.2 * 1.16;
        float tail = smoothstep(head - .16, head, progress) * (1.0 - smoothstep(head, head + .012, progress));
        float tip = smoothstep(head - .035, head, progress) * (1.0 - smoothstep(head, head + .008, progress));
        float signal = tail * motion * step(delay, time) * (1.0 - step(1.2, phase));
        vec3 amber = vec3(0.9647, 0.7255, 0.3098);
        float shade = .65 + .35 * max(0.0, dot(surfaceNormal, normalize(vec3(.3, .8, .5))));
        vec3 cable = mix(vec3(base) * shade, amber * .65, highlight * .6);
        gl_FragColor = halo > .5 ? vec4(amber, signal * .22) : vec4(mix(cable, amber, signal) + amber * tip * signal * .24, 1.0);
      }`,
    toneMapped: false,
  }), [dark, index, reduced, active]);
  const glow = useMemo(() => {
    const result = material.clone();
    result.uniforms = { ...material.uniforms, halo: { value: 1 } };
    result.transparent = true; result.depthWrite = false;
    return result;
  }, [material]);
  const materialRef = useRef<ShaderMaterial>(null);
  const elapsed = useRef(0);
  useEffect(() => () => { material.dispose(); glow.dispose(); }, [material, glow]);
  useFrame((state, delta) => {
    if (reduced) return;
    elapsed.current += delta;
    if (materialRef.current) materialRef.current.uniforms.time.value = elapsed.current;
    state.invalidate();
  });
  return <group name={`floor-cable-${tool.id}`}>
    <mesh raycast={() => null}><primitive object={material} ref={materialRef} attach="material" /><tubeGeometry args={[curve, 72, .027, 8, false]} /></mesh>
    {!reduced && <mesh material={glow} raycast={() => null}><tubeGeometry args={[curve, 72, .06, 8, false]} /></mesh>}
    {[curve.getPoint(0), curve.getPoint(1)].map((point, i) => <mesh key={i} position={point} raycast={() => null}>
      <sphereGeometry args={[.047, 12, 8]} /><meshBasicMaterial color={AMBER} toneMapped={false} />
    </mesh>)}
  </group>;
}

function ContactShadows({ dark }: { dark: boolean }) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas"); canvas.width = canvas.height = 128;
    const ctx = canvas.getContext("2d")!;
    ctx.filter = "blur(7px)";
    ctx.fillStyle = "rgba(0,0,0,.45)";
    ctx.fillRect(13, 13, 102, 102);
    return new CanvasTexture(canvas);
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return <group name="tile-contact-shadows">{GROUND_TOOLS.map(tool => <mesh key={tool.id} rotation={[-Math.PI / 2, 0, TILE_ANGLE]} position={[tool.position[0], FLOOR_Y + .002, tool.position[2]]} raycast={() => null}>
    <planeGeometry args={[TILE_WIDTH * 1.23, TILE_DEPTH * 1.23]} />
    <meshBasicMaterial map={texture} transparent opacity={dark ? .55 : .8} depthWrite={false} />
  </mesh>)}</group>;
}

export function GroundTools({ dark, reduced, active, onActivate }: { dark: boolean; reduced: boolean; active: string | null; onActivate: (id: string | null) => void }) {
  return <group name="homelab-ground-assembly">
    <gridHelper args={[14, 35, dark ? "#ffffff" : "#000000", dark ? "#ffffff" : "#000000"]} position={[0, FLOOR_Y - .002, 0]} raycast={() => null}>
      <lineBasicMaterial transparent opacity={dark ? .085 : .055} depthWrite={false} />
    </gridHelper>
    <ContactShadows dark={dark} />
    {GROUND_TOOLS.map((tool, i) => <group key={tool.id}>
      <Tile tool={tool} active={active === tool.id} onActivate={onActivate} />
      <FloorCable tool={tool} index={i} dark={dark} reduced={reduced} active={active === tool.id} />
    </group>)}
  </group>;
}
