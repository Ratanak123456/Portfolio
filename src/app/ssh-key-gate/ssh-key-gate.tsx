"use client";

import { Component, useContext, useEffect, useEffectEvent, useLayoutEffect, useRef, useState, type ReactNode, type RefObject, type PointerEvent as ReactPointerEvent } from "react";
import "./ssh-key-gate.css";
import { DoorLeafDrawing, FloorDrawing, FrameDrawing, KeyShadowDrawing, LockBodyDrawing, StrikeDrawing, WallMarks } from "./entrance-artwork";

import { RackIntroContext, RackIntroBridge, RACK_INTRO_TIMING, easeRackIntro } from "@/components/rack/rack-intro";

// Retain the previous intro's session marker so completed visits stay completed.
const SESSION_KEY = "portfolio:firewall-gate:v1";
type Phase = "floor" | "lifting" | "held" | "inserting" | "turning" | "disengaging" | "opening" | "push-in" | "pullback";
type Drag = { pointer: number; x: number; y: number; startX: number; startY: number; moved: boolean; fromFloor: boolean };

class GateBoundary extends Component<{ children: ReactNode; onFail: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFail(); }
  render() { return this.state.failed ? null : this.props.children; }
}

/** The server-rendered portfolio is always present, including with no JavaScript. */
export function SSHKeyGate({ children }: { children: ReactNode }) {
  const home = useRef<HTMLDivElement>(null);
  const [intro] = useState(() => new RackIntroBridge());
  const [active, setActive] = useState(false);
  useEffect(() => {
    let live = true;
    queueMicrotask(() => {
      if (!live) return;
      try {
        if (!location.hash && sessionStorage.getItem(SESSION_KEY) !== "complete") setActive(true);
      } catch { /* Storage/privacy failures leave the homepage accessible. */ }
    });
    return () => { live = false; };
  }, []);
  return <RackIntroContext value={intro}>
    <div ref={home} className="ssh-home" data-ssh-home>{children}</div>
    <GateBoundary onFail={() => setActive(false)}>
      {active && <GateOverlay homeRef={home} onComplete={() => setActive(false)} />}
    </GateBoundary>
  </RackIntroContext>;
}

function GateOverlay({ homeRef, onComplete }: { homeRef: RefObject<HTMLDivElement | null>; onComplete: () => void }) {
  const intro = useContext(RackIntroContext)!;
  const [phase, setPhase] = useState<Phase>("floor");
  const phaseRef = useRef<Phase>("floor");
  const doorClip = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDivElement>(null), leftPanel = useRef<HTMLDivElement>(null), rightPanel = useRef<HTMLDivElement>(null);
  const unlockButton = useRef<HTMLButtonElement>(null), keyArt = useRef<HTMLSpanElement>(null), keyTip = useRef<HTMLSpanElement>(null);
  const floor = useRef<HTMLDivElement>(null), frame = useRef<HTMLDivElement>(null), keyCarrier = useRef<HTMLDivElement>(null), keyShadow = useRef<HTMLSpanElement>(null);
  const keyButton = useRef<HTMLButtonElement>(null), skip = useRef<HTMLButtonElement>(null), keyhole = useRef<HTMLSpanElement>(null), latch = useRef<HTMLSpanElement>(null);
  const keyPose = useRef({ x: 0, y: 0, angle: 0, lift: 0 });
  const drag = useRef<Drag | null>(null);
  const animation = useRef(0);
  const suppressClick = useRef(false), complete = useRef(false), restore = useRef<(() => void) | null>(null);
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const changePhase = (next: Phase) => { phaseRef.current = next; setPhase(next); };
  const paintKey = (x: number, y: number, angle = 0, lift = 1) => {
    keyPose.current = { x, y, angle, lift };
    if (keyButton.current) keyButton.current.style.transform = `translate(${x}px, ${y}px) rotate(${angle}deg)`;
    if (keyArt.current) keyArt.current.style.transform = `rotateX(${64 * (1 - lift)}deg) rotate(${-62 * (1 - lift)}deg)`;
    if (keyShadow.current) {
      keyShadow.current.style.opacity = String(.23 - .2 * lift);
      keyShadow.current.style.filter = `blur(${1.5 + 8 * lift}px)`;
      keyShadow.current.style.scale = String(1 + .5 * lift);
    }
  };
  const heldPosition = () => {
    const button = keyButton.current, hole = keyhole.current;
    if (!button || !hole) return { x: 0, y: -120 };
    // Offset from the CSS floor position; recompute on resize so a missed
    // drop always settles within reach of both the lock and the visitor.
    const box = button.getBoundingClientRect(), target = hole.getBoundingClientRect();
    return {
      x: keyPose.current.x + target.left + target.width / 2 - 55 - (box.left + box.width / 2),
      y: keyPose.current.y + target.top + target.height / 2 + 80 - box.top,
    };
  };
  const paintDoors = (progress: number) => {
    // Equal and opposite translation always exposes the center seam first.
    // The extra hardware allowance takes both lock halves fully offscreen.
    const distance = ((doorClip.current?.clientWidth ?? window.innerWidth) / 2 + 100) * progress;
    if (leftPanel.current) leftPanel.current.style.transform = `translateX(${-distance}px)`;
    if (rightPanel.current) rightPanel.current.style.transform = `translateX(${distance}px)`;
    if (keyCarrier.current) keyCarrier.current.style.transform = `translateX(${-distance}px)`;
    dialog.current?.setAttribute("data-open-progress", String(progress));
  };
  const release = () => {
    const pointer = drag.current?.pointer;
    drag.current = null;
    keyButton.current?.removeAttribute("data-dragging");
    if (pointer !== undefined && keyButton.current?.hasPointerCapture(pointer)) keyButton.current.releasePointerCapture(pointer);
  };
  const cancel = () => {
    cancelAnimationFrame(animation.current);
    intro.setOnReady(null);
    release();
  };
  const finish = (focus = true) => {
    if (complete.current) return;
    complete.current = true;
    cancel(); intro.setActive(false); intro.driver?.reset();
    // Reset flushes the live canvas before the door layer can disappear.
    if (dialog.current) dialog.current.style.visibility = "hidden";
    restore.current?.(); restore.current = null;
    try { sessionStorage.setItem(SESSION_KEY, "complete"); } catch { /* Entry never depends on storage. */ }
    if (focus) {
      const target = homeRef.current?.querySelector<HTMLElement>("#hero-headline") ?? homeRef.current?.querySelector<HTMLElement>("main");
      if (target) {
        const old = target.getAttribute("tabindex");
        target.setAttribute("tabindex", "-1"); target.setAttribute("data-ssh-focus", ""); target.focus({ preventScroll: true });
        const restoreTabIndex = () => {
          target.removeAttribute("data-ssh-focus");
          if (old === null) target.removeAttribute("tabindex"); else target.setAttribute("tabindex", old);
        };
        // Removing tabindex while focused makes Chromium blur the heading.
        // Restore its original attribute on the next blur, with no global listener.
        if (document.activeElement === target) target.addEventListener("blur", restoreTabIndex, { once: true });
        else restoreTabIndex();
      }
    }
    onComplete();
  };
  const finishEvent = useEffectEvent((focus = true) => finish(focus));
  const tween = (from: number, to: number, duration: number, paint: (n: number) => void, done?: () => void) => {
    cancelAnimationFrame(animation.current);
    if (reduced()) { paint(to); done?.(); return; }
    const start = performance.now();
    const tick = (now: number) => {
      if (complete.current) return;
      const progress = Math.min(1, (now - start) / duration);
      try {
        paint(from + (to - from) * (1 - Math.pow(1 - progress, 3)));
        if (progress < 1) animation.current = requestAnimationFrame(tick); else done?.();
      } catch { finish(); }
    };
    animation.current = requestAnimationFrame(tick);
  };
  const open = () => {
    if (reduced()) { finish(); return; }
    const startOpening = () => {
      intro.setOnReady(null);
      if (complete.current) return;
      if (reduced()) { finish(); return; }
      changePhase("opening");
      const aperture = doorClip.current!.getBoundingClientRect();
      const opening = { left: aperture.left / window.innerWidth, top: aperture.top / window.innerHeight, width: aperture.width / window.innerWidth, height: aperture.height / window.innerHeight };
      const { doors, framed, push, pullback } = RACK_INTRO_TIMING;
      const pushAt = doors + framed, pullAt = pushAt + push, duration = pullAt + pullback;
      const start = performance.now();
      const tick = (now: number) => {
        if (complete.current) return;
        if (reduced()) { finish(); return; }
        try {
          const elapsed = now - start;
          const pushProgress = easeRackIntro((elapsed - pushAt) / push);
          const pullProgress = easeRackIntro((elapsed - pullAt) / pullback);
          const nextPhase = elapsed < pushAt ? "opening" : elapsed < pullAt ? "push-in" : "pullback";
          if (phaseRef.current !== nextPhase) changePhase(nextPhase);
          // Enlarge the actual illustrated aperture as we pass the jambs.
          // The live canvas is resized by its driver, never CSS-scaled.
          if (elapsed >= pushAt && dialog.current) {
            dialog.current.style.setProperty("--opening-width", `${window.innerWidth * (opening.width + (1 - opening.width) * pushProgress)}px`);
            dialog.current.style.setProperty("--door-top", `${opening.top * window.innerHeight * (1 - pushProgress)}px`);
            dialog.current.style.setProperty("--door-height", `${window.innerHeight * (opening.height + (1 - opening.height) * pushProgress)}px`);
          }
          paintDoors(easeRackIntro(elapsed / doors));
          intro.driver?.paint({ push: pushProgress, pullback: pullProgress });
          const opacity = String(1 - easeRackIntro((pushProgress - .72) / .28));
          if (floor.current) floor.current.style.opacity = opacity;
          if (frame.current) frame.current.style.opacity = opacity;
          dialog.current?.setAttribute("data-shot", elapsed < pushAt ? "doorway" : elapsed < pullAt ? "push-in" : "pullback");
          dialog.current?.setAttribute("data-shot-progress", String(elapsed < pushAt ? Math.min(1, elapsed / doors) : elapsed < pullAt ? pushProgress : pullProgress));
          if (elapsed < duration) animation.current = requestAnimationFrame(tick);
          else animation.current = requestAnimationFrame(() => finish());
        } catch { finish(); }
      };
      animation.current = requestAnimationFrame(tick);
    };
    if (intro.driver) startOpening();
    else {
      // Loading must never hold the doors shut. Keep the same door movement
      // and reveal the reserved static rack stage when the live shot is late.
      // A scene arriving during this fallback must stay in its normal bounds.
      intro.setActive(false);
      changePhase("opening");
      tween(0, 1, RACK_INTRO_TIMING.doors, paintDoors, () => finish());
    }
  };
  const unlock = () => {
    if (phaseRef.current !== "held") return;
    release();
    if (reduced()) { finish(); return; }
    changePhase("inserting");
    const button = keyButton.current, hole = keyhole.current;
    if (!button || !hole) { finish(); return; }
    const tip = keyTip.current?.getBoundingClientRect(), target = hole.getBoundingClientRect();
    if (!tip) { finish(); return; }
    const from = { ...keyPose.current };
    const x = from.x + target.left + target.width / 2 - (tip.left + tip.width / 2);
    const y = from.y + target.top + target.height / 2 - (tip.top + tip.height / 2);
    tween(0, 1, 230, p => paintKey(from.x + (x - from.x) * p, from.y + (y - from.y) * p), () => {
      tween(0, 5, 100, depth => paintKey(x, y - depth), () => {
        changePhase("turning");
        tween(0, 90, 260, angle => paintKey(x, y - 5, angle), () => {
          changePhase("disengaging"); skip.current?.focus({ preventScroll: true });
          // The cross-seam bolt retracts into the left half before either panel
          // moves. Key, cylinder, bolt, and receiver then travel with their panel.
          tween(0, 1, 200, p => {
            if (latch.current) latch.current.style.transform = `translateX(${-44 * p}px)`;
          }, open);
        });
      });
    });
  };
  const pickUp = () => {
    if (phaseRef.current !== "floor") return;
    changePhase("lifting");
    const from = { ...keyPose.current }, to = heldPosition();
    tween(0, 1, 320, p => paintKey(from.x + (to.x - from.x) * p, from.y + (to.y - from.y) * p, 0, p), () => {
      changePhase("held"); unlockButton.current?.focus({ preventScroll: true });
    });
  };

  useLayoutEffect(() => {
    const content = homeRef.current;
    if (!content) return;
    if (!dialog.current || getComputedStyle(dialog.current).position !== "fixed") {
      queueMicrotask(() => finishEvent());
      return; // Stylesheet failure must never lock an otherwise usable page.
    }
    const originalInert = content.inert, originalAria = content.getAttribute("aria-hidden");
    const bodyOverflow = document.body.style.overflow, bodyPadding = document.body.style.paddingRight;
    const overscroll = document.documentElement.style.overscrollBehavior;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    content.inert = true; content.setAttribute("aria-hidden", "true");
    if (scrollbar) document.body.style.paddingRight = `${parseFloat(getComputedStyle(document.body).paddingRight) + scrollbar}px`;
    document.body.style.overflow = "hidden"; document.documentElement.style.overscrollBehavior = "none";
    const cleanup = () => {
      content.inert = originalInert;
      if (originalAria === null) content.removeAttribute("aria-hidden"); else content.setAttribute("aria-hidden", originalAria);
      document.body.style.overflow = bodyOverflow; document.body.style.paddingRight = bodyPadding;
      document.documentElement.style.overscrollBehavior = overscroll;
    };
    intro.setActive(!reduced());
    if (intro.active) intro.driver?.paint({ push: 0, pullback: 0 });
    restore.current = cleanup;
    keyButton.current?.focus({ preventScroll: true });
    return () => { intro.setActive(false); intro.driver?.reset(); cleanup(); restore.current = null; };
  }, [homeRef, intro]);

  const resizeEvent = useEffectEvent(() => {
    if (phaseRef.current === "held" && !drag.current) {
      cancelAnimationFrame(animation.current);
      const to = heldPosition(); paintKey(to.x, to.y);
    }
  });

  // Effect events keep accessibility listeners current without reinstalling them.
  useEffect(() => {
    const capturedKey = keyButton.current;
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); finishEvent(); }
      if (event.key === "Tab") {
        const options = phaseRef.current === "floor" ? [keyButton.current, skip.current]
          : phaseRef.current === "held" ? [keyButton.current, unlockButton.current, skip.current] : [skip.current];
        const available = options.filter((node): node is HTMLButtonElement => !!node);
        const index = available.indexOf(document.activeElement as HTMLButtonElement);
        const next = available[(index + (event.shiftKey ? -1 : 1) + available.length) % available.length];
        event.preventDefault(); next?.focus({ preventScroll: true });
      }
    };
    const focus = (event: FocusEvent) => {
      if (!complete.current && !dialog.current?.contains(event.target as Node)) skip.current?.focus({ preventScroll: true });
    };
    const hash = () => { if (location.hash) finishEvent(false); };
    document.addEventListener("keydown", key, true); document.addEventListener("focusin", focus); window.addEventListener("hashchange", hash); window.addEventListener("resize", resizeEvent);
    return () => {
      document.removeEventListener("keydown", key, true); document.removeEventListener("focusin", focus); window.removeEventListener("hashchange", hash); window.removeEventListener("resize", resizeEvent);
      cancelAnimationFrame(animation.current);
      intro.setOnReady(null);
      const pointer = drag.current?.pointer; drag.current = null;
      if (pointer !== undefined && capturedKey?.hasPointerCapture(pointer)) capturedKey.releasePointerCapture(pointer);
    };
  }, [intro]);

  const down = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0 || !event.isPrimary || !["floor", "held"].includes(phaseRef.current)) return;
    cancelAnimationFrame(animation.current); suppressClick.current = false;
    drag.current = { pointer: event.pointerId, x: event.clientX, y: event.clientY, startX: keyPose.current.x, startY: keyPose.current.y, moved: false, fromFloor: phaseRef.current === "floor" };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.setAttribute("data-dragging", "true");
  };
  const nearLock = () => {
    const tip = keyTip.current?.getBoundingClientRect(), hole = keyhole.current?.getBoundingClientRect();
    return !!tip && !!hole && Math.hypot(tip.left + tip.width / 2 - (hole.left + hole.width / 2), tip.top + tip.height / 2 - (hole.top + hole.height / 2)) <= 34;
  };
  const move = (event: ReactPointerEvent<HTMLButtonElement>, snap = true) => {
    const current = drag.current;
    if (!current || current.pointer !== event.pointerId) return;
    const dx = event.clientX - current.x, dy = event.clientY - current.y;
    if (Math.hypot(dx, dy) > 6) current.moved = true;
    if (!current.moved) return;
    suppressClick.current = true;
    if (current.fromFloor && phaseRef.current === "floor") {
      if (dy > -8) return; // A lateral floor nudge does not pick the key up.
      changePhase("held");
    }
    const lift = current.fromFloor ? Math.max(keyPose.current.lift, Math.min(1, Math.max(0, -dy / 48))) : 1;
    paintKey(current.startX + dx, current.startY + dy, 0, reduced() ? 1 : lift);
    if (snap && phaseRef.current === "held" && lift === 1 && !(reduced() && current.fromFloor) && nearLock()) unlock();
  };
  const up = (event: ReactPointerEvent<HTMLButtonElement>, canceled = false) => {
    const current = drag.current;
    if (!current || current.pointer !== event.pointerId) return;
    if (!canceled) move(event, false); // Include coalesced touch release coordinates.
    suppressClick.current = current.moved || canceled;
    release();
    if (!current.moved && !canceled) return; // Native click only picks up.
    if (!canceled && phaseRef.current === "held" && !(reduced() && current.fromFloor) && nearLock()) unlock();
    else {
      const from = { ...keyPose.current };
      const held = phaseRef.current === "held", to = held ? heldPosition() : { x: 0, y: 0 };
      tween(0, 1, 240, p => paintKey(from.x + (to.x - from.x) * p, from.y + (to.y - from.y) * p, 0, from.lift + ((held ? 1 : 0) - from.lift) * p));
    }
  };
  const busy = phase !== "floor" && phase !== "held";
  const preventRepeat = (event: React.KeyboardEvent<HTMLButtonElement>) => { if (event.repeat && (event.key === "Enter" || event.key === " ")) event.preventDefault(); };
  const keyPath = "M47 12H57V25H70V33H57V43H66V51H57V62A20 20 0 1 1 47 62Z M44 82a8 8 0 1 0 16 0a8 8 0 1 0-16 0Z";
  return <div ref={dialog} className="ssh-overlay font-technical font-normal" role="dialog" aria-modal="true" aria-labelledby="ssh-gate-title" aria-describedby="ssh-gate-instruction" data-ssh-gate data-state={phase} data-open-progress="0">
    <div ref={frame} className="ssh-frame" aria-hidden="true">
      <div className="ssh-wall-top" /><div className="ssh-wall-left" /><div className="ssh-wall-right" />
      <WallMarks />
      <div className="ssh-frame-portal"><FrameDrawing /></div>
    </div>
    <div className="ssh-doorway" data-gate-doorway>
      <div ref={doorClip} className="ssh-door-clip" data-gate-door-clip>
        <div ref={leftPanel} className="ssh-panel ssh-panel-left" data-gate-panel="left" aria-hidden="true">
          <DoorLeafDrawing side="left" />
          <div className="ssh-lock ssh-lock-left">
            <LockBodyDrawing />
            <span ref={latch} className="ssh-latch" data-gate-latch />
            <span ref={keyhole} className="ssh-keyhole" data-gate-keyhole>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5a4 4 0 0 0-2.2 7.3L9 19h6l-.8-6.7A4 4 0 0 0 12 5Z" fill="#fff" /><path d="M5 4Q12-1 19 5M4 17q5 7 15 1" fill="none" stroke="#fff" strokeOpacity=".4" strokeWidth=".6" /></svg>
            </span>
          </div>
        </div>
        <div ref={rightPanel} className="ssh-panel ssh-panel-right" data-gate-panel="right" aria-hidden="true">
          <DoorLeafDrawing side="right" />
          <div className="ssh-lock ssh-lock-right"><StrikeDrawing /></div>
        </div>
      </div>
    </div>
    <div ref={floor} className="ssh-floor" data-gate-floor aria-hidden="true">
      <FloorDrawing />
      <span ref={keyShadow} className="ssh-key-shadow"><KeyShadowDrawing /></span>
    </div>
    <h2 id="ssh-gate-title" className="ssh-title">SSH KEY GATE</h2>
    <button ref={unlockButton} type="button" className="ssh-unlock" aria-label="Insert and turn key" aria-describedby="ssh-gate-instruction" aria-disabled={phase !== "held"} tabIndex={phase === "held" ? 0 : -1} data-gate-unlock
      onKeyDown={preventRepeat} onClick={unlock} />
    <div className="ssh-key-clip"><div ref={keyCarrier} className="ssh-key-carrier">
      <button ref={keyButton} type="button" className="ssh-key" aria-label={phase === "floor" ? "Pick up the key" : "Held key"} aria-describedby="ssh-gate-instruction" aria-disabled={busy} tabIndex={busy ? -1 : 0} data-gate-key
        onKeyDown={preventRepeat}
        onPointerDown={down} onPointerMove={event => move(event)} onPointerUp={event => up(event)} onPointerCancel={event => up(event, true)}
        onLostPointerCapture={event => { if (drag.current?.pointer === event.pointerId) up(event, true); }}
        onClick={event => {
          if (event.detail !== 0 && suppressClick.current) { suppressClick.current = false; return; }
          if (phaseRef.current === "floor") pickUp(); else if (phaseRef.current === "held") unlockButton.current?.focus({ preventScroll: true });
        }}>
        <span ref={keyArt} className="ssh-key-object">
          <svg viewBox="0 0 104 104" width="104" height="104" aria-hidden="true">
            <path d={keyPath} fill="#000" fillOpacity=".7" fillRule="evenodd" transform="translate(0 4)" />
            <path d={keyPath} fill="#F6B94F" fillRule="evenodd" stroke="#000" strokeOpacity=".7" strokeWidth=".65" />
            <path d="m49 34 5 3m-6 6 6 3m-6 8 6 3M38 88l6 6m18-3 4-6m-8-12 8 5" stroke="#000" strokeOpacity=".3" strokeWidth=".65" fill="none" />
            <path d="M50 14v48M42 94c-9-7-8-18-1-24" fill="none" stroke="#fff" strokeOpacity=".6" strokeWidth="1" />
          </svg>
          <span ref={keyTip} className="ssh-key-tip" data-gate-key-tip />
        </span>
      </button>
    </div></div>
    <p id="ssh-gate-instruction" className="ssh-instruction" aria-live="polite">{phase === "floor" ? "Pick up the key" : phase === "lifting" || phase === "held" ? "Insert the key" : "Connecting…"}</p>
    <button ref={skip} type="button" className="ssh-skip" onClick={() => finish()}>Skip intro <span aria-hidden="true">↗</span></button>
  </div>;
}
