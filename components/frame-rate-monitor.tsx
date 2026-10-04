"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import {
  degradePerformance,
  isWaitingForPrism,
  performanceModeConfig,
  useGraphicsPerformance,
} from "@/lib/graphics-performance";

/** Observe browser frame cadence independently of the scene's 30 FPS render cap. */
export default function FrameRateMonitor() {
  const showPerf = useGraphicsPerformance((state) => state.showPerf);
  const fps = useGraphicsPerformance((state) => state.fps);
  const mode = useGraphicsPerformance((state) => state.mode);
  const measurementId = useGraphicsPerformance((state) => state.measurementId);
  const waitingForScene = useGraphicsPerformance(isWaitingForPrism);
  useEffect(() => {
    if (!performanceModeConfig[mode].monitor) return;
    // Loading and shader compilation must not consume warmup or low-FPS time.
    if (waitingForScene) {
      useGraphicsPerformance.setState({
        fps: null,
        warmupRemaining: useGraphicsPerformance.getState().warmupSeconds,
        belowSeconds: 0,
      });
      return;
    }
    let frame = 0;
    let previous = 0;
    let elapsed = 0;
    let frames = 0;
    let warmup = 0;
    let low = 0;
    const reset = () => {
      previous = elapsed = frames = warmup = low = 0;
      useGraphicsPerformance.setState({
        fps: null,
        warmupRemaining: useGraphicsPerformance.getState().warmupSeconds,
        belowSeconds: 0,
      });
    };
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      if (document.hidden) return;
      if (!previous) {
        previous = now;
        return;
      }
      const delta = now - previous;
      previous = now;
      warmup += delta;
      const remaining = Math.max(0, Math.ceil(useGraphicsPerformance.getState().warmupSeconds - warmup / 1000));
      if (remaining) {
        if (remaining !== useGraphicsPerformance.getState().warmupRemaining)
          useGraphicsPerformance.setState({ warmupRemaining: remaining });
        return;
      }
      elapsed += delta;
      frames++;
      if (elapsed < 1000) return;
      const measured = (frames * 1000) / elapsed;
      const { fpsThreshold, lowSeconds } = useGraphicsPerformance.getState();
      low = measured < fpsThreshold ? low + elapsed : 0;
      useGraphicsPerformance.setState({
        fps: Math.round(measured),
        warmupRemaining: 0,
        belowSeconds: Math.round(low / 100) / 10,
      });
      if (low >= lowSeconds * 1000) {
        cancelAnimationFrame(frame);
        degradePerformance();
        return;
      }
      elapsed = frames = 0;
    };
    frame = requestAnimationFrame(tick);
    document.addEventListener("visibilitychange", reset);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", reset);
    };
  }, [mode, measurementId, waitingForScene]);
  return showPerf
    ? createPortal(
        <div
          style={{
            position: "fixed",
            bottom: 16,
            left: 16,
            zIndex: 10000,
            padding: "8px 12px",
            borderRadius: 8,
            background: "#201d29",
            color: "white",
            font: "12px monospace",
            pointerEvents: "none",
          }}
        >
          Page FPS: {waitingForScene ? "waiting for scene" : (fps ?? "warming up")} · {mode}
          {!performanceModeConfig[mode].monitor ? " · Monitoring stopped" : ""}
        </div>,
        document.body
      )
    : null;
}
