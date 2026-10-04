"use client";

import { create } from "zustand";
export const performanceModes = ["HIGH_PERFORMANCE", "MID_PERFORMANCE", "LOW_PERFORMANCE", "PRISM_PREVIEW", "WEBGL_DISABLED"] as const;
export type PerformanceMode = typeof performanceModes[number];
export const graphicsDefaults = { fpsThreshold: 30, warmupSeconds: 5, lowSeconds: 5, showPerf: false, mode: "HIGH_PERFORMANCE" as PerformanceMode, prismEnabled: true, waterEnabled: true, projectsEnabled: true, quality: "high" as "low" | "medium" | "high" };

export function modeQuality(mode: PerformanceMode): "high" | "medium" | "low" {
  return mode === "HIGH_PERFORMANCE" ? "high" : mode === "MID_PERFORMANCE" ? "medium" : "low";
}

export const useGraphicsPerformance = create<{
  fpsThreshold: number;
  warmupSeconds: number;
  lowSeconds: number;
  showPerf: boolean;
  fps: number | null;
  mode: PerformanceMode;
  prismEnabled: boolean;
  waterEnabled: boolean;
  projectsEnabled: boolean;
  quality: "low" | "medium" | "high";
  warmupRemaining: number;
  belowSeconds: number;
  measurementId: number;
}>(() => ({ ...graphicsDefaults, fps: null, warmupRemaining: 5, belowSeconds: 0, measurementId: 0 }));

export function setPerformanceMode(mode: PerformanceMode) {
  useGraphicsPerformance.setState((state) => ({ mode, quality: modeQuality(mode), fps: mode === "WEBGL_DISABLED" ? state.fps : null, warmupRemaining: mode === "WEBGL_DISABLED" ? 0 : state.warmupSeconds, belowSeconds: 0, measurementId: state.measurementId + 1 }));
}

export function degradePerformance() {
  const index = performanceModes.indexOf(useGraphicsPerformance.getState().mode);
  if (index < performanceModes.length - 1) setPerformanceMode(performanceModes[index + 1]);
}
