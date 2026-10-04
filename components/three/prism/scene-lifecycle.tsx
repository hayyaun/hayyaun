"use client";

import { useThree, useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { markPrismFailed } from "@/lib/graphics-performance";

export function ContextLifecycle({ onLost }: { onLost: (lost: boolean) => void }) {
  const { gl, invalidate } = useThree();
  useEffect(() => {
    const canvas = gl.domElement;
    const lost = (event: Event) => {
      event.preventDefault();
      onLost(true);
    };
    const restored = () => {
      onLost(false);
      invalidate();
    };
    canvas.addEventListener("webglcontextlost", lost);
    canvas.addEventListener("webglcontextrestored", restored);
    return () => {
      canvas.removeEventListener("webglcontextlost", lost);
      canvas.removeEventListener("webglcontextrestored", restored);
    };
  }, [gl, invalidate, onLost]);
  return null;
}

/** Reveal only after the environment exists, shaders compile, and complete frames render. */
export function SceneReadiness({ onReady }: { onReady: () => void }) {
  const { gl, scene, camera, invalidate } = useThree();
  const progress = useRef({ compiling: false, compiled: false, frames: 0, disposed: false, reveal: 0 });
  useEffect(() => {
    const state = progress.current;
    state.disposed = false;
    return () => {
      state.disposed = true;
      cancelAnimationFrame(state.reveal);
    };
  }, []);
  useFrame(() => {
    const state = progress.current;
    if (state.disposed || state.frames >= 2) return;
    if (!scene.environment) {
      invalidate();
      return;
    }
    if (!state.compiling) {
      state.compiling = true;
      void gl
        .compileAsync(scene, camera)
        .then(() => {
          if (state.disposed) return;
          state.compiled = true;
          invalidate();
        })
        .catch(() => {
          // Keep the static preview, but let the other effects be monitored.
          if (!state.disposed) markPrismFailed();
        });
    }
    if (!state.compiled) return;
    state.frames++;
    invalidate();
    if (state.frames === 2)
      state.reveal = requestAnimationFrame(() => {
        if (!state.disposed) onReady();
      });
  });
  return null;
}

export function SceneUnavailable() {
  useEffect(() => {
    markPrismFailed();
  }, []);
  return null;
}
