import { projects, projectCategories } from "@/data/projects";
import { ProjectThumbnail } from "./project-thumbnail";

export function ProjectDetails() {
  return <div className="mt-10 grid gap-8 md:grid-cols-2">
    {projects.map(project => <article key={project.id} id={`project-${project.id}`} className="scroll-mt-28 overflow-hidden rounded-lg border border-white/20 bg-black/20">
      <ProjectThumbnail project={project} />
      <div className="p-6 sm:p-8">
        <p className="mb-3 font-technical text-[10px] tracking-wider text-workspace-amber">{projectCategories.find(category => category.id === project.category)?.name}{project.status && ` / ${project.status}`}</p>
        <h3 className="font-display text-2xl font-semibold tracking-tight">{project.name}</h3>
        <p className="mt-3 font-technical text-[11px] leading-relaxed text-workspace-gray">{project.stack}</p>
        <p className="mt-5 text-sm leading-7 text-workspace-white/80">{project.description}</p>
        {(project.githubUrl || project.liveUrl) && <div className="mt-6 flex flex-wrap gap-6 text-sm text-workspace-amber">
          {project.githubUrl && <a href={project.githubUrl} className="underline underline-offset-4">GitHub ↗</a>}
          {project.liveUrl && <a href={project.liveUrl} className="underline underline-offset-4">Live Demo ↗</a>}
        </div>}
      </div>
    </article>)}
  </div>;
}
