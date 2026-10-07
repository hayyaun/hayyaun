export type PortraitDirection = "left" | "middle" | "right";
export type PortraitPose = "idle" | PortraitDirection;

// Prepared loops need no timeline scrubbing or queued head turns.
export const portraitPoses: readonly PortraitPose[] = ["idle", "left", "middle", "right"];
export const portraitAssetBase = "/portrait/v2";
