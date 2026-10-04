"use client";

import { create } from "zustand";
import type { EnvironmentRotationControl } from "@/components/three/prism/scene";

// Shared by the homepage controls and the lazily loaded prism scene.
function createEnvironmentRotationControl(): { current: EnvironmentRotationControl } {
  const degrees: [number, number, number] = [0, 0, 0];
  let actual: [number, number, number] = [0, 0, 0];
  let display: ((degrees: [number, number, number]) => void) | undefined;
  let lastDisplay = -Infinity;
  let apply: (() => void) | undefined;
  return { current: {
    getDegrees: () => [...degrees],
    setAxis: (axis, value) => {
      // A slider represents the current angle, including automatic/pointer motion.
      degrees[axis] += value - actual[axis];
      actual[axis] = value;
      lastDisplay = -Infinity;
      apply?.();
    },
    subscribe: (listener) => {
      apply = listener;
      return () => { if (apply === listener) apply = undefined; };
    },
    reportRotation: (rotation) => {
      actual = rotation;
      const now = performance.now();
      if (now - lastDisplay < 100) return;
      lastDisplay = now;
      display?.(rotation);
    },
    subscribeDisplay: (listener) => {
      display = listener;
      listener(actual);
      return () => { if (display === listener) display = undefined; };
    },
  } };
}

export const usePrismDebug = create<{
  color: string;
  autoRotate: boolean;
  environmentRotationControl: { current: EnvironmentRotationControl };
}>(() => ({
  color: "#8b82aa",
  autoRotate: true,
  environmentRotationControl: createEnvironmentRotationControl(),
}));
