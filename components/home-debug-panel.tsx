"use client";

import { button, LevaPanel, useControls, useCreateStore } from "leva";
import { useEffect, useState } from "react";
import { usePrismDebug } from "@/lib/prism-debug";
import { graphicsDefaults, performanceModeConfig, performanceModes, setPerformanceMode, useGraphicsPerformance, type PerformanceMode } from "@/lib/graphics-performance";

export default function HomeDebugPanel() {
  useEffect(() => () => useGraphicsPerformance.setState({ showPerf: false }), []);
  const status = useGraphicsPerformance();
  const waitingForScene = performanceModeConfig[status.mode].prism && status.prismEnabled && !status.prismFailed &&
    (status.prismActive === null || (status.prismActive && status.prismReadyQuality !== status.quality));
  const levaStore = useCreateStore();
  const environmentRotationControl = usePrismDebug((state) => state.environmentRotationControl);
  const updateRotation = (axis: 0 | 1 | 2, value: number, context: { fromPanel: boolean }) => {
    // Leva's set() also invokes onChange: ignore animation feedback.
    if (!context.fromPanel) return;
    environmentRotationControl.current.setAxis(axis, value);
  };
  const [, setPerformance] = useControls("Performance", () => ({
    warmupSeconds: { value: graphicsDefaults.warmupSeconds, min: 1, max: 60, step: 1, label: "Warmup seconds", onChange: (warmupSeconds: number) => useGraphicsPerformance.setState({ warmupSeconds }) },
    fpsThreshold: { value: graphicsDefaults.fpsThreshold, min: 5, max: 120, step: 1, label: "Minimum FPS", onChange: (fpsThreshold: number) => useGraphicsPerformance.setState({ fpsThreshold }) },
    lowSeconds: { value: graphicsDefaults.lowSeconds, min: 1, max: 30, step: 0.5, label: "Seconds below FPS", onChange: (lowSeconds: number) => useGraphicsPerformance.setState({ lowSeconds }) },
    showPerf: { value: false, label: "Floating FPS popup", onChange: (showPerf: boolean) => useGraphicsPerformance.setState({ showPerf }) },
  }), { collapsed: true, order: 1 }, { store: levaStore });
  const [, setEffects] = useControls("Effects", () => ({
    performanceMode: {
      value: useGraphicsPerformance.getState().mode,
      options: [...performanceModes],
      label: "Performance mode",
      onChange: (mode: PerformanceMode, _path: string, context: { fromPanel: boolean }) => {
        if (!context.fromPanel) return;
        setPerformanceMode(mode);
      },
    },
    prismEnabled: { value: true, label: "Prism", onChange: (prismEnabled: boolean) => useGraphicsPerformance.setState({ prismEnabled }) },
    waterEnabled: { value: true, label: "Water splash", onChange: (waterEnabled: boolean) => useGraphicsPerformance.setState({ waterEnabled }) },
    projectsEnabled: { value: true, label: "Project transitions", onChange: (projectsEnabled: boolean) => useGraphicsPerformance.setState({ projectsEnabled }) },
  }), { collapsed: true, order: 2 }, { store: levaStore });
  useEffect(() => {
    setEffects({ performanceMode: status.mode });
  }, [status.mode, setEffects]);
  const [, setEnvironment, getEnvironment] = useControls(
    "Prism environment",
    () => ({
      autoRotate: { value: usePrismDebug.getState().autoRotate, label: "Auto rotate", onChange: (autoRotate: boolean) => usePrismDebug.setState({ autoRotate }) },
      x: { value: 0, min: -180, max: 180, step: 0.1, label: "X rotation (°)", onChange: (value: number, _path: string, context: { fromPanel: boolean }) => updateRotation(0, value, context) },
      y: { value: 0, min: -180, max: 180, step: 0.1, label: "Y rotation (°)", onChange: (value: number, _path: string, context: { fromPanel: boolean }) => updateRotation(1, value, context) },
      z: { value: 0, min: -180, max: 180, step: 0.1, label: "Z rotation (°)", onChange: (value: number, _path: string, context: { fromPanel: boolean }) => updateRotation(2, value, context) },
      color: { value: usePrismDebug.getState().color, label: "Prism color", onChange: (color: string) => usePrismDebug.setState({ color }) },
    }),
    { collapsed: true, order: 3 },
    { store: levaStore }
  );
  const { color, autoRotate } = usePrismDebug();
  useEffect(() => environmentRotationControl.current.subscribeDisplay(([x, y, z]) => {
    setEnvironment({ x, y, z });
  }), [environmentRotationControl, setEnvironment]);
  const [, setStatus] = useControls("Status", () => ({
    fps: { value: "Warming up", editable: false, label: "Page FPS" },
    warmup: { value: `Remaining: ${graphicsDefaults.warmupSeconds} seconds`, editable: false, label: "Warmup remaining" },
    below: { value: "Duration: 0 seconds", editable: false, label: "Below threshold" },
    reason: { value: "WebGL enabled", editable: false, label: "Mode" },
  }), { collapsed: false, order: 0 }, { store: levaStore });
  useEffect(() => {
    setStatus({ fps: !performanceModeConfig[status.mode].monitor ? "Monitoring stopped" : waitingForScene ? "Waiting for scene" : status.fps === null ? "Warming up" : String(status.fps), warmup: `Remaining: ${status.warmupRemaining} seconds`, below: `Duration: ${status.belowSeconds} seconds`, reason: status.mode });
  }, [status.fps, status.warmupRemaining, status.belowSeconds, status.mode, waitingForScene, setStatus]);
  const [message, setMessage] = useState("");
  const settings = JSON.stringify({ prismColor: color, autoRotate, performance: { mode: status.mode, fpsThreshold: status.fpsThreshold, warmupSeconds: status.warmupSeconds, lowSeconds: status.lowSeconds, showPerf: status.showPerf }, effects: { prismEnabled: status.prismEnabled, waterEnabled: status.waterEnabled, projectsEnabled: status.projectsEnabled, quality: status.quality } });
  useControls(() => ({ "Copy settings": button(async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify({ ...JSON.parse(settings), environmentRotationDegrees: [getEnvironment("x"), getEnvironment("y"), getEnvironment("z")] }));
      setMessage("Copied — paste these values into the chat.");
    } catch {
      setMessage("Could not copy settings. Check browser clipboard permissions.");
    }
  }), "Reset defaults": button(() => {
    setPerformance({ warmupSeconds: graphicsDefaults.warmupSeconds, fpsThreshold: graphicsDefaults.fpsThreshold, lowSeconds: graphicsDefaults.lowSeconds, showPerf: graphicsDefaults.showPerf });
    setEffects({ performanceMode: graphicsDefaults.mode, prismEnabled: true, waterEnabled: true, projectsEnabled: true });
    environmentRotationControl.current.setAxis(0, 0);
    environmentRotationControl.current.setAxis(1, 0);
    environmentRotationControl.current.setAxis(2, 0);
    setEnvironment({ x: 0, y: 0, z: 0, color: "#8b82aa", autoRotate: true });
    useGraphicsPerformance.setState((state) => ({ ...graphicsDefaults, fps: null, warmupRemaining: graphicsDefaults.warmupSeconds, belowSeconds: 0, measurementId: state.measurementId + 1 }));
  }) }), { store: levaStore }, [settings]);
  return (
    <>
      <LevaPanel store={levaStore} titleBar={{ title: "Home · Debug" }} collapsed={false} />
      <p className="sr-only" role="status">{message}</p>
    </>
  );
}
