"use client";

import { useFrame } from "@react-three/fiber";
import { lazy, Suspense, useRef } from "react";
import { useGraphicsPerformance } from "@/lib/graphics-performance";

const Perf = lazy(() => import("r3f-perf").then((module) => ({ default: module.Perf })));

/** Sample active frames only; demand-rendering idle gaps are not slow frames. */
export default function GraphicsPerformance({ ready }: { ready: boolean }) {
  const showPerf = useGraphicsPerformance((state) => state.showPerf);
  const sample = useRef({ previous: 0, elapsed: 0, frames: 0, warmup: 0, low: 0 });
  useFrame(() => {
    const now = performance.now();
    const state = sample.current;
    const milliseconds = now - state.previous;
    state.previous = now;
    if (!ready || document.hidden || milliseconds > 1000) {
      state.elapsed = state.frames = state.warmup = state.low = 0;
      return;
    }
    state.warmup += milliseconds;
    if (state.warmup < 3000) return;
    state.elapsed += milliseconds;
    state.frames++;
    if (state.elapsed < 1000) return;
    const { fpsThreshold, lowSeconds } = useGraphicsPerformance.getState();
    const fps = state.frames * 1000 / state.elapsed;
    state.low = fps < fpsThreshold ? state.low + state.elapsed : 0;
    state.elapsed = state.frames = 0;
    if (state.low >= lowSeconds * 1000) {
      useGraphicsPerformance.setState({ lowPerformance: true });
    }
  });
  return showPerf ? <Suspense fallback={null}><Perf position="top-left" minimal /></Suspense> : null;
}
