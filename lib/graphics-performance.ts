"use client";

import { create } from "zustand";

export const useGraphicsPerformance = create<{
  fpsThreshold: number;
  lowSeconds: number;
  showPerf: boolean;
  lowPerformance: boolean;
}>(() => ({ fpsThreshold: 20, lowSeconds: 5, showPerf: false, lowPerformance: false }));
