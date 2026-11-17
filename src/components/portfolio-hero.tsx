import { ServerRack } from "@/components/server-rack";
import { HeroAnimation } from "@/components/hero-animation";
import { RackViewer } from "@/components/rack-viewer";

export function PortfolioHero() {
  return (
    <HeroAnimation>
      <div className="hero-showcase mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-6 pt-32 pb-12 sm:px-10 lg:min-h-dvh lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-8 lg:pt-28 lg:pb-8">
        <div className="hero-intro min-w-0 lg:col-start-1 lg:row-start-1">
          <p className="mb-6 flex items-center gap-3 font-technical font-normal text-[11px] tracking-[0.16em] sm:text-xs">
            <span aria-hidden="true" className="h-2 w-2 bg-hero-amber" />
            DEVOPS ENGINEER
          </p>
          <h1
            id="hero-headline"
            className="font-display text-[clamp(3.25rem,7.5vw,6.75rem)] leading-[0.98] font-[750] tracking-[-0.065em]"
          >
            <span className="block">Saren</span>{" "}
            <span className="block">
              Ratanak<span className="text-hero-amber">.</span>
            </span>
          </h1>
          <p className="font-display mt-6 text-[clamp(1.375rem,2.6vw,2rem)] leading-relaxed font-medium tracking-[-0.035em]">
            “You Build, <span className="hero-ship inline-block">I’ll Ship.</span>”
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-4 sm:mt-9 sm:gap-x-7">
            <a
              href="#projects"
              className="hero-project-link inline-flex min-h-12 items-center gap-3 bg-hero-amber px-4 py-3 text-sm font-semibold text-black outline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-hero-ink sm:px-5"
            >
              View my projects <span aria-hidden="true">↓</span>
            </a>
            <a
              href="https://github.com/Ratanak123456"
              className="inline-flex min-h-12 items-center gap-2 py-3 text-sm font-medium underline-offset-4 outline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-hero-ink"
            >
              GitHub <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
        <div className="hero-viewer min-w-0 self-center lg:col-start-2 lg:row-start-1">
          <RackViewer fallback={<ServerRack />} />
        </div>
      </div>
    </HeroAnimation>
  );
}
