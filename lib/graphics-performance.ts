"use client";

import { create } from "zustand";
export const graphicsDefaults = { fpsThreshold: 30, warmupSeconds: 5, lowSeconds: 5, showPerf: false, forcePreview: false, prismEnabled: true, waterEnabled: true, projectsEnabled: true, quality: "high" as "low" | "medium" | "high" };

export const useGraphicsPerformance = create<{
  fpsThreshold: number;
  warmupSeconds: number;
  lowSeconds: number;
  showPerf: boolean;
  fps: number | null;
  lowPerformance: boolean;
  forcePreview: boolean;
  prismEnabled: boolean;
  waterEnabled: boolean;
  projectsEnabled: boolean;
  quality: "low" | "medium" | "high";
  warmupRemaining: number;
  belowSeconds: number;
  measurementId: number;
}>(() => ({ ...graphicsDefaults, fps: null, lowPerformance: false, warmupRemaining: 5, belowSeconds: 0, measurementId: 0 }));
