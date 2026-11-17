"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { PROJECT_PATHS, PROJECT_STROKE, PROJECT_WORD } from "@/data/project-title-outlines";
import { DeferredTopography } from "./deferred-topography";
import "./projects-transition.css";

gsap.registerPlugin(ScrollTrigger);

// Camera coordinates are in font-outline units; the SVG viewport never scales.
function restingFrame(width: number, height: number) {
  const aspect = width / Math.max(1, height);
  const viewWidth = Math.max(PROJECT_WORD.width / .88, PROJECT_WORD.height / .7 * aspect);
  return { x: PROJECT_WORD.width / 2, y: PROJECT_WORD.height / 2, width: viewWidth, aspect };
}

export function ProjectsTransition({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const host = root.current;
    const stage = host?.querySelector<HTMLElement>(".projects-title-scene");
    const title = stage?.querySelector<SVGSVGElement>(".projects-zoom-word");
    const outlines = title?.querySelector<SVGGElement>("[data-title-outlines]");
    if (!host || !stage || !title || !outlines) return;
    const showcase = host.querySelector<HTMLElement>("#projects")!;
    const content = showcase.querySelector<HTMLElement>(".projects-showcase-inner")!;
    const media = gsap.matchMedia();
    let frame = restingFrame(stage.clientWidth, stage.clientHeight);
    const camera = { x: frame.x, y: frame.y, zoom: 1, rotation: 0 };
    let targetZoom = 1;
    const draw = () => {
      const width = frame.width / camera.zoom, height = width / frame.aspect;
      title.setAttribute("viewBox", `${camera.x - width / 2} ${camera.y - height / 2} ${width} ${height}`);
      outlines.setAttribute("transform", `rotate(${camera.rotation} ${PROJECT_STROKE.x} ${PROJECT_STROKE.y})`);
    };
    const rest = () => {
      frame = restingFrame(stage.clientWidth, stage.clientHeight);
      Object.assign(camera, { x: frame.x, y: frame.y, zoom: 1, rotation: 0 });
      draw();
    };
    rest();
    const observer = new ResizeObserver(() => {
      if (!host.hasAttribute("data-projects-pinned")) rest();
    });
    observer.observe(stage);

    media.add("(min-width: 768px) and (pointer: fine) and (prefers-reduced-motion: no-preference)", () => {
        function measure() {
          frame = restingFrame(stage!.clientWidth, stage!.clientHeight);
          // Keep the final camera safely inside the stem even with its tilt.
          const width = PROJECT_STROKE.thickness * .65 * Math.min(1, frame.aspect);
          targetZoom = frame.width / width;
          host!.style.setProperty("--projects-scene-height", `${stage!.clientHeight}px`);
          host!.dataset.zoomTarget = "E / solid vertical stroke";
        }
        measure();
        host.setAttribute("data-projects-pinned", "true");
        gsap.set(showcase, { autoAlpha: 0 });
        gsap.set(content, { transformOrigin: "50% 180px" });
        const phase = (progress: number, active: boolean) => {
          const next = progress < .6 ? "title" : progress < .8 ? "pause" : "showcase";
          const playing = String(active);
          if (host!.dataset.projectsPhase === next && host!.dataset.projectsActive === playing) return;
          host!.dataset.projectsPhase = next;
          host!.dataset.projectsActive = playing;
          window.dispatchEvent(new Event("projectsphasechange"));
        };
        const timeline = gsap.timeline({ scrollTrigger: {
          id: "projects-handoff", trigger: stage, pin: stage, start: "top top", end: () => `+=${innerHeight * 2.5}`,
          scrub: true, pinSpacing: true, invalidateOnRefresh: true,
          onRefreshInit: measure,
          onUpdate: trigger => phase(trigger.progress, trigger.isActive),
          onRefresh: trigger => { draw(); phase(trigger.progress, trigger.isActive); },
        } });
        timeline.fromTo(camera, { x: () => frame.x, y: () => frame.y, zoom: 1, rotation: 0 }, {
          x: PROJECT_STROKE.x, y: PROJECT_STROKE.y, zoom: () => targetZoom, rotation: -6,
          duration: .54, ease: "power2.in", onUpdate: draw,
        }, .04)
          // The stem is already solid edge to edge before changing the surface.
          .fromTo(host, { backgroundColor: "#FFFFFF" }, { backgroundColor: "#000000", duration: 0, immediateRender: false }, .59)
          // Keep the word paintable on reverse. Fade only after its solid stem
          // covers the screen and the shared surface has already turned black.
          .fromTo(title, { opacity: 1 }, { opacity: 0, duration: .01, immediateRender: false }, .59)
          // .6–.8 deliberately has no content animation. Only the shared
          // terrain clock keeps moving while scroll progress is held here.
          .fromTo(showcase, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0, immediateRender: false }, .8)
          .fromTo(content, { y: () => innerHeight * .5, scale: 1.08 }, { y: 0, scale: 1, duration: .2, ease: "none" }, .8);

        const jumpToShowcase = () => {
          const trigger = timeline.scrollTrigger;
          if (!trigger) return;
          window.scrollTo({ top: trigger.end, behavior: "instant" });
          trigger.update();
          timeline.progress(1);
        };
        const hash = () => { if (location.hash === "#projects") jumpToShowcase(); };
        let closingDialog: HTMLDialogElement | null = null;
        const anchor = (event: MouseEvent) => {
          if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
          const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
          if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
          const url = new URL(link.href, location.href);
          if (url.origin !== location.origin || url.pathname !== location.pathname || url.hash !== "#projects") return;
          if (event.defaultPrevented) {
            // The container owns its close animation. Finish the same direct
            // jump afterward, even if #projects was already the current hash.
            const dialog = link.closest("dialog");
            if (dialog?.open) {
              closingDialog = dialog;
              dialog.addEventListener("close", jumpToShowcase, { once: true });
            }
            return;
          }
          event.preventDefault();
          if (location.hash !== "#projects") history.pushState(null, "", "#projects");
          jumpToShowcase();
        };
        document.addEventListener("click", anchor);
        window.addEventListener("hashchange", hash);
        ScrollTrigger.refresh();
        hash();
        return () => {
          document.removeEventListener("click", anchor);
          window.removeEventListener("hashchange", hash);
          closingDialog?.removeEventListener("close", jumpToShowcase);
          host!.removeAttribute("data-projects-pinned");
          host!.removeAttribute("data-zoom-target");
          host!.removeAttribute("data-projects-phase");
          host!.removeAttribute("data-projects-active");
          host!.style.removeProperty("--projects-scene-height");
          rest();
          window.dispatchEvent(new Event("projectsphasechange"));
        };
    });
    return () => { observer.disconnect(); media.revert(); rest(); };
  }, []);

  return <div ref={root} className="projects-transition" data-contour-surface>
    <DeferredTopography />
    {children}
  </div>;
}

export function ProjectsTitle() {
  const initial = restingFrame(1600, 900);
  const height = initial.width / initial.aspect;
  return <div className="projects-title-scene" aria-hidden="true">
    <svg className="projects-zoom-word" viewBox={`${initial.x - initial.width / 2} ${initial.y - height / 2} ${initial.width} ${height}`} preserveAspectRatio="xMidYMid meet">
      <title>PROJECT</title>
      <g data-title-outlines fill="#000000">
        {PROJECT_PATHS.map((d, index) => <path key={index} d={d} />)}
      </g>
    </svg>
  </div>;
}
