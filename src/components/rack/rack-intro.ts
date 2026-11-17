"use client";

import { createContext } from "react";

// Imperative animation clock shared by the gate and the existing live scene.
// Updates use methods; the React context value itself stays stable.
export type RackIntroShot = { push: number; pullback: number };
export const RACK_INTRO_TIMING = { doors: 650, framed: 250, push: 450, pullback: 750 } as const;
export const easeRackIntro = (t: number) => {
  const p = Math.max(0, Math.min(1, t));
  // Zero speed and acceleration at each end, including the reversal.
  return p * p * p * (p * (p * 6 - 15) + 10);
};
export type RackIntroDriver = { paint: (shot: RackIntroShot) => void; reset: () => void };
export class RackIntroBridge {
  private state: { active: boolean; driver: RackIntroDriver | null; onReady: (() => void) | null } = { active: false, driver: null, onReady: null };
  get active() { return this.state.active; }
  get driver() { return this.state.driver; }
  get onReady() { return this.state.onReady; }
  setActive(active: boolean) { this.state.active = active; }
  setDriver(driver: RackIntroDriver | null) { this.state.driver = driver; }
  setOnReady(onReady: (() => void) | null) { this.state.onReady = onReady; }
}

export const RackIntroContext = createContext<RackIntroBridge | null>(null);
