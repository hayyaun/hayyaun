"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei/core/OrbitControls";
import { Suspense, useCallback, useLayoutEffect, useMemo, useState } from "react";
import {
  clearPrismReadiness,
  graphicsQuality,
  isPrismReady,
  markPrismFailed,
  markPrismLoading,
  markPrismReady,
  useGraphicsPerformance,
} from "@/lib/graphics-performance";
import { prismDefaults, usePrismDebug } from "@/lib/prism-debug";
import EnvironmentMotion from "./environment-motion";
import PrismModel from "./prism-model";
import { ContextLifecycle, SceneReadiness } from "./scene-lifecycle";
import { qualityPresets } from "./quality-presets";
import { smokeProgramKey, SurfaceActivity } from "./surface-smoke";

const cameraSettings = { position: [3.9, 1.6, 6.62] as [number, number, number], fov: 38 };

export default function Scene({ debug = false, active = true }: { debug?: boolean; active?: boolean }) {
  const quality = useGraphicsPerformance(graphicsQuality);
  const ready = useGraphicsPerformance(isPrismReady);
  const failed = useGraphicsPerformance((state) => state.prismFailed);
  const { color, autoRotate, environmentRotationControl } = usePrismDebug();
  const [lost, setLost] = useState(false);
  const [presented, setPresented] = useState(false);
  const [contextVersion, setContextVersion] = useState(0);
  const shaderVersion = smokeProgramKey();
  const surfaceActivity = useMemo(() => new SurfaceActivity(shaderVersion), [shaderVersion]);

  // Shader edits also compile afresh. Their compile pause must not count as slow GPU frames.
  useLayoutEffect(() => {
    markPrismLoading();
    return clearPrismReadiness;
  }, [quality, shaderVersion]);
  const sceneReady = useCallback(() => {
    if (surfaceActivity.version !== smokeProgramKey()) return;
    if (graphicsQuality(useGraphicsPerformance.getState()) !== quality) return;
    markPrismReady(quality);
    setPresented(true);
  }, [quality, surfaceActivity]);
  const contextChanged = useCallback((contextLost: boolean) => {
    setLost(contextLost);
    if (contextLost) {
      setPresented(false);
      markPrismFailed();
    } else {
      markPrismLoading();
      setContextVersion((version) => version + 1);
    }
  }, []);

  return (
    <div
      style={{ height: "100%", width: "100%", position: "relative" }}
      role="region"
      data-presented={presented && !lost && !failed}
      aria-label={
        debug
          ? "Interactive carbon-metal prism. Drag to orbit or pan."
          : "Carbon-metal prism. Move the pointer over its surface to reveal fading violet wisps."
      }
    >
      <Canvas
        flat
        // Mobile toolbar resizes can introduce fractional bounding-rect jitter.
        // Integer layout dimensions avoid clearing an unchanged drawing buffer.
        resize={{ scroll: false, offsetSize: true }}
        // Pause animation offscreen, but allow a resize/readiness refresh to draw.
        // Switching to "never" drops invalidations during mobile scroll re-entry.
        frameloop="demand"
        // Render at the selected quality, including supersampling on low-DPI screens.
        // A [min, max] range instead clamps the device DPR (1.1 on some desktop scales).
        dpr={qualityPresets[quality].dpr}
        camera={cameraSettings}
        // Readiness gates measurements; a quality refresh must not flash the preview.
        style={{ opacity: presented && !lost && !failed ? 1 : 0 }}
        gl={{ antialias: true, alpha: false, powerPreference: "low-power" }}
        onCreated={({ gl, camera }) => {
          camera.lookAt(0, 0, 0);
          gl.setClearColor("white", 1);
        }}
        fallback="Your browser does not support canvas. The static preview is shown instead."
      >
        <ContextLifecycle onLost={contextChanged} />
        {debug && (
          <OrbitControls
            enabled={active}
            makeDefault
            enablePan
            enableZoom={false}
            enableDamping
            minDistance={3.5}
            maxDistance={12}
            dampingFactor={0.08}
          />
        )}
        <Suspense fallback={null}>
          <PrismModel
            key={shaderVersion}
            active={active}
            debug={debug}
            activity={surfaceActivity}
            prismColor={debug ? color : prismDefaults.color}
          />
          {!lost && <SceneReadiness key={`${quality}-${contextVersion}-${shaderVersion}`} onReady={sceneReady} />}
          <EnvironmentMotion
            key={`environment-${shaderVersion}`}
            active={active && ready}
            surfaceActivity={surfaceActivity}
            autoRotate={debug ? autoRotate : prismDefaults.autoRotate}
            rotationControl={debug ? environmentRotationControl : undefined}
          />
        </Suspense>
      </Canvas>
      {failed && (
        <p role="status" className="absolute right-6 bottom-6 left-6 bg-white/90 p-3 text-sm text-gray-700">
          {lost
            ? "The graphics context was interrupted. Reload if it does not recover."
            : "The 3D preview is unavailable. The static preview is shown instead."}
        </p>
      )}
    </div>
  );
}
