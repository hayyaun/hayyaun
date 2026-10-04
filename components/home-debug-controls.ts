"use client";

import { useControls, type useCreateStore } from "leva";
import { useEffect } from "react";
import { useShallow } from "zustand/react/shallow";
import { onPanelChange } from "@/lib/debug-controls";
import {
  isWaitingForPrism,
  performanceModeConfig,
  performanceModes,
  setPerformanceMode,
  updateGraphicsSettings,
  useGraphicsPerformance,
} from "@/lib/graphics-performance";
import { usePrismDebug } from "@/lib/prism-debug";

type ControlStore = ReturnType<typeof useCreateStore>;

export function useGraphicsDebugControls(store: ControlStore) {
  const settings = useGraphicsPerformance(
    useShallow((state) => ({
      warmupSeconds: state.warmupSeconds,
      fpsThreshold: state.fpsThreshold,
      lowSeconds: state.lowSeconds,
      showPerf: state.showPerf,
      mode: state.mode,
      prismEnabled: state.prismEnabled,
      waterEnabled: state.waterEnabled,
      projectsEnabled: state.projectsEnabled,
    }))
  );
  const [, setPerformance] = useControls(
    "Performance",
    () => {
      const initial = useGraphicsPerformance.getState();
      return {
        warmupSeconds: {
          value: initial.warmupSeconds,
          min: 1,
          max: 60,
          step: 1,
          label: "Warmup seconds",
          onChange: onPanelChange((warmupSeconds: number) => updateGraphicsSettings({ warmupSeconds })),
        },
        fpsThreshold: {
          value: initial.fpsThreshold,
          min: 5,
          max: 120,
          step: 1,
          label: "Minimum FPS",
          onChange: onPanelChange((fpsThreshold: number) => updateGraphicsSettings({ fpsThreshold })),
        },
        lowSeconds: {
          value: initial.lowSeconds,
          min: 1,
          max: 30,
          step: 0.5,
          label: "Seconds below FPS",
          onChange: onPanelChange((lowSeconds: number) => updateGraphicsSettings({ lowSeconds })),
        },
        showPerf: {
          value: initial.showPerf,
          label: "Floating FPS popup",
          onChange: onPanelChange((showPerf: boolean) => updateGraphicsSettings({ showPerf })),
        },
      };
    },
    { collapsed: true, order: 1 },
    { store }
  );
  const [, setEffects] = useControls(
    "Effects",
    () => {
      const initial = useGraphicsPerformance.getState();
      return {
        performanceMode: {
          value: initial.mode,
          options: [...performanceModes],
          label: "Performance mode",
          onChange: onPanelChange(setPerformanceMode),
        },
        prismEnabled: {
          value: initial.prismEnabled,
          label: "Prism",
          onChange: onPanelChange((prismEnabled: boolean) => updateGraphicsSettings({ prismEnabled })),
        },
        waterEnabled: {
          value: initial.waterEnabled,
          label: "Water splash",
          onChange: onPanelChange((waterEnabled: boolean) => updateGraphicsSettings({ waterEnabled })),
        },
        projectsEnabled: {
          value: initial.projectsEnabled,
          label: "Project transitions",
          onChange: onPanelChange((projectsEnabled: boolean) => updateGraphicsSettings({ projectsEnabled })),
        },
      };
    },
    { collapsed: true, order: 2 },
    { store }
  );
  useEffect(() => {
    setPerformance({
      warmupSeconds: settings.warmupSeconds,
      fpsThreshold: settings.fpsThreshold,
      lowSeconds: settings.lowSeconds,
      showPerf: settings.showPerf,
    });
    setEffects({
      performanceMode: settings.mode,
      prismEnabled: settings.prismEnabled,
      waterEnabled: settings.waterEnabled,
      projectsEnabled: settings.projectsEnabled,
    });
  }, [settings, setPerformance, setEffects]);
}

export function usePrismDebugControls(store: ControlStore) {
  const { color, autoRotate, environmentRotationControl } = usePrismDebug();
  const [, setEnvironment] = useControls(
    "Prism environment",
    () => {
      const initial = usePrismDebug.getState();
      const control = initial.environmentRotationControl.current;
      const [x, y, z] = control.getActualDegrees();
      return {
        autoRotate: {
          value: initial.autoRotate,
          label: "Auto rotate",
          onChange: onPanelChange((autoRotate: boolean) => usePrismDebug.setState({ autoRotate })),
        },
        x: {
          value: x,
          min: -180,
          max: 180,
          step: 0.1,
          label: "X rotation (°)",
          onChange: onPanelChange((value: number) => control.setAxis(0, value)),
        },
        y: {
          value: y,
          min: -180,
          max: 180,
          step: 0.1,
          label: "Y rotation (°)",
          onChange: onPanelChange((value: number) => control.setAxis(1, value)),
        },
        z: {
          value: z,
          min: -180,
          max: 180,
          step: 0.1,
          label: "Z rotation (°)",
          onChange: onPanelChange((value: number) => control.setAxis(2, value)),
        },
        color: {
          value: initial.color,
          label: "Prism color",
          onChange: onPanelChange((color: string) => usePrismDebug.setState({ color })),
        },
      };
    },
    { collapsed: true, order: 3 },
    { store }
  );
  useEffect(() => {
    setEnvironment({ color, autoRotate });
  }, [color, autoRotate, setEnvironment]);
  useEffect(
    () =>
      environmentRotationControl.current.subscribeDisplay(([x, y, z]) => {
        setEnvironment({ x, y, z });
      }),
    [environmentRotationControl, setEnvironment]
  );
}

export function useGraphicsStatusControls(store: ControlStore) {
  const status = useGraphicsPerformance(
    useShallow((state) => ({
      mode: state.mode,
      fps: state.fps,
      warmupRemaining: state.warmupRemaining,
      belowSeconds: state.belowSeconds,
      waiting: isWaitingForPrism(state),
    }))
  );
  const [, setStatus] = useControls(
    "Status",
    () => ({
      fps: { value: "Warming up", editable: false, label: "Page FPS" },
      warmup: { value: "", editable: false, label: "Warmup remaining" },
      below: { value: "", editable: false, label: "Below threshold" },
      reason: { value: "", editable: false, label: "Mode" },
    }),
    { collapsed: false, order: 0 },
    { store }
  );
  useEffect(() => {
    setStatus({
      fps: !performanceModeConfig[status.mode].monitor
        ? "Monitoring stopped"
        : status.waiting
          ? "Waiting for scene"
          : status.fps === null
            ? "Warming up"
            : String(status.fps),
      warmup: `Remaining: ${status.warmupRemaining} seconds`,
      below: `Duration: ${status.belowSeconds} seconds`,
      reason: status.mode,
    });
  }, [status, setStatus]);
}
