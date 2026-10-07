export type PortraitDirection = "left" | "middle" | "right";
export type PortraitPhase = "idle" | "enter" | "hold" | "exit";

// Seconds in the processed clip (the source starts at 00:05).
// Each direction has a recorded turn, a blinking hold, and a return to camera.
export const portraitClips = {
  idle: [0.2, 4.0],
  left: { enter: [4.6, 5.6], hold: [5.6, 12.2], exit: [12.7, 13.8] },
  middle: { enter: [18.5, 19.8], hold: [19.8, 27.0], exit: [27.4, 28.7] },
  right: { enter: [33.4, 34.6], hold: [34.6, 42.6], exit: [43.0, 44.5] },
} as const;

export function portraitRegion(x: number, y: number): PortraitDirection | null {
  if (y > 0.64) return null;
  if (x < 0.35) return "left";
  if (x > 0.65) return "right";
  return y < 0.3 ? "middle" : null;
}
