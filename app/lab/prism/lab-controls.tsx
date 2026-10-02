"use client";

import { Leva, useControls } from "leva";
import { Component, type ReactNode, useState } from "react";
import Scene from "./scene";
import { createPortal } from "react-dom";

class CanvasBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <div role="alert" className="p-8 text-gray-700">
      <p>The browser blocked WebGL after a graphics context loss. Your controls are still available.</p>
      <p>Copy your settings, then close this tab and reopen the lab. If it remains blocked, restart the browser.</p>
    </div> : this.props.children;
  }
}
export default function LabControls({ landing = false }: { landing?: boolean }) {
  const { x, y, z, color } = useControls("Prism environment", {
    x: { value: 0, min: -180, max: 180, step: 0.1, label: "X rotation (°)" },
    y: { value: 0, min: -180, max: 180, step: 0.1, label: "Y rotation (°)" },
    z: { value: 0, min: -180, max: 180, step: 0.1, label: "Z rotation (°)" },
    color: { value: "#8b82aa", label: "Prism color" },
  });
  const [message, setMessage] = useState("");
  const settings = JSON.stringify({ environmentRotationDegrees: [x, y, z], prismColor: color });
  async function copySettings() {
    try {
      await navigator.clipboard.writeText(settings);
      setMessage("Copied — paste these values into the chat.");
    } catch {
      setMessage("Select and copy the values below.");
    }
  }
  return <>
    <div style={{ width: landing ? "100%" : "min(100%, 960px)", height: landing ? "100%" : "min(100%, 867px)", margin: "auto" }}><CanvasBoundary><Scene presentation tuning environmentRotation={[x, y, z]} prismColor={color} /></CanvasBoundary></div>
    {createPortal(<>
    <Leva titleBar={{ title: landing ? "Landing prism · Dev" : "Prism lab" }} collapsed={false} />
    <div style={{ position: "fixed", bottom: 24, right: 24, left: landing ? "auto" : 24, width: landing ? "min(360px, calc(100vw - 48px))" : undefined, zIndex: 1000 }} className="max-w-xl rounded-xl border border-gray-200 bg-white/95 p-4 text-sm text-gray-800">
      <p>Rotate the environment in degrees, then copy your preferred settings.</p>
      <input aria-label="Prism settings to share" readOnly value={settings} onFocus={(event) => event.currentTarget.select()} className="my-3 w-full rounded border border-gray-300 p-2 font-mono text-xs" />
      <button onClick={copySettings} className="rounded-full bg-black px-4 py-2 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600">Copy settings</button>
      <p role="status" className="mt-2">{message}</p>
    </div>
    </>, document.body)}
  </>;
}