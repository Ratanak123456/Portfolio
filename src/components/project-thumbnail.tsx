import Image from "next/image";
import type { Project } from "@/data/projects";
import "./project-thumbnail.css";

export function ProjectThumbnail({ project, sizes = "(min-width: 768px) 40vw, 85vw" }: { project: Project; sizes?: string }) {
  return <span className="project-thumb-thumbnail" aria-hidden="true">
    {project.thumbnail ? <Image src={project.thumbnail} alt="" fill sizes={sizes} loading="lazy" className="project-thumb-image" /> :
      <span className="project-thumb-tile">
        <span className="project-thumb-category font-technical">{project.category === "iot" ? "IOT / HARDWARE" : "FULL-STACK / SOFTWARE"}</span>
        <span className="project-thumb-name font-display">{project.name}</span>
        <span className="project-thumb-rule" />
        <span className="project-thumb-signature font-technical">RATANAK <span>PROJECT ARCHIVE ↗</span></span>
      </span>}
  </span>;
}
