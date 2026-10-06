"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { Vector2, Vector3, type Intersection, type Mesh, type MeshPhysicalMaterial } from "three";
import { graphicsQuality, useGraphicsPerformance } from "@/lib/graphics-performance";
import { compileSurfaceSmoke, SurfaceSmoke, type SurfaceActivity } from "./surface-smoke";

export function useSurfaceSmoke(
  body: RefObject<Mesh | null>,
  activity: SurfaceActivity,
  active: boolean,
  debug: boolean
) {
  const { camera, gl, invalidate, raycaster } = useThree();
  const quality = useGraphicsPerformance(graphicsQuality);
  const [smoke] = useState(() => new SurfaceSmoke());
  const input = useRef({ x: 0, y: 0, pending: false, enabled: false, lastCast: -Infinity });
  const pointer = useRef(new Vector2());
  const normal = useRef(new Vector3());
  const hits = useRef<Intersection[]>([]);
  const epoch = useRef(0);

  useEffect(() => {
    const canvas = gl.domElement;
    const state = input.current;
    const buffer = smoke;
    const geometry = body.current?.geometry;
    if (geometry) {
      geometry.computeBoundingBox();
      if (geometry.boundingBox) buffer.setBounds(geometry.boundingBox);
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const hover = window.matchMedia("(any-hover: hover) and (any-pointer: fine)");
    let contextLost = gl.getContext().isContextLost();
    const stop = () => {
      state.pending = false;
      buffer.breakStroke();
    };
    const sync = () => {
      state.enabled = active && !document.hidden && !contextLost && !reduced.matches && hover.matches;
      stop();
      buffer.clear();
      activity.setUntil(0);
      if (!contextLost && !document.hidden) invalidate();
    };
    const move = (event: PointerEvent) => {
      if (
        !state.enabled ||
        event.pointerType === "touch" ||
        event.isPrimary === false ||
        event.target !== canvas ||
        (debug && event.buttons !== 0)
      ) {
        stop();
        return;
      }
      // Coalesce events. The raycast runs on the shared 30Hz scene clock, never here.
      state.x = event.clientX;
      state.y = event.clientY;
      state.pending = true;
      activity.request(performance.now() / 1000 + 0.1);
    };
    const lost = () => {
      contextLost = true;
      sync();
    };
    const restored = () => {
      contextLost = false;
      sync();
    };
    const drag = () => {
      if (debug) stop();
    };
    sync();
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerout", stop);
    window.addEventListener("blur", stop);
    canvas.addEventListener("pointerdown", drag);
    canvas.addEventListener("webglcontextlost", lost);
    canvas.addEventListener("webglcontextrestored", restored);
    document.addEventListener("visibilitychange", sync);
    reduced.addEventListener("change", sync);
    hover.addEventListener("change", sync);
    return () => {
      buffer.clear();
      state.enabled = false;
      state.pending = false;
      activity.setUntil(0);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerout", stop);
      window.removeEventListener("blur", stop);
      canvas.removeEventListener("pointerdown", drag);
      canvas.removeEventListener("webglcontextlost", lost);
      canvas.removeEventListener("webglcontextrestored", restored);
      document.removeEventListener("visibilitychange", sync);
      reduced.removeEventListener("change", sync);
      hover.removeEventListener("change", sync);
    };
  }, [active, activity, body, debug, gl, invalidate, smoke]);

  useEffect(() => () => smoke.dispose(), [smoke]);

  useFrame(() => {
    const now = performance.now() / 1000;
    const state = input.current;
    const buffer = smoke;
    const mesh = body.current;
    if (buffer.uniforms.uSmokeCount.value === 0 && buffer.uniforms.uSmokeActive.value === 0) epoch.current = now;
    if (state.enabled && state.pending && mesh && now - state.lastCast >= 1 / 30) {
      state.lastCast = now;
      state.pending = false;
      const bounds = gl.domElement.getBoundingClientRect();
      pointer.current.set(
        ((state.x - bounds.left) / bounds.width) * 2 - 1,
        1 - ((state.y - bounds.top) / bounds.height) * 2
      );
      camera.updateWorldMatrix(true, false);
      mesh.updateWorldMatrix(true, false);
      raycaster.setFromCamera(pointer.current, camera);
      hits.current.length = 0;
      // Drei's BVH uses this shared raycaster with firstHitOnly enabled.
      raycaster.intersectObject(mesh, false, hits.current);
      const hit = hits.current[0];
      if (hit?.normal) {
        // Three.js interpolates vertex normals here, keeping round corners continuous.
        normal.current.copy(hit.normal).normalize();
        mesh.worldToLocal(hit.point);
        buffer.sample(
          hit.point,
          normal.current,
          now - epoch.current,
          quality === "low" ? 16 : quality === "medium" ? 24 : 32
        );
      } else buffer.breakStroke();
    }
    // Keep the fluid phase moving between gestures; only stroke ages reset to zero.
    const until = buffer.advance(now - epoch.current, now);
    activity.setUntil(Math.max(state.pending ? now + 0.1 : 0, until ? until + epoch.current : 0));
  });

  return useCallback<MeshPhysicalMaterial["onBeforeCompile"]>(
    (shader) => {
      compileSurfaceSmoke(shader, smoke.uniforms);
    },
    [smoke]
  );
}
