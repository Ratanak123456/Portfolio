import type { ReactNode } from "react";

// Keep the server-rendered hero static; the rack owns its user-driven motion.
export function HeroAnimation({ children }: { children: ReactNode }) {
  return (
    <section aria-labelledby="hero-headline" className="bg-hero-background text-hero-ink">
      {children}
    </section>
  );
}
