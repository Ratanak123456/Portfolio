"use client";

import { useEffect, useRef } from "react";
import { CONTOUR_COUNT, createTerrain, deformTerrain, traceContours, type TerrainGrid } from "./topography/contour-field";

export function TopographicBackground() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current, section = canvas?.closest<HTMLElement>("[data-contour-surface], section");
    const context = canvas?.getContext("2d");
    if (!canvas || !section || !context) return;
    const dark = matchMedia("(prefers-color-scheme: dark)");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const fine = matchMedia("(any-hover: hover) and (any-pointer: fine)");
    let width = 0, height = 0, dpr = 1, grid: TerrainGrid;
    let visible = false, frame = 0, previousTime: number | null = null, elapsed = 0, lastMove = -Infinity;
    let inside = false, strength = 0, x = 0, y = 0, targetX = 0, targetY = 0;
    const interactive = () => fine.matches && !reduced.matches;
    const stop = () => { cancelAnimationFrame(frame); frame = 0; previousTime = null; };
    const wake = () => {
      if (!frame && visible && !document.hidden) frame = requestAnimationFrame(paint);
    };
    function paint(time: number) {
      frame = 0;
      if (!visible || document.hidden || !grid) return;
      // Visibility owns the terrain loop. Schedule its next frame regardless
      // of pointer activity, hover capability, or remaining ripple strength.
      if (!reduced.matches) wake();
      // Draw at up to 30 fps. The clock advances only while visible; offscreen
      // and hidden-tab time never causes a jump on returning to About.
      if (!reduced.matches && previousTime !== null && time - previousTime < 1000 / 30 - 1) return;
      const dt = previousTime === null ? 0 : time - previousTime;
      previousTime = time;
      if (!reduced.matches) elapsed += dt / 1000;
      const follow = 1 - Math.exp(-dt / 75);
      x += (targetX - x) * follow; y += (targetY - y) * follow;
      // A small local pointer nudge sits beneath the autonomous morphing.
      // Leaving releases only this influence; idle evolution keeps going.
      const destination = inside && interactive() && time - lastMove < 180 ? .18 : 0;
      strength += (destination - strength) * (1 - Math.exp(-dt / 155));
      if (Math.abs(destination - strength) < .001) strength = destination;
      if (Math.abs(targetX - x) < .05) x = targetX;
      if (Math.abs(targetY - y) < .05) y = targetY;
      deformTerrain(grid, { x, y, radius: Math.max(260, Math.min(360, width * .25)), strength }, reduced.matches ? 0 : elapsed);
      const paths: (Path2D | undefined)[] = new Array(CONTOUR_COUNT);
      traceContours(grid, (level, ax, ay, bx, by) => {
        const path = paths[level] ?? (paths[level] = new Path2D());
        path.moveTo(ax, ay); path.lineTo(bx, by);
      });
      context!.setTransform(dpr, 0, 0, dpr, 0, 0);
      context!.clearRect(0, 0, width, height);
      context!.lineWidth = .8;
      context!.lineCap = "round";
      // Difference blending gives this same field dark ink on white and light
      // ink on black. Its world coordinates and clock survive the handoff.
      const ink = section!.hasAttribute("data-contour-surface") || dark.matches ? "255, 255, 255" : "0, 0, 0";
      paths.forEach((path, level) => {
        if (!path) return;
        context!.strokeStyle = `rgba(${ink}, ${level % 5 === 0 ? .105 : .075})`;
        context!.stroke(path);
      });
      if (reduced.matches) previousTime = null;
    }
    const reset = () => { inside = false; strength = 0; lastMove = -Infinity; };
    const resize = () => {
      const rect = section.getBoundingClientRect();
      const nextDpr = Math.min(window.devicePixelRatio || 1, 2);
      if (width === rect.width && height === rect.height && dpr === nextDpr) return;
      width = rect.width; height = rect.height; dpr = nextDpr;
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      grid = createTerrain(width, height);
      reset(); wake();
    };
    const move = (event: PointerEvent) => {
      if (!interactive() || event.pointerType === "touch") return;
      const rect = section.getBoundingClientRect();
      targetX = event.clientX - rect.left; targetY = event.clientY - rect.top;
      if (!inside) { x = targetX; y = targetY; }
      inside = true; lastMove = performance.now(); wake();
    };
    const leave = () => { inside = false; wake(); };
    const media = () => { if (!interactive()) reset(); wake(); };
    const visibility = () => { if (document.hidden) { stop(); reset(); } else wake(); };
    // The hero can end exactly at the viewport edge. Observe a positive-area
    // threshold too, so that initial ratio=0 contact cannot leave About asleep.
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && entry.intersectionRatio > 0;
      if (visible) wake();
      else { stop(); reset(); }
    }, { threshold: [0, .001] });
    const resizeObserver = new ResizeObserver(resize);
    observer.observe(section); resizeObserver.observe(section); resize();
    // Native bubbling listeners see events over the portrait too. They neither
    // capture input nor cancel the existing Wolverine pointer handlers.
    section.addEventListener("pointermove", move, { passive: true });
    section.addEventListener("pointerleave", leave, { passive: true });
    section.addEventListener("pointercancel", leave, { passive: true });
    [dark, reduced, fine].forEach(query => query.addEventListener("change", media));
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("resize", resize);
    return () => {
      stop(); observer.disconnect(); resizeObserver.disconnect();
      section.removeEventListener("pointermove", move);
      section.removeEventListener("pointerleave", leave);
      section.removeEventListener("pointercancel", leave);
      [dark, reduced, fine].forEach(query => query.removeEventListener("change", media));
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} className="about-topography" aria-hidden="true" />;
}
