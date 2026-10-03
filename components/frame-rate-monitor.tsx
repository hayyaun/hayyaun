"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useGraphicsPerformance } from "@/lib/graphics-performance";

/** Observe browser frame cadence independently of the scene's 30 FPS render cap. */
export default function FrameRateMonitor() {
  const showPerf = useGraphicsPerformance((state) => state.showPerf);
  const fps = useGraphicsPerformance((state) => state.fps);
  const lowPerformance = useGraphicsPerformance((state) => state.lowPerformance);
  useEffect(() => {
    if (lowPerformance && !showPerf) return;
    let frame = 0;
    let previous = 0;
    let elapsed = 0;
    let frames = 0;
    let warmup = 0;
    let low = 0;
    const reset = () => {
      previous = elapsed = frames = warmup = low = 0;
      useGraphicsPerformance.setState({ fps: null });
    };
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      if (document.hidden) return;
      if (!previous) { previous = now; return; }
      const delta = now - previous;
      previous = now;
      warmup += delta;
      if (warmup < useGraphicsPerformance.getState().warmupSeconds * 1000) return;
      elapsed += delta;
      frames++;
      if (elapsed < 1000) return;
      const measured = frames * 1000 / elapsed;
      const { fpsThreshold, lowSeconds } = useGraphicsPerformance.getState();
      low = measured < fpsThreshold ? low + elapsed : 0;
      useGraphicsPerformance.setState({ fps: Math.round(measured), ...(low >= lowSeconds * 1000 ? { lowPerformance: true } : {}) });
      elapsed = frames = 0;
    };
    frame = requestAnimationFrame(tick);
    document.addEventListener("visibilitychange", reset);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", reset);
    };
  }, [lowPerformance, showPerf]);
  return showPerf ? createPortal(
    <div style={{ position: "fixed", bottom: 16, left: 16, zIndex: 10000, padding: "8px 12px", borderRadius: 8, background: "#201d29", color: "white", font: "12px monospace", pointerEvents: "none" }}>
      Page FPS: {fps ?? "warming up"}{lowPerformance ? " · Preview mode" : ""}
    </div>, document.body,
  ) : null;
}
