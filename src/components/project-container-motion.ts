import { gsap } from "gsap";

type Bounds = { left: number; top: number; width: number; height: number };
const bounds = (node: Element): Bounds => {
  const { left, top, width, height } = node.getBoundingClientRect();
  return { left, top, width, height };
};
const place = (node: HTMLElement, rect: Bounds) => Object.assign(node.style, {
  left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`,
});

export function createContainerFlight({ dialog, frame, source, onClosed }: {
  dialog: HTMLDialogElement; frame: HTMLDivElement; source: HTMLButtonElement; onClosed: () => void;
}) {
  const slot = source.querySelector<HTMLElement>('.cargo-slot')!;
  const scene = slot.querySelector<HTMLElement>('.cargo-scene')!;
  const object = scene.querySelector<HTMLElement>('.cargo-object')!;
  const doors = [...scene.querySelectorAll<HTMLElement>('.cargo-door')];
  const latches = [...scene.querySelectorAll<HTMLElement>('.cargo-latch')];
  const interior = scene.querySelector<HTMLElement>('.cargo-interior')!;
  const cards = [...scene.querySelectorAll<HTMLElement>('.cargo-card')];
  const chrome = [...frame.querySelectorAll<HTMLElement>('[data-cargo-chrome]')];
  const backdrop = dialog.querySelector<HTMLElement>('.cargo-backdrop')!;
  const closeButton = dialog.querySelector<HTMLButtonElement>('.cargo-close')!;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const origin = bounds(scene);
  const originalViewportWidth = innerWidth;
  const initialObjectStyle = object.style.cssText;
  const computed = getComputedStyle(object);
  const start = { '--cargo-width': computed.width, '--cargo-height': computed.height, '--depth': getComputedStyle(scene.querySelector('.cargo-side')!).width, '--yaw': '42deg', '--pitch': '-12deg', translate: computed.translate };
  const scroll = { x: scrollX, y: scrollY };
  const root = document.documentElement;
  const scrollbarGap = innerWidth - root.clientWidth;
  const saved = { overflow: root.style.overflow, gutter: root.style.scrollbarGutter, bodyOverflow: document.body.style.overflow };
  let opening: gsap.core.Timeline | null = null, closingTimeline: gsap.core.Timeline | null = null;
  let disposed = false, restored = false, closing = false;
  let animationFrame = 0;

  // Bound only this timeline's frame delta. A busy mobile frame must not skip
  // straight from its source slot past the flight into already-open doors.
  function run(timeline: gsap.core.Timeline) {
    cancelAnimationFrame(animationFrame);
    let previous = performance.now();
    const tick = (now: number) => {
      if (disposed || restored) return;
      const delta = Math.min(now - previous, 50) / 1000;
      previous = now;
      timeline.totalTime(Math.min(timeline.duration(), timeline.time() + delta));
      if (!disposed && !restored && timeline.progress() < 1) animationFrame = requestAnimationFrame(tick);
    };
    animationFrame = requestAnimationFrame(tick);
  }

  function destination(): Bounds {
    const width = innerWidth >= 1100 ? 800 : innerWidth >= 768 ? innerWidth - 180 : innerWidth - 48;
    const height = Math.min(innerWidth < 768 ? 680 : 560, innerHeight - 72);
    return { left: (innerWidth - width) / 2, top: (innerHeight - height) / 2, width, height };
  }
  function openDoorAngle() { return innerWidth >= 1100 ? 108 : innerWidth >= 768 ? 98 : 86; }
  function restore() {
    if (restored) return;
    restored = true;
    cancelAnimationFrame(animationFrame);
    opening?.kill(); closingTimeline?.kill();
    window.removeEventListener('resize', resize);
    gsap.killTweensOf([object, ...doors, ...latches, interior, ...cards, ...chrome, frame, backdrop]);
    object.style.cssText = initialObjectStyle;
    // Clear GSAP's transform cache too, including after instant reduced-motion
    // closing, so a later animated opening starts with genuinely shut doors.
    gsap.set([...doors, ...latches, interior, ...cards], { clearProps: 'all' });
    scene.removeAttribute('data-open'); scene.setAttribute('aria-hidden', 'true');
    slot.append(scene);
    dialog.close();
    root.style.overflow = saved.overflow; root.style.scrollbarGutter = saved.gutter; document.body.style.overflow = saved.bodyOverflow;
    window.scrollTo({ left: scroll.x, top: scroll.y, behavior: 'instant' });
    source.focus({ preventScroll: true });
    dialog.dataset.phase = 'idle';
  }
  function resize() {
    if (dialog.dataset.phase !== 'open') return;
    const target = destination(); place(frame, target);
    gsap.set(object, { '--cargo-width': `${target.width}px`, '--cargo-height': `${target.height}px` });
    gsap.set(doors[0], { rotationY: -openDoorAngle() }); gsap.set(doors[1], { rotationY: openDoorAngle() });
  }

  // Freeze the hover lift before reparenting. Neither the source object nor
  // its angle is replaced: this exact 3D CSS subtree travels above the navbar.
  Object.entries(start).forEach(([property, value]) => object.style.setProperty(property, value));
  place(frame, origin);
  frame.prepend(scene);
  // Reserve only a scrollbar that already takes up space. Forcing a gutter
  // with overlay scrollbars would narrow the page and reflow mobile Skills.
  if (scrollbarGap > 0) root.style.scrollbarGutter = 'stable';
  root.style.overflow = 'hidden'; document.body.style.overflow = 'hidden';
  dialog.dataset.phase = 'flight'; dialog.showModal(); dialog.focus({ preventScroll: true });
  gsap.set(backdrop, { opacity: 0 }); gsap.set(chrome, { opacity: 0 });
  gsap.set(cards, { opacity: 0, y: 14 });
  window.addEventListener('resize', resize);
  const target = destination();
  if (reduced.matches) {
    place(frame, target);
    gsap.set(object, { '--cargo-width': `${target.width}px`, '--cargo-height': `${target.height}px`, '--depth': '16px', '--yaw': '0deg', '--pitch': '0deg', translate: '0px 0px' });
    gsap.set(doors[0], { rotationY: -openDoorAngle() }); gsap.set(doors[1], { rotationY: openDoorAngle() });
    gsap.set([backdrop, interior, ...cards, ...chrome], { opacity: 1, visibility: 'visible' }); gsap.set(cards, { y: 0 });
    scene.dataset.open = 'true'; scene.removeAttribute('aria-hidden'); dialog.dataset.phase = 'open'; closeButton.focus({ preventScroll: true });
  } else {
    opening = gsap.timeline({ paused: true, defaults: { ease: 'power2.inOut' }, onComplete: () => { if (!disposed && !closing) dialog.dataset.phase = 'open'; } });
    opening.to(frame, { ...target, duration: .3 }, 0)
      .to(object, { '--cargo-width': `${target.width}px`, '--cargo-height': `${target.height}px`, '--depth': '16px', '--yaw': '0deg', '--pitch': '0deg', translate: '0px 0px', duration: .3 }, 0)
      .to(backdrop, { opacity: 1, duration: .3 }, 0)
      .call(() => { dialog.dataset.phase = 'opening'; scene.dataset.open = 'true'; scene.removeAttribute('aria-hidden'); }, [], .3)
      .to(latches, { rotation: -35, duration: .06 }, .3)
      .to(doors[0], { rotationY: -openDoorAngle(), duration: .2 }, .36)
      .to(doors[1], { rotationY: openDoorAngle(), duration: .2 }, .36)
      .to(interior, { autoAlpha: 1, duration: .12 }, .4)
      .to(cards, { opacity: 1, y: 0, duration: .2, stagger: .035, ease: 'power2.out' }, .43)
      .to(chrome, { opacity: 1, duration: .15 }, .45)
      .call(() => { if (!closing) closeButton.focus({ preventScroll: true }); }, [], .45);
    run(opening);
  }

  return {
    close(navigate = false) {
      if (disposed || closing) return;
      closing = true; cancelAnimationFrame(animationFrame); opening?.kill();
      dialog.dataset.phase = 'closing';
      const complete = () => {
        if (disposed) return;
        restore(); onClosed();
        if (navigate) { window.location.hash = 'projects'; document.getElementById('projects')?.scrollIntoView({ behavior: 'instant', block: 'start' }); }
      };
      if (reduced.matches) { complete(); return; }
      const home = bounds(slot);
      let homePose = start;
      if (innerWidth !== originalViewportWidth) {
        const currentStyle = object.style.cssText;
        object.style.cssText = initialObjectStyle;
        const homeStyle = getComputedStyle(object);
        homePose = { ...start, '--cargo-width': homeStyle.width, '--cargo-height': homeStyle.height, '--depth': getComputedStyle(scene.querySelector('.cargo-side')!).width };
        object.style.cssText = currentStyle;
      }
      closingTimeline = gsap.timeline({ paused: true, defaults: { ease: 'power2.inOut' }, onComplete: complete });
      closingTimeline.to([...cards, ...chrome], { opacity: 0, duration: .12 }, 0)
        .to(cards, { y: 14, duration: .12 }, 0)
        .to(doors, { rotationY: 0, duration: .2 }, .08)
        .to(latches, { rotation: 0, duration: .06 }, .25)
        .call(() => { dialog.dataset.phase = 'return'; scene.setAttribute('aria-hidden', 'true'); }, [], .3)
        .to(frame, { ...home, duration: .3 }, .3)
        .to(object, { ...homePose, duration: .3 }, .3)
        .to(backdrop, { opacity: 0, duration: .3 }, .3);
      run(closingTimeline);
    },
    dispose() { disposed = true; restore(); },
  };
}
