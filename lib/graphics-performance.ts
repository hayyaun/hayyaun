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
export type GraphicsQuality = (typeof performanceModeConfig)[PerformanceMode]["quality"];
export const graphicsDefaults = {
  fpsThreshold: 42,
  warmupSeconds: 1,
  lowSeconds: 2,
  showPerf: false,
  mode: performanceModes[0],
  prismEnabled: true,
  waterEnabled: true,
  projectsEnabled: true,
};

type GraphicsSettings = typeof graphicsDefaults;
export type GraphicsState = GraphicsSettings & {
  fps: number | null;
  warmupRemaining: number;
  belowSeconds: number;
  measurementId: number;
  prismActive: boolean | null;
  prismReadyQuality: GraphicsQuality | null;
  prismFailed: boolean;
};

export function graphicsQuality(state: Pick<GraphicsState, "mode">): GraphicsQuality {
  return performanceModeConfig[state.mode].quality;
}

export function isPrismReady(state: GraphicsState) {
  return !state.prismFailed && state.prismReadyQuality === graphicsQuality(state);
}

export function isWaitingForPrism(state: GraphicsState) {
  return (
    performanceModeConfig[state.mode].prism &&
    state.prismEnabled &&
    !state.prismFailed &&
    (state.prismActive === null || (state.prismActive && !isPrismReady(state)))
  );
}

export const useGraphicsPerformance = create<GraphicsState>(() => ({
  ...graphicsDefaults,
  fps: null,
  warmupRemaining: graphicsDefaults.warmupSeconds,
  belowSeconds: 0,
  measurementId: 0,
  prismActive: null,
  prismReadyQuality: null,
  prismFailed: false,
}));

export function restartMeasurement() {
  useGraphicsPerformance.setState((state) => ({
    fps: null,
    warmupRemaining: state.warmupSeconds,
    belowSeconds: 0,
    measurementId: state.measurementId + 1,
  }));
}

export function updateGraphicsSettings(settings: Partial<Omit<GraphicsSettings, "mode">>) {
  useGraphicsPerformance.setState(settings);
  if (
    settings.warmupSeconds !== undefined ||
    settings.fpsThreshold !== undefined ||
    settings.lowSeconds !== undefined
  ) {
    restartMeasurement();
  }
}

export function resetGraphicsSettings() {
  // Scene readiness belongs to the renderer, not the settings panel.
  useGraphicsPerformance.setState(graphicsDefaults);
  restartMeasurement();
}

export function setPerformanceMode(mode: PerformanceMode) {
  useGraphicsPerformance.setState({ mode });
  restartMeasurement();
}

export function degradePerformance() {
  const index = performanceModes.indexOf(useGraphicsPerformance.getState().mode);
  if (index < performanceModes.length - 1) setPerformanceMode(performanceModes[index + 1]);
}

export function setPrismActive(prismActive: boolean | null) {
  useGraphicsPerformance.setState({ prismActive });
}

export function markPrismLoading() {
  useGraphicsPerformance.setState({ prismReadyQuality: null, prismFailed: false });
}

export function markPrismReady(quality: GraphicsQuality) {
  if (graphicsQuality(useGraphicsPerformance.getState()) === quality) {
    useGraphicsPerformance.setState({ prismReadyQuality: quality, prismFailed: false });
  }
}

export function markPrismFailed() {
  useGraphicsPerformance.setState({ prismReadyQuality: null, prismFailed: true });
}

export function clearPrismReadiness() {
  useGraphicsPerformance.setState({ prismReadyQuality: null });
}
