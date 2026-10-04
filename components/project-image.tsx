"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import type { ProjectImageRenderer } from "@/lib/project-image-renderer";
import { performanceModeConfig, useGraphicsPerformance } from "@/lib/graphics-performance";

type ProjectImageProps = {
  src: string;
  previewSrc: string;
  alt: string;
  width: number;
  height: number;
  coverPositionY?: number;
};

/** HTML images are the baseline; a short, on-demand shader enhances the swap. */
export default function ProjectImage({ src, previewSrc, alt, width, height, coverPositionY = 0.5 }: ProjectImageProps) {
  const lowPerformance = useGraphicsPerformance(
    (state) => !performanceModeConfig[state.mode].projects || !state.projectsEnabled
  );
  const host = useRef<HTMLDivElement>(null);
  const cover = useRef<HTMLImageElement>(null);
  const preview = useRef<HTMLImageElement>(null);
  const surface = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const element = host.current;
    const coverImage = cover.current;
    const previewImage = preview.current;
    const canvas = surface.current;
    const card = element?.closest("article");
    if (!element || !coverImage || !previewImage || !canvas || !card) return;
    if (lowPerformance) {
      const loaded = () => {
        if (previewImage.complete && previewImage.naturalWidth) element.dataset.previewReady = "true";
      };
      loaded();
      previewImage.addEventListener("load", loaded);
      return () => {
        previewImage.removeEventListener("load", loaded);
        delete element.dataset.previewReady;
      };
    }

    const motion = matchMedia("(prefers-reduced-motion: no-preference) and (forced-colors: none)");
    const hover = matchMedia("(hover: hover) and (pointer: fine)");
    let renderer: ProjectImageRenderer | null = null;
    let disposed = false;
    let failed = false;
    let preparing = false;
    let visible = false;
    let hovered = hover.matches && card.matches(":hover");
    let focused = card.matches(":focus-within");
    let frame = 0;
    let previousTime = 0;
    let progress = 0;
    let originX = 0.5;
    let originY = 0.5;

    const target = () => (hovered || focused ? 1 : 0);
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      previousTime = 0;
      progress = target();
      canvas.hidden = true;
    };
    const disable = () => {
      stop();
      failed = true;
      renderer?.dispose();
      renderer = null;
      delete element.dataset.shaderReady;
    };
    const size = () => {
      const rect = element.getBoundingClientRect();
      renderer?.resize(rect.width, rect.height, window.devicePixelRatio || 1);
    };
    const draw = (time: number) => {
      frame = 0;
      if (!renderer || !motion.matches || !visible || document.hidden) {
        stop();
        return;
      }
      const delta = previousTime ? Math.min(time - previousTime, 50) : 16;
      previousTime = time;
      const destination = target();
      progress = destination ? Math.min(1, progress + delta / 850) : Math.max(0, progress - delta / 700);
      try {
        renderer.render(progress * progress * (3 - 2 * progress), originX, originY);
      } catch {
        disable();
        return;
      }
      if (progress !== destination) frame = requestAnimationFrame(draw);
      else stop();
    };
    const animate = () => {
      if (!renderer || !motion.matches || !visible || document.hidden) return;
      if (!frame && progress !== target()) {
        try {
          size();
          // Paint the existing state before showing the canvas to avoid a flash.
          renderer.render(progress * progress * (3 - 2 * progress), originX, originY);
          canvas.hidden = false;
          frame = requestAnimationFrame(draw);
        } catch {
          disable();
        }
      }
    };
    const prepare = async () => {
      if (disposed || failed || preparing || renderer || !visible || !motion.matches || !hover.matches) return;
      if (!coverImage.complete || !coverImage.naturalWidth || !previewImage.complete || !previewImage.naturalWidth)
        return;
      preparing = true;
      try {
        const { createProjectImageRenderer } = await import("@/lib/project-image-renderer");
        if (disposed || !visible || !motion.matches) return;
        renderer = createProjectImageRenderer(canvas, coverImage, previewImage, coverPositionY);
        if (!renderer) {
          failed = true;
          return;
        }
        size();
        progress = target();
        renderer.render(progress, originX, originY);
        element.dataset.shaderReady = "true";
      } catch {
        disable();
      } finally {
        preparing = false;
      }
    };
    const loaded = () => {
      if (previewImage.complete && previewImage.naturalWidth) element.dataset.previewReady = "true";
      void prepare();
    };
    const enter = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || !hover.matches) return;
      const rect = element.getBoundingClientRect();
      // Keep the reveal origin fixed throughout quick enter/leave reversals.
      if (!frame) {
        originX = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
        originY = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
      }
      hovered = true;
      animate();
      void prepare();
    };
    const leave = () => {
      hovered = false;
      animate();
    };
    const focus = () => {
      focused = true;
      animate();
    };
    const blur = (event: FocusEvent) => {
      if (event.relatedTarget instanceof Node && card.contains(event.relatedTarget)) return;
      focused = false;
      animate();
    };
    const preferences = () => {
      hovered = hover.matches && card.matches(":hover");
      stop();
      void prepare();
    };
    const visibility = () => {
      if (document.hidden) stop();
    };
    const contextLost = () => {
      stop();
      failed = true;
      renderer = null;
      delete element.dataset.shaderReady;
    };
    const intersection = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) void prepare();
        else stop();
      },
      { rootMargin: "120px" }
    );
    const resize = new ResizeObserver(() => {
      stop();
      size();
    });
    intersection.observe(element);
    resize.observe(element);
    coverImage.addEventListener("load", loaded);
    previewImage.addEventListener("load", loaded);
    canvas.addEventListener("webglcontextlost", contextLost);
    card.addEventListener("pointerenter", enter);
    card.addEventListener("pointerleave", leave);
    card.addEventListener("focusin", focus);
    card.addEventListener("focusout", blur);
    motion.addEventListener("change", preferences);
    hover.addEventListener("change", preferences);
    document.addEventListener("visibilitychange", visibility);
    loaded();

    return () => {
      disposed = true;
      stop();
      intersection.disconnect();
      resize.disconnect();
      coverImage.removeEventListener("load", loaded);
      previewImage.removeEventListener("load", loaded);
      canvas.removeEventListener("webglcontextlost", contextLost);
      card.removeEventListener("pointerenter", enter);
      card.removeEventListener("pointerleave", leave);
      card.removeEventListener("focusin", focus);
      card.removeEventListener("focusout", blur);
      motion.removeEventListener("change", preferences);
      hover.removeEventListener("change", preferences);
      document.removeEventListener("visibilitychange", visibility);
      renderer?.dispose();
      delete element.dataset.shaderReady;
      delete element.dataset.previewReady;
    };
  }, [src, previewSrc, coverPositionY, lowPerformance]);

  return (
    <div className="project-visual" ref={host}>
      <Image
        ref={cover}
        src={src}
        alt={alt}
        width={width}
        height={height}
        sizes="(max-width: 700px) 90vw, 65vw"
        className="project-image"
        style={{ objectPosition: `center ${coverPositionY * 100}%` }}
      />
      <Image
        ref={preview}
        src={previewSrc}
        alt=""
        aria-hidden="true"
        fill
        sizes="(max-width: 700px) 90vw, 65vw"
        className="project-preview"
      />
      <canvas ref={surface} className="project-transition" aria-hidden="true" hidden />
    </div>
  );
}
