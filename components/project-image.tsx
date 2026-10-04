"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
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
  const host = useRef<HTMLButtonElement>(null);
  const [touchPreview, setTouchPreview] = useState(false);
  const tapped = useRef(false);
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
    const motion = matchMedia("(prefers-reduced-motion: no-preference) and (forced-colors: none)");
    const hover = matchMedia("(hover: hover) and (pointer: fine)");
    let renderer: ProjectImageRenderer | null = null;
    let disposed = false;
    let failed = false;
    let preparing = false;
    let visible = false;
    let hovered = hover.matches && card.matches(":hover");
    let focused = !!document.activeElement?.matches(":focus-visible") && card.contains(document.activeElement) && !element.contains(document.activeElement);
    let frame = 0;
    let previousTime = 0;
    let progress = 0;
    let originX = 0.5;
    let originY = 0.5;

    const target = () => (hovered || tapped.current || focused ? 1 : 0);
    let contact: { id: number; x: number; y: number; time: number; inside: boolean } | null = null;
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
      if (lowPerformance || disposed || failed || preparing || renderer || !visible || !motion.matches) return;
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
        // Preserve the pre-tap state if the renderer loads during an interaction.
        renderer.render(progress, originX, originY);
        element.dataset.shaderReady = "true";
        animate();
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
    const focus = (event: FocusEvent) => {
      // The image button has its own toggle; focus on the website link still previews.
      focused = event.target instanceof Element && event.target.matches(":focus-visible") && !element.contains(event.target);
      animate();
      void prepare();
    };
    const blur = (event: FocusEvent) => {
      if (event.relatedTarget instanceof Node && card.contains(event.relatedTarget)) return;
      focused = false;
      animate();
    };
    const toggle = (clientX?: number, clientY?: number) => {
      const rect = element.getBoundingClientRect();
      if (!frame) {
        originX = clientX === undefined ? 0.5 : Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        originY = clientY === undefined ? 0.5 : Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
      }
      tapped.current = !tapped.current;
      setTouchPreview(tapped.current);
      animate();
      void prepare();
    };
    const pointerDown = (event: PointerEvent) => {
      if (event.pointerType !== "touch") return;
      // A second contact cancels the gesture; do not capture or prevent scrolling.
      if (!event.isPrimary || contact) { contact = null; return; }
      const inside = event.target instanceof Node && element.contains(event.target);
      if (!inside && !tapped.current) return;
      contact = { id: event.pointerId, x: event.clientX, y: event.clientY, time: event.timeStamp, inside };
    };
    const pointerMove = (event: PointerEvent) => {
      if (contact?.id === event.pointerId && Math.hypot(event.clientX - contact.x, event.clientY - contact.y) > 10) contact = null;
    };
    const pointerUp = (event: PointerEvent) => {
      const start = contact;
      contact = null;
      if (event.pointerType !== "touch" || !start || start.id !== event.pointerId ||
          event.timeStamp - start.time > 500 || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10) return;
      const inside = event.target instanceof Node && element.contains(event.target);
      if (start.inside && inside) toggle(event.clientX, event.clientY);
      else if (!start.inside && !inside && tapped.current) {
        tapped.current = false;
        setTouchPreview(false);
        animate();
      }
    };
    const cancelContact = () => { contact = null; };
    const click = (event: MouseEvent) => {
      // Keyboard/assistive activation only. Touch compatibility clicks must not toggle twice.
      if (event.detail === 0) toggle();
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
    document.addEventListener("pointerdown", pointerDown, { passive: true });
    document.addEventListener("pointermove", pointerMove, { passive: true });
    document.addEventListener("pointerup", pointerUp, { passive: true });
    document.addEventListener("pointercancel", cancelContact);
    element.addEventListener("click", click);
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
      document.removeEventListener("pointerdown", pointerDown);
      document.removeEventListener("pointermove", pointerMove);
      document.removeEventListener("pointerup", pointerUp);
      document.removeEventListener("pointercancel", cancelContact);
      element.removeEventListener("click", click);
      motion.removeEventListener("change", preferences);
      hover.removeEventListener("change", preferences);
      document.removeEventListener("visibilitychange", visibility);
      renderer?.dispose();
      delete element.dataset.shaderReady;
      delete element.dataset.previewReady;
    };
  }, [src, previewSrc, coverPositionY, lowPerformance]);

  return (
    <button
      type="button"
      className="project-visual"
      ref={host}
      aria-label={`Toggle website screenshot: ${alt}`}
      aria-pressed={touchPreview}
      data-tap-preview={touchPreview ? "true" : undefined}
    >
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
    </button>
  );
}
