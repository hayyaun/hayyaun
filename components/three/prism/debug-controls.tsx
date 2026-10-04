"use client";

import { button, LevaPanel, useControls, useCreateStore } from "leva";
import { Component, type ReactNode, useEffect, useState } from "react";
import Scene, { type EnvironmentRotationControl } from "./scene";
import { createPortal } from "react-dom";
import { graphicsDefaults, performanceModeConfig, performanceModes, setPerformanceMode, useGraphicsPerformance, type PerformanceMode } from "@/lib/graphics-performance";

class CanvasBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div role="alert" className="p-8 text-gray-700">
        <p>The browser blocked WebGL after a graphics context loss. Your controls are still available.</p>
        <p>Copy your settings, then close this tab and reopen the lab. If it remains blocked, restart the browser.</p>
      </div>
    ) : (
      this.props.children
    );
  }
}
export default function LabControls({ landing = false, active = true }: { landing?: boolean; active?: boolean }) {
  useEffect(() => () => useGraphicsPerformance.setState({ showPerf: false }), []);
  const lowPerformance = useGraphicsPerformance((state) => !performanceModeConfig[state.mode].prism || !state.prismEnabled);
  const status = useGraphicsPerformance();
  const levaStore = useCreateStore();
  const [environmentRotationControl] = useState<{ current: EnvironmentRotationControl }>(() => {
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
  });
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
  const [environment, setEnvironment, getEnvironment] = useControls(
    "Prism environment",
    () => ({
      autoRotate: { value: landing, label: "Auto rotate" },
      x: { value: 0, min: -180, max: 180, step: 0.1, label: "X rotation (°)", onChange: (value: number, _path: string, context: { fromPanel: boolean }) => updateRotation(0, value, context) },
      y: { value: 0, min: -180, max: 180, step: 0.1, label: "Y rotation (°)", onChange: (value: number, _path: string, context: { fromPanel: boolean }) => updateRotation(1, value, context) },
      z: { value: 0, min: -180, max: 180, step: 0.1, label: "Z rotation (°)", onChange: (value: number, _path: string, context: { fromPanel: boolean }) => updateRotation(2, value, context) },
      color: { value: "#8b82aa", label: "Prism color" },
    }),
    { collapsed: true, order: 3 },
    { store: levaStore }
  );
  const { color, autoRotate } = environment;
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
    setStatus({ fps: !performanceModeConfig[status.mode].monitor ? "Monitoring stopped" : status.fps === null ? "Warming up" : String(status.fps), warmup: `Remaining: ${status.warmupRemaining} seconds`, below: `Duration: ${status.belowSeconds} seconds`, reason: status.mode });
  }, [status.fps, status.warmupRemaining, status.belowSeconds, status.mode, setStatus]);
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
    setEnvironment({ x: 0, y: 0, z: 0, color: "#8b82aa", autoRotate: landing });
    useGraphicsPerformance.setState((state) => ({ ...graphicsDefaults, fps: null, warmupRemaining: graphicsDefaults.warmupSeconds, belowSeconds: 0, measurementId: state.measurementId + 1 }));
  }) }), { store: levaStore }, [settings]);
  return (
    <>
      <div style={{ width: landing ? "100%" : "min(100%, 960px)", height: landing ? "100%" : "min(100%, 867px)", margin: "auto" }}>
        {active && !lowPerformance && <CanvasBoundary>
          <Scene presentation tuning debug pointerMotion={landing} autoRotate={autoRotate} environmentRotationControl={environmentRotationControl} prismColor={color} />
        </CanvasBoundary>}
      </div>
      {createPortal(
        (
          <>
            <LevaPanel store={levaStore} titleBar={{ title: landing ? "Landing prism · Debug" : "Prism lab" }} collapsed={false} />
            <p className="sr-only" role="status">{message}</p>
          </>
        ),
        document.body
      )}
    </>
  );
}

