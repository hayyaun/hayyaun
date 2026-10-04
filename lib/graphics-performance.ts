"use client";

import { create } from "zustand";
// Declaration order defines the degradation sequence. Consumers use capabilities,
// so changing a mode name does not require updating effect or monitoring logic.
export const performanceModeConfig = {
  HIGH_PERFORMANCE: { quality: "high", prism: true, water: true, projects: true, monitor: true },
  MID_PERFORMANCE: { quality: "medium", prism: true, water: true, projects: true, monitor: true },
  LOW_PERFORMANCE: { quality: "low", prism: true, water: true, projects: true, monitor: true },
  PRISM_PREVIEW: { quality: "low", prism: false, water: true, projects: true, monitor: true },
  WEBGL_DISABLED: { quality: "low", prism: false, water: false, projects: false, monitor: false },
} as const;
export type PerformanceMode = keyof typeof performanceModeConfig;
export const performanceModes = Object.keys(performanceModeConfig) as PerformanceMode[];
export const graphicsDefaults = { fpsThreshold: 50, warmupSeconds: 3, lowSeconds: 2.5, showPerf: false, mode: performanceModes[0], prismEnabled: true, waterEnabled: true, projectsEnabled: true, quality: modeQuality(performanceModes[0]) };

export function modeQuality(mode: PerformanceMode): "high" | "medium" | "low" {
  return performanceModeConfig[mode].quality;
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
}>(() => ({ ...graphicsDefaults, fps: null, warmupRemaining: graphicsDefaults.warmupSeconds, belowSeconds: 0, measurementId: 0 }));

export function setPerformanceMode(mode: PerformanceMode) {
  const config = performanceModeConfig[mode];
  useGraphicsPerformance.setState((state) => ({ mode, quality: config.quality, fps: config.monitor ? null : state.fps, warmupRemaining: config.monitor ? state.warmupSeconds : 0, belowSeconds: 0, measurementId: state.measurementId + 1 }));
}

export function degradePerformance() {
  const index = performanceModes.indexOf(useGraphicsPerformance.getState().mode);
  if (index < performanceModes.length - 1) setPerformanceMode(performanceModes[index + 1]);
}
