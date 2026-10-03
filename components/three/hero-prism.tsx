"use client";

import dynamic from "next/dynamic";
import { useGraphicsPerformance } from "@/lib/graphics-performance";
import { Component, useEffect, useRef, useState, type ReactNode } from "react";

const Scene = dynamic(() => import("@/components/three/prism/scene"), { ssr: false });

const DevControls = process.env.NODE_ENV === "development" ? dynamic(() => import("@/components/three/prism/debug-controls"), { ssr: false }) : null;

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default function HeroPrism() {
  const lowPerformance = useGraphicsPerformance((state) => state.lowPerformance);
  const host = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setEnabled(!motion.matches);
    sync();
    motion.addEventListener("change", sync);
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    if (host.current) observer.observe(host.current);
    return () => {
      observer.disconnect();
      motion.removeEventListener("change", sync);
    };
  }, []);

  return (
    <div ref={host} className="hero-canvas">
      {(DevControls || (enabled && visible && !lowPerformance)) && (
        <div className="hero-scene-frame">
          <SceneBoundary>{DevControls ? <DevControls landing active={enabled && visible} /> : <Scene presentation />}</SceneBoundary>
        </div>
      )}
    </div>
  );
}

