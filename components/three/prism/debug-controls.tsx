"use client";

import { button, LevaPanel, useControls, useCreateStore } from "leva";
import { Component, type ReactNode, useEffect, useState } from "react";
import Scene from "./scene";
import { createPortal } from "react-dom";
import { BlendFunction } from "postprocessing";

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
export default function LabControls({ landing = false }: { landing?: boolean }) {
  const [debugOpen, setDebugOpen] = useState(false);
  const levaStore = useCreateStore();
  const { x, y, z, color, autoRotate } = useControls(
    "Prism environment",
    {
      autoRotate: { value: landing, label: "Auto rotate" },
      x: { value: 0, min: -180, max: 180, step: 0.1, label: "X rotation (°)" },
      y: { value: 0, min: -180, max: 180, step: 0.1, label: "Y rotation (°)" },
      z: { value: 0, min: -180, max: 180, step: 0.1, label: "Z rotation (°)" },
      color: { value: "#8b82aa", label: "Prism color" },
    },
    { store: levaStore }
  );
  const { noiseEnabled, noiseOpacity, noisePremultiply, noiseBlend } = useControls(
    "Noise",
    {
      noiseEnabled: { value: !landing, label: "Enabled" },
      noiseOpacity: { value: 0.08, min: 0, max: 1, step: 0.01, label: "Strength" },
      noisePremultiply: { value: false, label: "Premultiply" },
      noiseBlend: { value: BlendFunction.NORMAL, options: { Normal: BlendFunction.NORMAL, Screen: BlendFunction.SCREEN, "Soft light": BlendFunction.SOFT_LIGHT, Add: BlendFunction.ADD }, label: "Blend mode" },
    },
    { store: levaStore }
  );
  useEffect(() => {
    function handleDebugTools(event: Event) {
      setDebugOpen((event as CustomEvent<boolean>).detail);
    }
    window.addEventListener("hayyaun:debug-tools", handleDebugTools);
    return () => window.removeEventListener("hayyaun:debug-tools", handleDebugTools);
  }, []);
  const [message, setMessage] = useState("");
  const settings = JSON.stringify({ environmentRotationDegrees: [x, y, z], prismColor: color, noise: { enabled: noiseEnabled, opacity: noiseOpacity, premultiply: noisePremultiply, blendFunction: noiseBlend } });
  useControls(() => ({ "Copy settings": button(async () => {
    try {
      await navigator.clipboard.writeText(settings);
      setMessage("Copied — paste these values into the chat.");
    } catch {
      setMessage("Could not copy settings. Check browser clipboard permissions.");
    }
  }) }), { store: levaStore }, [settings]);
  return (
    <>
      <div style={{ width: landing ? "100%" : "min(100%, 960px)", height: landing ? "100%" : "min(100%, 867px)", margin: "auto" }}>
        <CanvasBoundary>
          <Scene presentation tuning grain={noiseEnabled} grainOpacity={noiseOpacity} grainPremultiply={noisePremultiply} grainBlend={noiseBlend} pointerMotion={landing} autoRotate={autoRotate} environmentRotation={[x, y, z]} prismColor={color} />
        </CanvasBoundary>
      </div>
      {createPortal(
        debugOpen ? (
          <>
            <LevaPanel store={levaStore} titleBar={{ title: landing ? "Landing prism · Dev" : "Prism lab" }} collapsed={false} />
            <p className="sr-only" role="status">{message}</p>
          </>
        ) : null,
        document.body
      )}
    </>
  );
}

