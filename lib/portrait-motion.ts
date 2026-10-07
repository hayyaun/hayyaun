export type PortraitDirection = "left" | "middle" | "right";
export type PortraitPose = "idle" | PortraitDirection;

// Short recorded clips keep playback independent of the original long timeline.
export const portraitPoses: readonly PortraitPose[] = ["idle", "left", "middle", "right"];
export const portraitAssetBase = "/portrait/v2";

export type PortraitClip = PortraitPose | `${PortraitDirection}-${"in" | "out"}`;
type PortraitClipInfo = {
  id: PortraitClip;
  src: string;
  poster: string;
  loop: boolean;
  from: PortraitPose;
  to: PortraitPose;
};
export const portraitTurns: readonly PortraitClip[] = [
  "left-in",
  "left-out",
  "middle-in",
  "middle-out",
  "right-in",
  "right-out",
];
export const portraitClips = [...portraitPoses, ...portraitTurns].map((id): PortraitClipInfo => {
  const turn = id.includes("-");
  const direction = id.split("-")[0] as PortraitPose;
  const entering = id.endsWith("-in");
  return {
    id,
    src: turn ? `/portrait/turns/${id}.mp4` : `${portraitAssetBase}/${id}.mp4`,
    poster: `${portraitAssetBase}/${turn ? (entering ? "idle" : direction) : id}.webp`,
    loop: !turn,
    from: turn && entering ? "idle" : direction,
    to: turn && !entering ? "idle" : direction,
  };
});

export function nextPortraitClip(from: PortraitPose, desired: PortraitPose): PortraitClip {
  if (from === desired) return desired;
  if (from !== "idle") return `${from}-out`;
  return desired === "idle" ? "idle" : `${desired}-in`;
}
