import { SSHKeyGate } from "./ssh-key-gate/ssh-key-gate";
import { WorkspaceNav } from "@/components/workspace-nav";
import { PortfolioHero } from "@/components/portfolio-hero";
import { AboutSection } from "@/components/about-section";
import { ScrollEntrances } from "@/components/scroll-entrances";
import { ProjectDetails } from "@/components/project-details";
import { ProjectsTransition } from "@/components/projects-transition";

export default function Home() {
  return (
    <SSHKeyGate>
      <ScrollEntrances />
      <header className="pointer-events-none fixed inset-x-0 top-4 z-20 px-3 sm:top-6 sm:px-6">
        <div className="pointer-events-auto mx-auto max-w-2xl">
          <WorkspaceNav />
        </div>
      </header>
      <main className="w-full font-sans">
        <PortfolioHero />
        <ProjectsTransition>
        <AboutSection />
        <section
          id="projects"
          className="min-h-[70svh] scroll-mt-24 text-workspace-white"
        >
          <div className="projects-showcase-inner mx-auto max-w-6xl px-6 pb-12 sm:px-10">
            <div aria-hidden="true" className="h-12 w-px bg-workspace-amber" />
            <p className="mb-4 font-mono text-xs tracking-widest text-workspace-amber">
              01 / PROJECTS
            </p>
            <h2 className="text-3xl font-semibold sm:text-4xl">
              Selected Projects
            </h2>
            <ProjectDetails />
          </div>
        </section>
        </ProjectsTransition>
        <div className="mx-auto w-full max-w-4xl px-6">
          <section id="lab-notes" className="min-h-[70svh] scroll-mt-28 py-12">
            <h2 className="text-3xl font-semibold" data-scroll-entry>Lab Notes</h2>
          </section>
          <section id="contact" className="min-h-svh scroll-mt-28 py-12">
            <h2 className="text-3xl font-semibold" data-scroll-entry>Contact</h2>
          </section>
        </div>
      </main>
    </SSHKeyGate>
  );
}
