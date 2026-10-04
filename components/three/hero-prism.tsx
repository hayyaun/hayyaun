"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { performanceModeConfig, useGraphicsPerformance } from "@/lib/graphics-performance";
import { Component, useEffect, useRef, useState, type ReactNode } from "react";

const Scene = dynamic(() => import("@/components/three/prism/scene"), { ssr: false });

const DebugControls = dynamic(() => import("@/components/three/prism/debug-controls"), { ssr: false });

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    useGraphicsPerformance.setState({ prismFailed: true });
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default function HeroPrism() {
  const params = useSearchParams();
  const debug = params.has("debug") && !["0", "false"].includes(params.get("debug") ?? "");
  const lowPerformance = useGraphicsPerformance((state) => !performanceModeConfig[state.mode].prism || !state.prismEnabled);
  const host = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => { setEnabled(!motion.matches); setInitialized(true); };
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
    useGraphicsPerformance.setState({ prismActive: enabled && visible && !lowPerformance });
  }, [initialized, enabled, visible, lowPerformance]);

  return (
    <div ref={host} className="hero-canvas">
      {(debug || (enabled && visible && !lowPerformance)) && (
        <div className="hero-scene-frame">
          <SceneBoundary>{debug ? <DebugControls landing active={enabled && visible} /> : <Scene presentation />}</SceneBoundary>
        </div>
      )}
    </div>
  );
}

