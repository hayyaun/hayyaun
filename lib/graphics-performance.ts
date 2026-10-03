"use client";

import { create } from "zustand";

export const useGraphicsPerformance = create<{
  fpsThreshold: number;
  warmupSeconds: number;
  lowSeconds: number;
  showPerf: boolean;
  fps: number | null;
  lowPerformance: boolean;
}>(() => ({ fpsThreshold: 30, warmupSeconds: 5, lowSeconds: 5, showPerf: false, fps: null, lowPerformance: false }));
