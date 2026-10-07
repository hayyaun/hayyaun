"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { portraitClips, type PortraitDirection, type PortraitPhase } from "@/lib/portrait-motion";

export default function PortraitPlayer({ direction }: { direction: PortraitDirection | null }) {
  const frame = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const snapshot = useRef<HTMLCanvasElement>(null);
  const requested = useRef(direction);

  useEffect(() => {
    requested.current = direction;
  }, [direction]);

  useEffect(() => {
    const element = video.current;
    const container = frame.current;
    if (!element || !container) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    let visible = false;
    let disposed = false;
    let callback = 0;
    let active: PortraitDirection | null = null;
    let phase: PortraitPhase = "idle";
    let end: number = portraitClips.idle[1];

    function seek([start, finish]: readonly [number, number]) {
      if (!element) return;
      const canvas = snapshot.current;
      if (canvas && element.readyState >= 2) {
        canvas.getContext("2d")?.drawImage(element, 0, 0, 480, 576);
        canvas.setAttribute("data-visible", "true");
      }
      element.currentTime = start;
      end = finish;
    }

    function tick() {
      if (!element || disposed || !visible || reducedMotion.matches) return;
      const target = requested.current;
      if (!element.seeking) {
        snapshot.current?.removeAttribute("data-visible");
        if (phase === "idle" && target) {
          active = target;
          phase = "enter";
          seek(portraitClips[target].enter);
        } else if (phase === "hold" && target !== active && active) {
          phase = "exit";
          seek(portraitClips[active].exit);
        } else if (element.currentTime >= end - 0.04) {
          if (phase === "enter" && active) {
            phase = target === active ? "hold" : "exit";
            seek(portraitClips[active][phase]);
          } else if (phase === "hold" && active) {
            seek(portraitClips[active].hold);
          } else {
            active = null;
            phase = "idle";
            seek(portraitClips.idle);
          }
        }
      }
      // Speed up returns when someone moves between regions, retaining the real turn.
      element.playbackRate = phase === "exit" ? 1.6 : phase === "enter" ? 1.25 : 1;
      if (element.readyState >= 2) container?.setAttribute("data-playing", "true");
      callback = element.requestVideoFrameCallback(tick);
    }

    function updatePlayback() {
      if (!element) return;
      element.cancelVideoFrameCallback(callback);
      if (visible && !document.hidden && !reducedMotion.matches && !connection?.saveData) {
        if (!element.getAttribute("src")) {
          element.src = "/portrait/portrait.mp4";
          element.load();
        }
        void element
          .play()
          .then(() => {
            if (!disposed && visible && !document.hidden && !reducedMotion.matches) {
              callback = element.requestVideoFrameCallback(tick);
            } else element.pause();
          })
          .catch(() => container?.removeAttribute("data-playing"));
      } else {
        element.pause();
        if (reducedMotion.matches) container?.removeAttribute("data-playing");
      }
    }

    // Leave the still portrait in older browsers without video frame callbacks.
    if (typeof element.requestVideoFrameCallback !== "function") return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        updatePlayback();
      },
      { threshold: 0.08 }
    );
    observer.observe(container);
    reducedMotion.addEventListener("change", updatePlayback);
    document.addEventListener("visibilitychange", updatePlayback);
    return () => {
      disposed = true;
      observer.disconnect();
      reducedMotion.removeEventListener("change", updatePlayback);
      document.removeEventListener("visibilitychange", updatePlayback);
      element.cancelVideoFrameCallback(callback);
      element.pause();
    };
  }, []);

  return (
    <div className="portrait-media" ref={frame}>
      <Image
        src="/portrait/poster.webp"
        alt="Hayyaun standing with his arms folded"
        width={480}
        height={576}
        sizes="(max-width: 700px) 280px, 380px"
        className="portrait-still"
      />
      <video
        ref={video}
        className="portrait-video"
        width={480}
        height={576}
        muted
        playsInline
        preload="none"
        aria-hidden="true"
      />
      <canvas ref={snapshot} className="portrait-snapshot" width={480} height={576} aria-hidden="true" />
    </div>
  );
}
