"use client";

import dynamic from "next/dynamic";
import { RACK_STAGE_SIZE } from "./rack/rack-layout";
import { Component, useEffect, useState, type ReactNode } from "react";

const RackExperience = dynamic(() => import("@/components/rack/rack-experience"), { ssr: false });

class ViewerBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

export function RackViewer({ fallback }: { fallback: ReactNode }) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [ready, setReady] = useState(false);
  const [lost, setLost] = useState(false);

  useEffect(() => {
    // Warm the complete scene chunk while the visitor handles the key. The
    // same module is used by next/dynamic; the scene has procedural assets.
    void import("./rack/rack-experience").catch(() => setLost(true));
    const frame = requestAnimationFrame(() => {
      try {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("webgl2");
        setSupported(!!context);
        context?.getExtension("WEBGL_lose_context")?.loseContext();
      } catch { setSupported(false); }
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const fallbackClass = `rack-fallback ${RACK_STAGE_SIZE} [&>figure]:flex [&>figure]:h-full [&>figure]:flex-col [&_svg]:min-h-0 [&_svg]:flex-1`;
  const unavailable = <div className={`relative mx-auto w-full ${RACK_STAGE_SIZE}`}>
    <div className={fallbackClass}>{fallback}</div>
    <p className="absolute top-full mt-3 text-xs text-hero-ink/70">Interactive view unavailable. Static rack shown.</p>
  </div>;
  if (supported === false || lost) return unavailable;

  return (
    <ViewerBoundary fallback={unavailable}>
      <div className={`relative mx-auto w-full ${RACK_STAGE_SIZE}`} aria-busy={!ready} data-rack-loading={!ready ? "true" : "false"}>
        {!ready && <div><div className={fallbackClass}>{fallback}</div><p role="status" className="absolute top-full mt-3 font-mono text-[10px]">Loading interactive rack…</p></div>}
        {supported && (
          <div className={ready ? "absolute inset-0" : "absolute inset-0 invisible"}>
            <RackExperience onReady={() => setReady(true)} onUnavailable={() => setLost(true)} />
          </div>
        )}
      </div>
    </ViewerBoundary>
  );
}
