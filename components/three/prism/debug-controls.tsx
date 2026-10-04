"use client";

import { button, LevaPanel, useControls, useCreateStore } from "leva";
import { Component, type ReactNode, useEffect, useState } from "react";
import Scene from "./scene";
import { createPortal } from "react-dom";
import { graphicsDefaults, performanceModes, setPerformanceMode, useGraphicsPerformance, type PerformanceMode } from "@/lib/graphics-performance";

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
  const lowPerformance = useGraphicsPerformance((state) => state.mode === "PRISM_PREVIEW" || state.mode === "WEBGL_DISABLED" || !state.prismEnabled);
  const status = useGraphicsPerformance();
  const levaStore = useCreateStore();
  const [, setPerformance] = useControls("Performance", () => ({
    warmupSeconds: { value: 5, min: 1, max: 60, step: 1, label: "Warmup seconds", onChange: (warmupSeconds: number) => useGraphicsPerformance.setState({ warmupSeconds }) },
    fpsThreshold: { value: 30, min: 5, max: 120, step: 1, label: "Minimum FPS", onChange: (fpsThreshold: number) => useGraphicsPerformance.setState({ fpsThreshold }) },
    lowSeconds: { value: 5, min: 1, max: 30, step: 1, label: "Seconds below FPS", onChange: (lowSeconds: number) => useGraphicsPerformance.setState({ lowSeconds }) },
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
  const [environment, setEnvironment] = useControls(
    "Prism environment",
    () => ({
      autoRotate: { value: landing, label: "Auto rotate" },
      x: { value: 0, min: -180, max: 180, step: 0.1, label: "X rotation (°)" },
      y: { value: 0, min: -180, max: 180, step: 0.1, label: "Y rotation (°)" },
      z: { value: 0, min: -180, max: 180, step: 0.1, label: "Z rotation (°)" },
      color: { value: "#8b82aa", label: "Prism color" },
    }),
    { collapsed: true, order: 3 },
    { store: levaStore }
  );
  const { x, y, z, color, autoRotate } = environment;
  const [, setStatus] = useControls("Status", () => ({
    fps: { value: "Warming up", editable: false, label: "Page FPS" },
    warmup: { value: "Remaining: 5 seconds", editable: false, label: "Warmup remaining" },
    below: { value: "Duration: 0 seconds", editable: false, label: "Below threshold" },
    reason: { value: "WebGL enabled", editable: false, label: "Mode" },
  }), { collapsed: false, order: 0 }, { store: levaStore });
  useEffect(() => {
    setStatus({ fps: status.mode === "WEBGL_DISABLED" ? "Monitoring stopped" : status.fps === null ? "Warming up" : String(status.fps), warmup: `Remaining: ${status.warmupRemaining} seconds`, below: `Duration: ${status.belowSeconds} seconds`, reason: status.mode });
  }, [status.fps, status.warmupRemaining, status.belowSeconds, status.mode, setStatus]);
  const [message, setMessage] = useState("");
  const settings = JSON.stringify({ environmentRotationDegrees: [x, y, z], prismColor: color, autoRotate, performance: { mode: status.mode, fpsThreshold: status.fpsThreshold, warmupSeconds: status.warmupSeconds, lowSeconds: status.lowSeconds, showPerf: status.showPerf }, effects: { prismEnabled: status.prismEnabled, waterEnabled: status.waterEnabled, projectsEnabled: status.projectsEnabled, quality: status.quality } });
  useControls(() => ({ "Copy settings": button(async () => {
    try {
      await navigator.clipboard.writeText(settings);
      setMessage("Copied — paste these values into the chat.");
    } catch {
      setMessage("Could not copy settings. Check browser clipboard permissions.");
    }
  }), "Reset defaults": button(() => {
    setPerformance({ warmupSeconds: 5, fpsThreshold: 30, lowSeconds: 5, showPerf: false });
    setEffects({ performanceMode: "HIGH_PERFORMANCE", prismEnabled: true, waterEnabled: true, projectsEnabled: true });
    setEnvironment({ x: 0, y: 0, z: 0, color: "#8b82aa", autoRotate: landing });
    useGraphicsPerformance.setState((state) => ({ ...graphicsDefaults, fps: null, warmupRemaining: 5, belowSeconds: 0, measurementId: state.measurementId + 1 }));
  }) }), { store: levaStore }, [settings]);
  return (
    <>
      <div style={{ width: landing ? "100%" : "min(100%, 960px)", height: landing ? "100%" : "min(100%, 867px)", margin: "auto" }}>
        {active && !lowPerformance && <CanvasBoundary>
          <Scene presentation tuning debug pointerMotion={landing} autoRotate={autoRotate} environmentRotation={[x, y, z]} prismColor={color} />
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

