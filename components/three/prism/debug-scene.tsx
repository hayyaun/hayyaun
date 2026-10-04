"use client";

import { Component, type ReactNode } from "react";
import Scene from "./scene";
import { performanceModeConfig, useGraphicsPerformance } from "@/lib/graphics-performance";
import { usePrismDebug } from "@/lib/prism-debug";

class CanvasBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    useGraphicsPerformance.setState({ prismFailed: true });
  }
  render() {
    return this.state.failed ? (
      <div role="alert" className="p-8 text-gray-700">
        <p>The browser blocked WebGL after a graphics context loss. Your controls are still available.</p>
        <p>Copy your settings, then close this tab and reopen the page. If it remains blocked, restart the browser.</p>
      </div>
    ) : (
      this.props.children
    );
  }
}
export default function DebugScene({ active = true }: { active?: boolean }) {
  const lowPerformance = useGraphicsPerformance((state) => !performanceModeConfig[state.mode].prism || !state.prismEnabled);
  const { color, autoRotate, environmentRotationControl } = usePrismDebug();

  return (
    <div style={{ width: "100%", height: "100%", margin: "auto" }}>
      {active && !lowPerformance && <CanvasBoundary>
        <Scene presentation tuning debug pointerMotion autoRotate={autoRotate} environmentRotationControl={environmentRotationControl} prismColor={color} />
      </CanvasBoundary>}
    </div>
  );
}
