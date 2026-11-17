"use client";

import Image from "next/image";
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { useEffect, useId, useRef, useState, type PointerEvent } from "react";

type PortraitProps = {
  photo: string;
  alternate: string;
};

export function PortraitReveal({ photo, alternate }: PortraitProps) {
  const figure = useRef<HTMLElement>(null);
  const alternateId = useId();
  const reduced = useReducedMotion();
  const [approached, setApproached] = useState(false);
  const [photoReady, setPhotoReady] = useState(false);
  const [alternateReady, setAlternateReady] = useState(false);
  const [revealAll, setRevealAll] = useState(false);
  const [pointerInside, setPointerInside] = useState(false);
  const x = useMotionValue(0), y = useMotionValue(0), radius = useMotionValue(0);
  const spring = { stiffness: 420, damping: 34, mass: .45 };
  const smoothX = useSpring(x, spring), smoothY = useSpring(y, spring), smoothRadius = useSpring(radius, spring);
  const mask = useMotionTemplate`radial-gradient(circle ${smoothRadius}px at ${smoothX}px ${smoothY}px, #000 0%, #000 62%, transparent 100%)`;
  // Same spring coordinates as the mask. The gutter only offsets the larger
  // background layer's origin; it never moves either portrait image.
  const glow = useMotionTemplate`radial-gradient(circle 250px at calc(${smoothX}px + var(--portrait-gutter)) calc(${smoothY}px + var(--portrait-gutter)), rgb(246 185 79 / .18) 0%, rgb(246 185 79 / .07) 32%, transparent 76%)`;

  useEffect(() => {
    const section = figure.current?.closest("section");
    if (!section) return;
    // Keep native lazy loading in the HTML, then start BOTH layers near About.
    // The transparent overlay must not wait for its first hover to download.
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setApproached(true); observer.disconnect();
    }, { rootMargin: "300px 0px", threshold: 0 });
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  const track = (event: PointerEvent<HTMLDivElement>, entering = false) => {
    if (reduced || event.pointerType === "touch" || !matchMedia("(any-hover: hover)").matches) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const localX = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
    const localY = Math.max(0, Math.min(rect.height, event.clientY - rect.top));
    x.set(localX); y.set(localY);
    if (entering || !pointerInside) {
      smoothX.jump(localX); smoothY.jump(localY);
      radius.set(Math.min(rect.width * .29, 120));
      setPointerInside(true);
    }
  };
  const leave = () => { setPointerInside(false); radius.set(0); };
  // next/image calls onLoad after decoding. Leave the base layer uncovered
  // until both SVGs are ready, including when the toggle is pressed early.
  const ready = photoReady && alternateReady;
  const pointerReveal = ready && !reduced && pointerInside && !revealAll;
  const showAll = ready && revealAll;
  const sizes = "(min-width: 1280px) 448px, (min-width: 1024px) 36vw, (min-width: 496px) 448px, calc(100vw - 48px)";

  return <figure ref={figure} className="about-portrait" data-portrait data-scroll-entry data-entry-after="about" data-entry-delay="60">
    <div className="about-portrait-visual">
      <div className="about-portrait-atmosphere" aria-hidden="true" data-portrait-atmosphere>
        <div className="about-neutral-wash" />
        <motion.div className="about-amber-glow" data-portrait-glow
          style={{ backgroundImage: glow, opacity: pointerReveal ? 1 : 0 }} />
      </div>
      <div className="about-portrait-stage" data-portrait-stage data-portrait-ready={ready}
        onPointerEnter={event => track(event, true)} onPointerMove={event => track(event)}
        onPointerLeave={leave} onPointerCancel={leave}>
        <Image src={photo} alt="Portrait of Saren Ratanak wearing glasses and a blue shirt."
          fill sizes={sizes} loading={approached ? "eager" : "lazy"} unoptimized
          onLoad={() => setPhotoReady(true)} onError={() => setPhotoReady(false)}
          style={{ opacity: showAll ? 0 : 1 }}
          className="about-portrait-image about-portrait-base-image" data-portrait-base draggable={false} />
        <motion.div id={alternateId} className="about-portrait-alternate" data-portrait-alternate aria-hidden="true"
          style={{ maskImage: showAll ? "none" : mask, WebkitMaskImage: showAll ? "none" : mask, opacity: showAll || pointerReveal ? 1 : 0 }}>
          <Image src={alternate} alt="" fill sizes={sizes} loading={approached ? "eager" : "lazy"} unoptimized
            onLoad={() => setAlternateReady(true)} onError={() => setAlternateReady(false)}
            className="about-portrait-image about-portrait-reveal-image" data-portrait-alternate-image draggable={false} />
        </motion.div>
      </div>
    </div>
    <figcaption className="about-portrait-caption">
      <span className="about-hover-hint font-technical">Move over the portrait</span>
      <button type="button" className="about-portrait-toggle font-technical" aria-controls={alternateId} aria-pressed={revealAll}
        onClick={() => { leave(); setRevealAll(value => !value); }}>
        <span className="about-toggle-indicator" aria-hidden="true" />Reveal Wolverine
      </button>
    </figcaption>
  </figure>;
}
