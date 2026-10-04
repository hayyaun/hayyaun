"use client";

import { useId, useState } from "react";

export function LayoutExperiment() {
  const [width, setWidth] = useState(100);
  const id = useId();
  return (
    <div className="experiment">
      <p className="experiment-label">Try it / Intrinsic layout</p>
      <label htmlFor={id}>Container width: {width}%</label>
      <input id={id} type="range" min="45" max="100" value={width} onChange={(event) => setWidth(Number(event.target.value))} />
      <div className="layout-preview" style={{ width: `${width}%` }}>
        {["Structure", "Content", "Interaction"].map((label) => (
          <div key={label}>{label}</div>
        ))}
      </div>
      <p>The cards wrap when their minimum width no longer fits. On a narrow screen, they remain in one column.</p>
    </div>
  );
}

function luminance(hex: string) {
  const channels = [1, 3, 5].map((start) => {
    const channel = parseInt(hex.slice(start, start + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

export function ContrastExperiment() {
  const [foreground, setForeground] = useState("#655c78");
  const [background, setBackground] = useState("#eee8f6");
  const id = useId();
  const values = [luminance(foreground), luminance(background)];
  const ratio = (Math.max(...values) + 0.05) / (Math.min(...values) + 0.05);
  return (
    <div className="experiment">
      <p className="experiment-label">Try it / Color contrast</p>
      <div className="color-controls">
        <label htmlFor={`${id}-text`}>
          Text <input id={`${id}-text`} type="color" value={foreground} onChange={(event) => setForeground(event.target.value)} />
          <code>{foreground}</code>
        </label>
        <label htmlFor={`${id}-surface`}>
          Surface <input id={`${id}-surface`} type="color" value={background} onChange={(event) => setBackground(event.target.value)} />
          <code>{background}</code>
        </label>
      </div>
      <div className="contrast-preview" style={{ color: foreground, background }}>
        Good interfaces make room for the reader.
      </div>
      <output aria-live="polite">
        {ratio.toFixed(2)}:1 — {ratio >= 4.5 ? "Passes AA for normal text" : "Below AA for normal text"}
      </output>
      <p>For opaque, solid sRGB colors. The verdict uses the unrounded ratio; gradients and transparency need additional checks.</p>
    </div>
  );
}

export function MotionExperiment() {
  const [duration, setDuration] = useState(400);
  const [easing, setEasing] = useState("ease-out");
  const [moved, setMoved] = useState(false);
  const id = useId();
  return (
    <div className="experiment">
      <p className="experiment-label">Try it / Timing & easing</p>
      <label htmlFor={`${id}-duration`}>Duration: {duration} ms</label>
      <input id={`${id}-duration`} type="range" min="100" max="1200" step="50" value={duration} onChange={(event) => setDuration(Number(event.target.value))} />
      <label htmlFor={`${id}-easing`}>Easing</label>
      <select id={`${id}-easing`} value={easing} onChange={(event) => setEasing(event.target.value)}>
        <option value="linear">Linear</option>
        <option value="ease-out">Ease out</option>
        <option value="ease-in-out">Ease in and out</option>
      </select>
      <div className="motion-track" aria-hidden="true">
        <span style={{ left: moved ? "calc(100% - 40px)" : "0", transitionDuration: `${duration}ms`, transitionTimingFunction: easing }} />
      </div>
      <button className="site-button" type="button" onClick={() => setMoved(!moved)}>
        Move to the {moved ? "start" : "end"}
      </button>
      <p role="status">Position: {moved ? "end" : "start"}. Your system’s reduced-motion preference removes the transition.</p>
    </div>
  );
}

export function PixelBudgetExperiment() {
  const [dpr, setDpr] = useState(1.5);
  const id = useId();
  return (
    <div className="experiment">
      <p className="experiment-label">Try it / Pixel budget</p>
      <label htmlFor={id}>Device pixel ratio: {dpr.toFixed(2)}</label>
      <input id={id} type="range" min="1" max="3" step="0.25" value={dpr} onChange={(event) => setDpr(Number(event.target.value))} />
      <output aria-live="polite">{Math.round(800 * 450 * dpr * dpr).toLocaleString("en-US")} pixels / frame</output>
      <div className="pixel-meter" aria-hidden="true">
        <span style={{ width: `${((dpr * dpr) / 9) * 100}%` }} />
      </div>
      <p>
        An 800 × 450 CSS-pixel canvas at {dpr.toFixed(2)}× density has {Math.round(800 * dpr)} × {Math.round(450 * dpr)} drawing-buffer pixels (dimensions rounded). Pixel count scales with density squared. This is a sizing model, not a GPU benchmark.
      </p>
    </div>
  );
}
