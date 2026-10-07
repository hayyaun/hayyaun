"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { portraitAssetBase, portraitPoses, type PortraitDirection, type PortraitPose } from "@/lib/portrait-motion";

export default function PortraitPlayer({ direction }: { direction: PortraitDirection | null }) {
  const frame = useRef<HTMLDivElement>(null);
  const videos = useRef(new Map<PortraitPose, HTMLVideoElement>());
  const select = useRef<(pose: PortraitPose) => void>(() => {});
  const requested = useRef<PortraitPose>(direction ?? "idle");

  useEffect(() => {
    const container = frame.current;
    if (!container) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    const players = new Map(videos.current);
    const presented = new Set<PortraitPose>();
    const callbacks = new Map<PortraitPose, number>();
    const pending = new Set<PortraitPose>();
    let visible = false;
    let disposed = false;

    function allowed() {
      return !disposed && visible && !document.hidden && !reducedMotion.matches && !connection?.saveData;
    }

    function sync() {
      const animate = allowed();
      const pose = animate ? requested.current : "idle";
      container?.setAttribute("data-pose", pose);
      for (const [key, video] of players) {
        if (!animate || key !== pose) {
          video.pause();
          continue;
        }
        if (!video.getAttribute("src")) {
          video.src = `${portraitAssetBase}/${key}.mp4`;
          video.load();
        }
        if (pending.has(key)) continue;
        pending.add(key);
        void video
          .play()
          .then(() => {
            pending.delete(key);
            // Late play() results must never revive an old hover selection.
            if (!allowed() || requested.current !== key) {
              video.pause();
              return;
            }
            if (presented.has(key) || callbacks.has(key)) return;
            const ready = () => {
              callbacks.delete(key);
              presented.add(key);
              video.setAttribute("data-ready", "true");
            };
            if (typeof video.requestVideoFrameCallback === "function") {
              callbacks.set(key, video.requestVideoFrameCallback(ready));
            } else ready();
          })
          .catch((error: unknown) => {
            pending.delete(key);
            if (
              error instanceof DOMException &&
              error.name === "AbortError" &&
              allowed() &&
              requested.current === key
            ) {
              queueMicrotask(sync);
            }
          });
      }
    }

    select.current = (pose: PortraitPose) => {
      requested.current = pose;
      sync();
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (allowed()) {
          // Prime the short files once, so first hover has a buffered frame.
          for (const [key, video] of players) {
            if (!video.getAttribute("src")) {
              video.src = `${portraitAssetBase}/${key}.mp4`;
              video.load();
            }
          }
        }
        sync();
      },
      { threshold: 0.08 }
    );
    observer.observe(container);
    reducedMotion.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      disposed = true;
      select.current = () => {};
      observer.disconnect();
      reducedMotion.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
      for (const [key, video] of players) {
        const callback = callbacks.get(key);
        if (callback !== undefined) video.cancelVideoFrameCallback(callback);
        video.pause();
      }
    };
  }, []);

  useEffect(() => {
    select.current(direction ?? "idle");
  }, [direction]);

  return (
    <div className="portrait-media" ref={frame} data-pose="idle">
      {portraitPoses.map((pose) => (
        <div key={pose} className="portrait-pose" data-pose={pose}>
          <Image
            src={`${portraitAssetBase}/${pose}.webp`}
            alt={pose === "idle" ? "Hayyaun standing with his arms folded" : ""}
            width={960}
            height={1152}
            sizes="(max-width: 700px) 280px, 380px"
            className="portrait-still"
            unoptimized
          />
          <video
            ref={(element) => {
              if (element) videos.current.set(pose, element);
              else videos.current.delete(pose);
            }}
            className="portrait-video"
            width={960}
            height={1152}
            muted
            loop
            playsInline
            preload="auto"
            aria-hidden="true"
          />
        </div>
      ))}
    </div>
  );
}
