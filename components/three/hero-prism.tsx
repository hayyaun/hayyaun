"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import {
  markPrismFailed,
  performanceModeConfig,
  setPrismActive,
  useGraphicsPerformance,
} from "@/lib/graphics-performance";
import { Component, useEffect, useRef, useState, type ReactNode } from "react";

const Scene = dynamic(() => import("@/components/three/prism/scene"), { ssr: false });

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    markPrismFailed();
  }
  render() {
    return this.state.failed ? (
      <p role="status" className="absolute right-6 bottom-6 left-6 bg-white/90 p-3 text-sm text-gray-700">
        The 3D preview is unavailable. The static preview is shown instead.
      </p>
    ) : (
      this.props.children
    );
  }
}

export default function HeroPrism() {
  const params = useSearchParams();
  const debug = params.has("debug") && !["0", "false"].includes(params.get("debug") ?? "");
  const lowPerformance = useGraphicsPerformance(
    (state) => !performanceModeConfig[state.mode].prism || !state.prismEnabled
  );
  const host = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      setEnabled(!motion.matches);
      setInitialized(true);
    };
    sync();
    motion.addEventListener("change", sync);
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    if (host.current) observer.observe(host.current);
    return () => {
      observer.disconnect();
      motion.removeEventListener("change", sync);
    };
  }, []);

  useEffect(() => {
    if (!initialized) return;
    setPrismActive(enabled && visible && !lowPerformance);
    return () => setPrismActive(null);
  }, [initialized, enabled, visible, lowPerformance]);

  return (
    <div ref={host} className="hero-canvas">
      {enabled && visible && !lowPerformance && (
        <div className="hero-scene-frame">
          <SceneBoundary>
            <Scene debug={debug} />
          </SceneBoundary>
        </div>
      )}
    </div>
  );
}
