"use client";

import { useEffect } from "react";

/** Progressive enhancement: the HTML and base CSS always show the content. */
export function ScrollEntrances() {
  useEffect(() => {
    const elements = [...document.querySelectorAll<HTMLElement>("[data-scroll-entry]")];
    const pending = new Set<HTMLElement>();
    const entered = new Set<HTMLElement>();
    const animations = new Map<HTMLElement, Animation>();
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const hashTarget = () => {
      try { return document.getElementById(decodeURIComponent(location.hash.slice(1))); }
      catch { return null; }
    };
    const settle = (element: HTMLElement) => {
      animations.get(element)?.cancel(); animations.delete(element);
      element.style.removeProperty("opacity"); element.style.removeProperty("transform");
      element.dataset.entryState = "visible";
    };
    const reveal = (element: HTMLElement, immediate = false) => {
      if (!pending.delete(element)) {
        if (immediate && animations.has(element)) settle(element);
        return;
      }
      observer.unobserve(element);
      if (immediate || reduced.matches || !element.animate) { settle(element); return; }
      // Derive Skills' stagger from actual row positions, including 2- and
      // 1-column layouts, instead of imposing desktop delays on mobile rows.
      const row = element.hasAttribute("data-entry-stagger")
        ? elements.filter(peer => peer.parentElement === element.parentElement && peer.hasAttribute("data-entry-stagger") && Math.abs(peer.getBoundingClientRect().top - element.getBoundingClientRect().top) < 2)
        : [];
      const delay = row.length ? Math.max(0, row.indexOf(element)) * 60 : Number(element.dataset.entryDelay || 0);
      element.dataset.entryState = "revealed";
      const animation = element.animate([
        { opacity: 0, transform: "translateY(16px)" },
        { opacity: 1, transform: "translateY(0)" },
      ], { duration: 400, delay, easing: "cubic-bezier(.2,.65,.3,1)", fill: "both" });
      animations.set(element, animation);
      animation.onfinish = () => settle(element);
    };
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const element = entry.target as HTMLElement;
        if (entry.isIntersecting && entry.intersectionRatio > 0) entered.add(element);
        else entered.delete(element);
      });
      elements.forEach(element => {
        const lead = element.dataset.entryAfter && elements.find(peer => peer.dataset.entryLead === element.dataset.entryAfter);
        // The centered desktop greeting sits lower than the portrait's top.
        // Let its actual content enter before releasing the other About groups.
        if (entered.has(element) && (!lead || !pending.has(lead))) reveal(element);
      });
    }, { rootMargin: "0px 0px -24px 0px", threshold: [0, .001] });
    const direct = hashTarget();
    elements.forEach(element => {
      const rect = element.getBoundingClientRect();
      // Never conceal content already in view when hydration arrives late.
      if (reduced.matches || direct?.contains(element) || element.contains(direct) || element.contains(document.activeElement) || element.dataset.entryState === "visible" || (rect.top < innerHeight && rect.bottom > 0)) {
        settle(element); return;
      }
      pending.add(element);
      element.dataset.entryState = "pending";
      element.style.opacity = "0"; element.style.transform = "translateY(16px)";
      observer.observe(element);
    });
    const showWithin = (target: Element | null) => {
      if (target) elements.forEach(element => {
        if (target.contains(element) || element.contains(target)) reveal(element, true);
      });
    };
    const hash = () => showWithin(hashTarget());
    const focus = (event: FocusEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      showWithin(target?.closest("section") ?? target);
    };
    const anchor = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target === "_blank") return;
      const url = new URL(link.href, location.href);
      if (url.origin !== location.origin || url.pathname !== location.pathname || !url.hash) return;
      try { showWithin(document.getElementById(decodeURIComponent(url.hash.slice(1)))); } catch { /* Keep native navigation. */ }
    };
    const motion = () => { if (reduced.matches) elements.forEach(element => reveal(element, true)); };
    document.addEventListener("click", anchor, true);
    document.addEventListener("focusin", focus);
    window.addEventListener("hashchange", hash);
    reduced.addEventListener("change", motion);
    return () => {
      observer.disconnect();
      elements.forEach(element => {
        animations.get(element)?.cancel();
        element.style.removeProperty("opacity"); element.style.removeProperty("transform");
      });
      document.removeEventListener("click", anchor, true);
      document.removeEventListener("focusin", focus);
      window.removeEventListener("hashchange", hash);
      reduced.removeEventListener("change", motion);
    };
  }, []);

  return null;
}
