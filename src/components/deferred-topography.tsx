"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

// This boundary stays small; neither the renderer nor its terrain math is in
// the initial client graph. Rendering it once keeps its canvas alive on return.
const Renderer = dynamic(() => import("./topographic-background").then(module => module.TopographicBackground), { ssr: false });

export function DeferredTopography() {
  const slot = useRef<HTMLDivElement>(null);
  const [approached, setApproached] = useState(false);

  useEffect(() => {
    const section = slot.current?.closest("[data-contour-surface], section");
    if (!section) return;
    const home = section.closest("[data-ssh-home]");
    let near = false;
    const load = () => {
      // Avoid spending below-the-fold work behind the closed intro doors.
      if (!near || section.closest("[inert]")) return;
      setApproached(true);
      observer.disconnect(); gateObserver.disconnect();
    };
    const observer = new IntersectionObserver(([entry]) => {
      near = entry.isIntersecting;
      load();
    }, { rootMargin: "300px 0px", threshold: 0 });
    const gateObserver = new MutationObserver(load);
    observer.observe(section);
    if (home) gateObserver.observe(home, { attributes: true, attributeFilter: ["inert"] });
    return () => { observer.disconnect(); gateObserver.disconnect(); };
  }, []);

  return <div ref={slot} className="contents" aria-hidden="true" data-contour-load={approached ? "requested" : "waiting"}>
    {approached && <Renderer />}
  </div>;
}
