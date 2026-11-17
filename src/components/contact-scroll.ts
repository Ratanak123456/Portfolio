import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/** One page-scroll movement; the existing ScrollTrigger owns every visual phase. */
export function installContactScroll() {
  let movement: gsap.core.Tween | null = null;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const stop = () => {
    movement?.kill(); movement = null;
    document.documentElement.removeAttribute("data-contact-scroll");
  };
  const keyboard = (event: KeyboardEvent) => {
    if (event.target instanceof Element && event.target.closest("input, textarea, select, [contenteditable=true]")) return;
    if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " ", "Escape"].includes(event.key)) stop();
  };
  const anchor = (event: MouseEvent) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("nav a[href]") : null;
    if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || url.pathname !== location.pathname) return;
    stop();
    if (url.hash !== "#contact" || event.defaultPrevented) return;
    const contact = document.getElementById("contact");
    if (!contact) return;
    event.preventDefault();
    if (location.hash !== "#contact") history.pushState(null, "", "#contact");
    const start = scrollY;
    const end = Math.max(0, Math.min(
      contact.getBoundingClientRect().top + scrollY - parseFloat(getComputedStyle(contact).scrollMarginTop || "0"),
      document.documentElement.scrollHeight - innerHeight,
    ));
    if (reduced.matches || Math.abs(end - start) < 2) {
      window.scrollTo({ top: end, behavior: "instant" });
      ScrollTrigger.update();
      return;
    }

    const pin = ScrollTrigger.getById("projects-handoff");
    const slowStart = pin ? pin.start - innerHeight * .3 : Infinity;
    const slowEnd = pin ? pin.end + innerHeight * .85 : Infinity;
    const ramp = innerHeight * .3;
    const smooth = (x: number) => { const t = Math.max(0, Math.min(1, x)); return t * t * (3 - 2 * t); };
    const secondsPerPixel = (y: number) => {
      const slow = pin ? smooth((y - slowStart) / ramp) * smooth((slowEnd - y) / ramp) : 0;
      return 1 / 1450 + (1 / 320 - 1 / 1450) * slow;
    };
    // Integrate travel time along the current route. Smooth ramps slow the pin
    // and first card row without stops or rewinding to the beginning of About.
    const points = [{ y: start, time: 0 }];
    for (let i = 1; i <= 200; i++) {
      const y = start + (end - start) * i / 200;
      const previous = points[i - 1];
      points.push({ y, time: previous.time + Math.abs(y - previous.y) * secondsPerPixel((y + previous.y) / 2) });
    }
    const total = points[points.length - 1].time;
    const travel = { time: 0 };
    document.documentElement.dataset.contactScroll = "running";
    movement = gsap.to(travel, {
      time: total, duration: Math.max(.35, total * 1.5), ease: "sine.inOut",
      onUpdate: () => {
        let low = 0, high = points.length - 1;
        while (high - low > 1) {
          const middle = (low + high) >> 1;
          if (points[middle].time <= travel.time) low = middle;
          else high = middle;
        }
        const a = points[low], b = points[high];
        const fraction = (travel.time - a.time) / (b.time - a.time);
        window.scrollTo({ top: a.y + (b.y - a.y) * fraction, behavior: "instant" });
        ScrollTrigger.update();
      },
      onComplete: stop,
    });
  };
  document.addEventListener("click", anchor);
  window.addEventListener("wheel", stop, { passive: true });
  window.addEventListener("touchstart", stop, { passive: true });
  window.addEventListener("keydown", keyboard);
  window.addEventListener("hashchange", stop);
  window.addEventListener("popstate", stop);
  window.addEventListener("resize", stop);
  reduced.addEventListener("change", stop);
  return () => {
    stop();
    document.removeEventListener("click", anchor);
    window.removeEventListener("wheel", stop);
    window.removeEventListener("touchstart", stop);
    window.removeEventListener("keydown", keyboard);
    window.removeEventListener("hashchange", stop);
    window.removeEventListener("popstate", stop);
    window.removeEventListener("resize", stop);
    reduced.removeEventListener("change", stop);
  };
}
