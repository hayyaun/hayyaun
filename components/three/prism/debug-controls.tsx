"use client";

import { LevaPanel, useControls, useCreateStore } from "leva";
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
  async function copySettings() {
    try {
      await navigator.clipboard.writeText(settings);
      setMessage("Copied — paste these values into the chat.");
    } catch {
      setMessage("Select and copy the values below.");
    }
  }
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
            <div style={{ position: "fixed", bottom: 24, right: 24, left: landing ? "auto" : 24, width: landing ? "min(360px, calc(100vw - 48px))" : undefined, zIndex: 1000 }} className="max-w-xl rounded-xl border border-gray-200 bg-white/95 p-4 text-sm text-gray-800">
              <p>Rotate the environment in degrees, then copy your preferred settings.</p>
              <input aria-label="Prism settings to share" readOnly value={settings} onFocus={(event) => event.currentTarget.select()} className="my-3 w-full rounded border border-gray-300 p-2 font-mono text-xs" />
              <button onClick={copySettings} className="rounded-full bg-black px-4 py-2 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600">
                Copy settings
              </button>
              <p role="status" className="mt-2">
                {message}
              </p>
            </div>
          </>
        ) : null,
        document.body
      )}
    </>
  );
}
