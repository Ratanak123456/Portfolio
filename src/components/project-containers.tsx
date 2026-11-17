"use client";

import { memo, useLayoutEffect, useRef, useState } from "react";
import { projectCategories, projects, type ProjectCategory } from "@/data/projects";
import { ProjectThumbnail } from "./project-thumbnail";
import { createContainerFlight } from "./project-container-motion";
import "./project-containers.css";

// The same artwork node travels to the dialog and returns to this button.
const ContainerArt = memo(function ContainerArt({ category, index }: { category: (typeof projectCategories)[number]; index: number }) {
  const items = projects.filter(project => project.category === category.id);
  return <span className="cargo-scene" aria-hidden="true" data-category={category.id}>
    <span className="cargo-object">
      <span className="cargo-side" aria-hidden="true">
        <span className="cargo-sideBrand font-technical">RTNK / CARGO SYSTEMS</span>
        <span className="cargo-sideName font-display">{category.name}</span>
        <span className="cargo-countPlate font-technical">{items.length} {items.length === 1 ? "PROJECT" : "PROJECTS"}</span>
        <span className="cargo-sideSerial font-technical">RT {String(index + 1).padStart(4, "0")} / BUILT TO SHIP</span>
      </span>
      <span className="cargo-roof" aria-hidden="true" />
      <span className="cargo-end">
        <span className="cargo-interior">
          <span className="cargo-cards" role="list" tabIndex={0} aria-label={`${category.name} previews`}>
            {items.map(project => <span key={project.id} className="cargo-card" role="listitem">
              <ProjectThumbnail project={project} sizes="(min-width: 768px) 360px, 85vw" />
              <span className="cargo-cardName font-display">{project.name}</span>
            </span>)}
          </span>
        </span>
        {(["left", "right"] as const).map(side => <span key={side} className={`cargo-door cargo-door-${side}`} aria-hidden="true">
          <span className="cargo-doorStamp font-technical">{side === "left" ? "RTNK" : `0${index + 1}`}<br /><small>{side === "left" ? "DRY CARGO" : "CLASS / A"}</small></span>
          <span className="cargo-bar cargo-bar-one" /><span className="cargo-bar cargo-bar-two" />
          <span className="cargo-hinge cargo-hinge-top" /><span className="cargo-hinge cargo-hinge-middle" /><span className="cargo-hinge cargo-hinge-bottom" />
          <span className="cargo-latch" />
        </span>)}
        <span className="cargo-rim" aria-hidden="true" />
      </span>
    </span>
  </span>;
});

export function ProjectContainers() {
  const [selected, setSelected] = useState<ProjectCategory | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const source = useRef<HTMLButtonElement | null>(null);
  const flight = useRef<ReturnType<typeof createContainerFlight> | null>(null);
  const category = projectCategories.find(item => item.id === selected);
  const count = projects.filter(project => project.category === selected).length;

  useLayoutEffect(() => {
    if (!selected || !dialog.current || !frame.current || !source.current) return;
    const session = createContainerFlight({ dialog: dialog.current, frame: frame.current, source: source.current, onClosed: () => setSelected(null) });
    flight.current = session;
    return () => { session.dispose(); flight.current = null; };
  }, [selected]);

  return <div className="cargo-section mx-auto max-w-7xl px-6 sm:px-10" aria-labelledby="project-containers-heading">
    <div className="cargo-heading">
      <p className="cargo-eyebrow font-technical">EXPLORE MY WORK</p>
      <h3 id="project-containers-heading" className="font-display font-[750] tracking-[-.045em]">Project Containers<span className="text-hero-amber">.</span></h3>
      <p className="cargo-tagline">Built to ship.</p>
    </div>
    <div className="cargo-layout">
      {projectCategories.map((item, index) => <button key={item.id} type="button" id={`container-${item.id}`} className="cargo-button"
        aria-haspopup="dialog" aria-expanded={selected === item.id} aria-controls="project-container-dialog"
        aria-label={`${item.name}, ${projects.filter(project => project.category === item.id).length} projects`}
        onClick={event => { if (!selected) { source.current = event.currentTarget; setSelected(item.id); } }}>
        <span className="cargo-slot"><ContainerArt category={item} index={index} /></span>
        <span className="cargo-caption"><span className="font-display">{item.name}</span><span className="font-technical">OPEN CARGO ↗</span></span>
      </button>)}
    </div>
    <dialog ref={dialog} id="project-container-dialog" className="cargo-dialog" aria-modal="true" aria-labelledby="project-container-title" tabIndex={-1}
      onCancel={event => { event.preventDefault(); flight.current?.close(); }}
      onKeyDown={event => {
        if (event.key !== "Tab") return;
        const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('button, a[href], [tabindex="0"]')];
        const first = controls[0], last = controls.at(-1);
        if (event.shiftKey && (document.activeElement === first || document.activeElement === event.currentTarget)) { event.preventDefault(); last?.focus({ preventScroll: true }); }
        else if (!event.shiftKey && (document.activeElement === last || document.activeElement === event.currentTarget)) { event.preventDefault(); first?.focus({ preventScroll: true }); }
      }}>
      <div className="cargo-backdrop" aria-hidden="true" onClick={() => flight.current?.close()} />
      <div ref={frame} className="cargo-modalFrame">
        <header className="cargo-modalHeader" data-cargo-chrome>
          <div><p className="font-technical">CARGO MANIFEST / {count} {count === 1 ? "PROJECT" : "PROJECTS"}</p><h4 id="project-container-title" className="font-display">{category?.name}</h4></div>
          <button type="button" className="cargo-close" aria-label="Close container" onClick={() => flight.current?.close()}>×</button>
        </header>
        <footer className="cargo-modalFooter" data-cargo-chrome>
          <a href="#projects" className="cargo-allProjects" onClick={event => { event.preventDefault(); flight.current?.close(true); }}>View all projects <span aria-hidden="true">→</span></a>
        </footer>
      </div>
    </dialog>
  </div>;
}
