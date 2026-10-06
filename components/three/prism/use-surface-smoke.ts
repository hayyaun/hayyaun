"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { Vector2, Vector3, type Intersection, type Mesh, type MeshPhysicalMaterial } from "three";
import { graphicsQuality, isPrismReady, useGraphicsPerformance } from "@/lib/graphics-performance";
import { compileSurfaceSmoke, SurfaceSmoke, type SurfaceActivity } from "./surface-smoke";

export function useSurfaceSmoke(
  body: RefObject<Mesh | null>,
  activity: SurfaceActivity,
  active: boolean,
  debug: boolean
) {
  const { camera, gl, invalidate, raycaster } = useThree();
  const quality = useGraphicsPerformance(graphicsQuality);
  const ready = useGraphicsPerformance(isPrismReady);
  const [smoke] = useState(() => new SurfaceSmoke());
  const input = useRef({
    x: 0,
    y: 0,
    pending: false,
    enabled: false,
    lastCast: -Infinity,
    touchId: null as number | null,
    tap: false,
    ambientEnabled: false,
    ambientStart: -Infinity,
    ambientX: 0,
    ambientY: 0,
  });
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
    let ambientTimer: ReturnType<typeof setTimeout> | undefined;
    const scheduleAmbient = (delay: number) => {
      clearTimeout(ambientTimer);
      if (!state.ambientEnabled) return;
      ambientTimer = setTimeout(() => {
        // Only enqueue a stroke here; raycasts use the existing scene clock.
        state.ambientStart = -1;
        state.ambientX = -0.42 + Math.random() * 0.12;
        state.ambientY = -0.3 + Math.random() * 0.1;
        buffer.breakStroke();
        activity.request(performance.now() / 1000 + 1.5);
        scheduleAmbient(3500 + Math.random() * 1500);
      }, delay);
    };
    const postponeAmbient = () => {
      state.ambientStart = -Infinity;
      buffer.breakStroke();
      scheduleAmbient(3500 + Math.random() * 1500);
    };
    const stop = () => {
      state.pending = false;
      state.touchId = null;
      state.tap = false;
      buffer.breakStroke();
    };
    const sync = () => {
      state.enabled = active && !document.hidden && !contextLost && !reduced.matches;
      state.ambientEnabled = active && ready && !document.hidden && !contextLost && !reduced.matches;
      state.ambientStart = -Infinity;
      scheduleAmbient(1800);
      stop();
      buffer.clear();
      activity.setUntil(0);
      if (!contextLost && !document.hidden) invalidate();
    };
    const move = (event: PointerEvent) => {
      if (
        !state.enabled ||
        (event.pointerType === "mouse" && !hover.matches) ||
        (event.pointerType === "touch" && event.pointerId !== state.touchId) ||
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
      // Separate autonomous and pointer strokes, without wiping visible mist.
      if (state.ambientStart !== -Infinity) buffer.breakStroke();
      state.ambientStart = -Infinity;
      scheduleAmbient(3500 + Math.random() * 1500);
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
    const drag = (event: PointerEvent) => {
      if (debug) {
        stop();
        postponeAmbient();
      } else if (state.enabled && event.pointerType === "touch" && event.isPrimary !== false) {
        state.touchId = event.pointerId;
        state.tap = true;
        buffer.breakStroke();
        move(event);
      }
    };
    const endTouch = (event: PointerEvent) => {
      if (event.pointerId !== state.touchId) return;
      state.touchId = null;
      // A quick tap can end before the next frame. Preserve its queued dab.
      if (!state.tap) state.pending = false;
      buffer.breakStroke();
    };
    const out = (event: PointerEvent) => {
      if (event.pointerType === "touch") endTouch(event);
      else stop();
    };
    sync();
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerout", out);
    window.addEventListener("pointerup", endTouch, { passive: true });
    window.addEventListener("pointercancel", stop, { passive: true });
    window.addEventListener("blur", stop);
    canvas.addEventListener("pointerdown", drag);
    canvas.addEventListener("webglcontextlost", lost);
    canvas.addEventListener("webglcontextrestored", restored);
    document.addEventListener("visibilitychange", sync);
    reduced.addEventListener("change", sync);
    hover.addEventListener("change", sync);
    return () => {
      buffer.clear();
      clearTimeout(ambientTimer);
      state.ambientEnabled = false;
      state.ambientStart = -Infinity;
      state.enabled = false;
      state.pending = false;
      state.touchId = null;
      state.tap = false;
      activity.setUntil(0);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerout", out);
      window.removeEventListener("pointerup", endTouch);
      window.removeEventListener("pointercancel", stop);
      window.removeEventListener("blur", stop);
      canvas.removeEventListener("pointerdown", drag);
      canvas.removeEventListener("webglcontextlost", lost);
      canvas.removeEventListener("webglcontextrestored", restored);
      document.removeEventListener("visibilitychange", sync);
      reduced.removeEventListener("change", sync);
      hover.removeEventListener("change", sync);
    };
  }, [active, activity, body, debug, gl, invalidate, ready, smoke]);

  useEffect(() => () => smoke.dispose(), [smoke]);

  useFrame(() => {
    const now = performance.now() / 1000;
    const state = input.current;
    const buffer = smoke;
    const mesh = body.current;
    if (buffer.uniforms.uSmokeCount.value === 0 && buffer.uniforms.uSmokeActive.value === 0) epoch.current = now;
    if (state.ambientEnabled && state.ambientStart !== -Infinity && mesh && now - state.lastCast >= 1 / 30) {
      if (state.ambientStart === -1) state.ambientStart = now;
      const t = (now - state.ambientStart) / 1.35;
      if (t > 1) {
        state.ambientStart = -Infinity;
        buffer.breakStroke();
      } else {
        state.lastCast = now;
        // Spread the mist across a wider curved region of the visible face.
        pointer.current.set(state.ambientX + t * 0.4, state.ambientY + t * 0.43 + Math.sin(t * Math.PI) * 0.06);
        camera.updateWorldMatrix(true, false);
        mesh.updateWorldMatrix(true, false);
        raycaster.setFromCamera(pointer.current, camera);
        hits.current.length = 0;
        raycaster.intersectObject(mesh, false, hits.current);
        const hit = hits.current[0];
        if (hit?.normal) {
          normal.current.copy(hit.normal).normalize();
          mesh.worldToLocal(hit.point);
          buffer.sample(hit.point, normal.current, now - epoch.current, 16, 0.95, true);
        } else buffer.breakStroke();
      }
    }
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
        const limit = quality === "low" ? 16 : quality === "medium" ? 24 : 32;
        if (state.tap) buffer.dab(hit.point, normal.current, now - epoch.current, limit);
        else buffer.sample(hit.point, normal.current, now - epoch.current, limit);
        if (state.tap && state.touchId === null) buffer.breakStroke();
      } else buffer.breakStroke();
      state.tap = false;
    }
    // Keep the fluid phase moving between gestures; only stroke ages reset to zero.
    const until = buffer.advance(now - epoch.current, now);
    activity.setUntil(
      Math.max(state.pending || state.ambientStart !== -Infinity ? now + 0.1 : 0, until ? until + epoch.current : 0)
    );
  });

  return useCallback<MeshPhysicalMaterial["onBeforeCompile"]>(
    (shader) => {
      compileSurfaceSmoke(shader, smoke.uniforms);
    },
    [smoke]
  );
}
