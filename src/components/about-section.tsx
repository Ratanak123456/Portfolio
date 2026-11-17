import { ProjectsTitle } from "./projects-transition";
import { PortraitReveal } from "./portrait-reveal";
import { SkillsCatalog } from "./skills-catalog";
import { ProjectContainers } from "./project-containers";
import "./about-section.css";

export function AboutSection() {
  return <section id="about" aria-labelledby="about-heading" className="about-section scroll-mt-28 bg-hero-background text-hero-ink">
    <div className="about-grid mx-auto max-w-7xl px-6 sm:px-10">
      <div className="about-greeting" data-scroll-entry data-entry-lead="about">
        <p className="mb-6 flex items-center gap-3 font-technical text-[11px] tracking-[.16em]">
          <span className="h-2 w-2 bg-hero-amber" aria-hidden="true" />ABOUT ME
        </p>
        <h2 id="about-heading" className="font-display font-[750] tracking-[-.045em]">
          Hey, I’m<br />Ratanak<span className="text-hero-amber">.</span>
        </h2>
      </div>
      <PortraitReveal photo="/My_Pic/me.svg" alternate="/My_Pic/Wolverine.svg" />
      <div className="about-bio" data-scroll-entry data-entry-after="about" data-entry-delay="120">
        <p>I’m a DevOps engineer who likes figuring out what happens after the code is written. I build CI/CD pipelines, deploy apps with Docker, and use my homelab to test what breaks and how to fix it.</p>
      </div>
    </div>
    <SkillsCatalog />
    <ProjectContainers />
    <ProjectsTitle />
  </section>;
}
