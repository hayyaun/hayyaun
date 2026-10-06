"use client";

import { useThree } from "@react-three/fiber";
import { useEffect, useRef, type RefObject } from "react";
import { prismInitialEnvironmentRotation, type EnvironmentRotationControl } from "@/lib/prism-debug";
import type { SurfaceActivity } from "./surface-smoke";

export default function EnvironmentMotion({
  active,
  autoRotate,
  rotationControl,
  surfaceActivity,
}: {
  active: boolean;
  autoRotate: boolean;
  rotationControl?: RefObject<EnvironmentRotationControl>;
  surfaceActivity: SurfaceActivity;
}) {
  const { scene, invalidate, gl } = useThree();
  const automaticAngle = useRef(prismInitialEnvironmentRotation[1]);
  useEffect(() => {
    if (!active) return;
    let angle = automaticAngle.current;
    let targetX = 0,
      targetY = 0,
      currentX = 0,
      currentY = 0;
    let lastPointerMove = -Infinity;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let last = performance.now();
    let contextLost = false;
    const apply = () => {
      const base = (rotationControl?.current.getDegrees() ?? [0, 0, 0]).map((value) => (value * Math.PI) / 180);
      scene.environmentRotation.set(base[0] + currentY * 0.2, base[1] + angle + currentX * 0.3, base[2]);
      rotationControl?.current.reportRotation(
        [scene.environmentRotation.x, scene.environmentRotation.y, scene.environmentRotation.z].map(
          (value) => (((((value * 180) / Math.PI + 180) % 360) + 360) % 360) - 180
        ) as [number, number, number]
      );
      invalidate();
    };
    const unsubscribeRotation = rotationControl?.current.subscribe(apply);
    const tick = () => {
      timer = undefined;
      if (document.hidden || contextLost) return;
      const now = performance.now();
      if (now - lastPointerMove > 700) {
        targetX = 0;
        targetY = 0;
      }
      const delta = Math.min((now - last) / 1000, 0.1);
      last = now;
      if (autoRotate) angle = (angle + (delta * Math.PI * 2) / 180) % (Math.PI * 2);
      automaticAngle.current = angle;
      const blend = 1 - Math.exp(-delta * 2);
      currentX += (targetX - currentX) * blend;
      currentY += (targetY - currentY) * blend;
      apply();
      if (
        autoRotate ||
        surfaceActivity.getUntil() > now / 1000 ||
        now - lastPointerMove <= 700 ||
        Math.abs(targetX - currentX) + Math.abs(targetY - currentY) > 0.001
      ) {
        timer = setTimeout(tick, 1000 / 30);
      }
    };
    const resume = () => {
      clearTimeout(timer);
      timer = undefined;
      last = performance.now();
      if (!document.hidden && !contextLost) {
        // Refresh immediately on visibility restoration instead of waiting for a tick.
        invalidate();
        timer = setTimeout(tick, 1000 / 30);
      }
    };
    // Hover only wakes this existing clock; it cannot create another render loop.
    const wake = () => {
      if (timer === undefined && !document.hidden && !contextLost) {
        last = performance.now();
        timer = setTimeout(tick, 1000 / 30);
      }
    };
    const unsubscribeSurface = surfaceActivity.subscribe(wake);
    const move = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      lastPointerMove = performance.now();
      targetX = Math.max(-1, Math.min(1, 1 - (event.clientX / window.innerWidth) * 2)) * 0.18;
      targetY = Math.max(-1, Math.min(1, 1 - (event.clientY / window.innerHeight) * 2)) * 0.18;
      wake();
    };
    const lost = () => {
      contextLost = true;
      resume();
    };
    const restored = () => {
      contextLost = false;
      resume();
    };
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("pointermove", move, { passive: true });
    gl.domElement.addEventListener("webglcontextlost", lost);
    gl.domElement.addEventListener("webglcontextrestored", restored);
    apply();
    resume();
    return () => {
      unsubscribeRotation?.();
      unsubscribeSurface();
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("pointermove", move);
      gl.domElement.removeEventListener("webglcontextlost", lost);
      gl.domElement.removeEventListener("webglcontextrestored", restored);
    };
  }, [active, autoRotate, rotationControl, scene, invalidate, gl, surfaceActivity]);
  return null;
}
