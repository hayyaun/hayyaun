"use client";

import { EffectComposer, Noise } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";

export type NoiseBlend = "Normal" | "Screen" | "Soft light" | "Add";

const blendFunctions = { Normal: BlendFunction.NORMAL, Screen: BlendFunction.SCREEN, "Soft light": BlendFunction.SOFT_LIGHT, Add: BlendFunction.ADD };

export default function NoiseEffects({ opacity, premultiply, blendFunction = "Normal" }: { opacity: number; premultiply: boolean; blendFunction?: NoiseBlend }) {
  return (
    <EffectComposer multisampling={2} enableNormalPass={false}>
      <Noise opacity={opacity} premultiply={premultiply} blendFunction={blendFunctions[blendFunction]} />
    </EffectComposer>
  );
}
