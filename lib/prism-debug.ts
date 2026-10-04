"use client";

import { create } from "zustand";
export type EnvironmentRotationControl = {
  getDegrees: () => [number, number, number];
  getActualDegrees: () => [number, number, number];
  setAxis: (axis: 0 | 1 | 2, value: number) => void;
  subscribe: (apply: () => void) => () => void;
  reportRotation: (degrees: [number, number, number]) => void;
  subscribeDisplay: (listener: (degrees: [number, number, number]) => void) => () => void;
};

export const prismDefaults = { color: "#8b82aa", autoRotate: true };

// Shared by the homepage controls and the lazily loaded prism scene.
function createEnvironmentRotationControl(): { current: EnvironmentRotationControl } {
  const degrees: [number, number, number] = [0, 0, 0];
  let actual: [number, number, number] = [0, 0, 0];
  let display: ((degrees: [number, number, number]) => void) | undefined;
  let lastDisplay = -Infinity;
  let apply: (() => void) | undefined;
  return {
    current: {
      getDegrees: () => [...degrees],
      getActualDegrees: () => [...actual],
      setAxis: (axis, value) => {
        // A slider represents the current angle, including automatic/pointer motion.
        degrees[axis] += value - actual[axis];
        actual[axis] = value;
        lastDisplay = -Infinity;
        if (apply) apply();
        else display?.([...actual]);
      },
      subscribe: (listener) => {
        apply = listener;
        return () => {
          if (apply === listener) apply = undefined;
        };
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
        return () => {
          if (display === listener) display = undefined;
        };
      },
    },
  };
}

export const usePrismDebug = create<{
  color: string;
  autoRotate: boolean;
  environmentRotationControl: { current: EnvironmentRotationControl };
}>(() => ({
  ...prismDefaults,
  environmentRotationControl: createEnvironmentRotationControl(),
}));

export function resetPrismSettings() {
  const control = usePrismDebug.getState().environmentRotationControl.current;
  control.setAxis(0, 0);
  control.setAxis(1, 0);
  control.setAxis(2, 0);
  usePrismDebug.setState(prismDefaults);
}
