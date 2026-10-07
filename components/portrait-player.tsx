"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import {
  nextPortraitClip,
  portraitClips,
  type PortraitClip,
  type PortraitDirection,
  type PortraitPose,
} from "@/lib/portrait-motion";

export default function PortraitPlayer({ direction }: { direction: PortraitDirection | null }) {
  const frame = useRef<HTMLDivElement>(null);
  const videos = useRef(new Map<PortraitClip, HTMLVideoElement>());
  const select = useRef<(pose: PortraitPose) => void>(() => {});
  const requested = useRef<PortraitPose>(direction ?? "idle");

  useEffect(() => {
    const container = frame.current;
    if (!container) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    const players = new Map(videos.current);
    const clips = new Map(portraitClips.map((clip) => [clip.id, clip]));
    const callbacks = new Map<PortraitClip, number>();
    const pending = new Set<PortraitClip>();
    let active: PortraitClip = "idle";
    let visible = false;
    let disposed = false;

    function allowed() {
      return !disposed && visible && !document.hidden && !reducedMotion.matches && !connection?.saveData;
    }
    function load(key: PortraitClip, video: HTMLVideoElement) {
      if (!video.getAttribute("src")) {
        video.src = clips.get(key)!.src;
        video.load();
      }
    }
    function play(key: PortraitClip) {
      const video = players.get(key);
      if (!video || !allowed()) return;
      load(key, video);
      if (pending.has(key) || !video.paused) return;
      pending.add(key);
      void video
        .play()
        .then(() => {
          pending.delete(key);
          if (!allowed() || active !== key) {
            video.pause();
            return;
          }
          const ready = () => {
            callbacks.delete(key);
            if (!allowed() || active !== key) return;
            video.setAttribute("data-ready", "true");
            container?.setAttribute("data-pose", key);
          };
          // Keep the previous decoded frame visible until the next clip is ready.
          if (typeof video.requestVideoFrameCallback === "function") {
            if (!callbacks.has(key)) callbacks.set(key, video.requestVideoFrameCallback(ready));
          } else ready();
        })
        .catch((error: unknown) => {
          pending.delete(key);
          if (error instanceof DOMException && error.name === "AbortError" && allowed() && active === key) {
            queueMicrotask(sync);
          }
        });
    }
    function switchClip(key: PortraitClip) {
      const changed = active !== key;
      active = key;
      for (const [id, video] of players) {
        if (id === key) continue;
        video.pause();
        const callback = callbacks.get(id);
        if (callback !== undefined) {
          video.cancelVideoFrameCallback(callback);
          callbacks.delete(id);
        }
      }
      const video = players.get(key);
      // These are short buffered clips. Replaying a turn starts at its first frame.
      if (changed && video && video.readyState >= 1) video.currentTime = 0;
      play(key);
    }
    function sync() {
      if (!allowed()) {
        active = "idle";
        container?.setAttribute("data-pose", "idle");
        for (const video of players.values()) video.pause();
        return;
      }
      const clip = clips.get(active)!;
      // Finish the current recorded turn; only the latest requested target is retained.
      switchClip(clip.loop ? nextPortraitClip(clip.to, requested.current) : active);
    }
    const ended = new Map<PortraitClip, () => void>();
    for (const [key, video] of players) {
      const finish = () => {
        if (key !== active || !allowed()) return;
        switchClip(nextPortraitClip(clips.get(key)!.to, requested.current));
      };
      ended.set(key, finish);
      video.addEventListener("ended", finish);
    }
    select.current = (pose: PortraitPose) => {
      requested.current = pose;
      sync();
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (allowed()) for (const [key, video] of players) load(key, video);
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
        video.removeEventListener("ended", ended.get(key)!);
        video.pause();
      }
    };
  }, []);

  useEffect(() => {
    select.current(direction ?? "idle");
  }, [direction]);

  return (
    <div className="portrait-media" ref={frame} data-pose="idle">
      {portraitClips.map((clip) => (
        <div key={clip.id} className="portrait-pose" data-pose={clip.id}>
          <Image
            src={clip.poster}
            alt={clip.id === "idle" ? "Hayyaun standing with his arms folded" : ""}
            width={960}
            height={1152}
            sizes="(max-width: 700px) 280px, 380px"
            className="portrait-still"
            unoptimized
          />
          <video
            ref={(element) => {
              if (element) videos.current.set(clip.id, element);
              else videos.current.delete(clip.id);
            }}
            className="portrait-video"
            width={960}
            height={1152}
            muted
            loop={clip.loop}
            playsInline
            preload="auto"
            aria-hidden="true"
          />
        </div>
      ))}
    </div>
  );
}
