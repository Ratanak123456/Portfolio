"use client";

import { useEffect, useId, useSyncExternalStore } from "react";
import { LayoutGroup, MotionConfig, motion, useReducedMotion } from "motion/react";
import { installContactScroll } from "./contact-scroll";

const workspaces = [
  { id: "about", number: "01", label: "About" },
  { id: "projects", number: "02", label: "Projects" },
  { id: "contact", number: "03", label: "Contact" },
] as const;

function subscribeToHash(onChange: () => void) {
  let frame = 0;
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(() => { frame = 0; onChange(); });
  };
  window.addEventListener("hashchange", onChange);
  window.addEventListener("popstate", onChange);
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
  window.addEventListener("projectsphasechange", onChange);
  return () => {
    window.removeEventListener("hashchange", onChange);
    window.removeEventListener("popstate", onChange);
    window.removeEventListener("scroll", schedule);
    window.removeEventListener("resize", schedule);
    window.removeEventListener("projectsphasechange", onChange);
    cancelAnimationFrame(frame);
  };
}

function getWorkspace() {
  // The introduction has no workspace. Hash history remains native, while the
  // current link follows the section actually below the floating navigation.
  const transition = document.querySelector<HTMLElement>("[data-projects-pinned]");
  if (transition?.dataset.projectsActive === "true") {
    return transition.dataset.projectsPhase === "showcase" ? "projects" : "about";
  }
  // The real showcase overlaps the final About pin, including direct links.
  const projects = document.getElementById("projects");
  const rect = projects?.getBoundingClientRect();
  if (projects && rect && rect.top <= 128 && rect.bottom > 128 && getComputedStyle(projects).visibility !== "hidden") return "projects";
  return workspaces.find(({ id }) => {
    const section = document.getElementById(id)?.getBoundingClientRect();
    return section && section.top <= 128 && section.bottom > 128;
  })?.id ?? null;
}

export function WorkspaceNav() {
  useEffect(installContactScroll, []);
  const current = useSyncExternalStore(
    subscribeToHash,
    getWorkspace,
    () => null,
  );
  const reduceMotion = useReducedMotion();
  const groupId = useId();

  return (
    <MotionConfig reducedMotion="user">
      <LayoutGroup id={groupId}>
        <nav
          aria-label="Portfolio workspaces"
          className="mx-auto w-full max-w-2xl border border-hero-ink/20 bg-hero-background/95 p-1 font-sans"
        >
          <ul className="grid grid-cols-3 gap-1">
            {workspaces.map(({ id, number, label }) => {
              const active = current === id;

              return (
                <li key={id} className="min-w-0">
                  <a
                    href={`#${id}`}
                    aria-current={active ? "location" : undefined}
                    className={`group relative isolate flex min-h-14 items-center justify-center px-1 py-2 outline-offset-2 transition-colors duration-150 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-hero-ink motion-reduce:transition-none sm:min-h-12 sm:px-3 ${
                      active
                        ? "text-black"
                        : "text-hero-ink/65 hover:bg-hero-ink/5 hover:text-hero-ink"
                    }`}
                  >
                    {active && (
                      <motion.span
                        aria-hidden="true"
                        layoutId="workspace-active"
                        className="absolute inset-0 -z-10 bg-workspace-amber"
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                      />
                    )}
                    <motion.span
                      tabIndex={-1}
                      className="flex w-full flex-col items-center justify-center gap-1 sm:flex-row sm:gap-2"
                      whileTap={{ y: reduceMotion ? 0 : 1 }}
                      transition={{ duration: 0.1, ease: "easeOut" }}
                    >
                      <span className="font-mono text-[10px] leading-none sm:text-xs">
                        {number}
                      </span>
                      <span className="whitespace-nowrap text-xs leading-5 font-medium sm:text-sm">
                        {label}
                      </span>
                    </motion.span>
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      </LayoutGroup>
    </MotionConfig>
  );
}
