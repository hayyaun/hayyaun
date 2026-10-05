"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import type { ProjectImageRenderer } from "@/lib/project-image-renderer";
import { performanceModeConfig, useGraphicsPerformance } from "@/lib/graphics-performance";
import { acquireScrollIdle } from "@/lib/scroll-idle";

type ProjectImageProps = {
  href: string;
  src: string;
  previewSrc: string;
  alt: string;
  title: string;
  previewAlt: string;
  width: number;
  height: number;
  coverPositionY?: number;
};

/** HTML images are the baseline; a short, on-demand shader enhances the swap. */
export default function ProjectImage({
  href,
  src,
  previewSrc,
  alt,
  title,
  previewAlt,
  width,
  height,
  coverPositionY = 0.5,
}: ProjectImageProps) {
  const descriptionId = useId();
  const [showingPreview, setShowingPreview] = useState(false);
  const lowPerformance = useGraphicsPerformance(
    (state) => !performanceModeConfig[state.mode].projects || !state.projectsEnabled
  );
  const host = useRef<HTMLAnchorElement>(null);
  const cover = useRef<HTMLImageElement>(null);
  const preview = useRef<HTMLImageElement>(null);
  const surface = useRef<HTMLCanvasElement>(null);
  const touchClick = useRef<((event: React.MouseEvent<HTMLAnchorElement>) => void) | null>(null);

  useEffect(() => {
    const element = host.current;
    const coverImage = cover.current;
    const previewImage = preview.current;
    const canvas = surface.current;
    const card = element?.closest("article");
    if (!element || !coverImage || !previewImage || !canvas || !card) return;
    const motion = matchMedia("(prefers-reduced-motion: no-preference) and (forced-colors: none)");
    const hover = matchMedia("(hover: hover) and (pointer: fine)");
    const scrollIdle = acquireScrollIdle();
    const lifetime = new AbortController();
    let renderer: ProjectImageRenderer | null = null;
    let disposed = false;
    let failed = false;
    let preparing = false;
    let visible = false;
    let hovered = hover.matches && card.matches(":hover");
    let focused = !!document.activeElement?.matches(":focus-visible") && card.contains(document.activeElement);
    let frame = 0;
    let previousTime = 0;
    let progress = 0;
    let originX = 0.5;
    let originY = 0.5;
    let tapped = false;
    let touchActivation = false;
    let validTap = false;
    let contact: { id: number; x: number; y: number; time: number; inside: boolean } | null = null;

    const target = () => (hovered || focused || tapped ? 1 : 0);
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
      if (scrollIdle.isScrolling()) {
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
      setShowingPreview(!!target() && previewImage.complete && previewImage.naturalWidth > 0);
      if (!renderer || !motion.matches || !visible || document.hidden) return;
      if (scrollIdle.isScrolling()) {
        // A stationary mouse can enter a card as the page moves underneath it.
        // Keep the HTML swap available without starting a shader during momentum.
        // Finish at the HTML endpoint so settling cannot replay from an older
        // canvas frame and briefly flash the cover over an already shown preview.
        stop();
        return;
      }
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
      let prepared: ProjectImageRenderer | null = null;
      const run = <T,>(task: () => T) =>
        scrollIdle.run(() => {
            if (disposed || failed || !visible || !motion.matches)
            throw new DOMException("Project preparation cancelled", "AbortError");
          return task();
        }, lifetime.signal);
      try {
        const { createProjectImageRenderer } = await run(() => import("@/lib/project-image-renderer"));
        prepared = await createProjectImageRenderer(
          canvas,
          coverImage,
          previewImage,
          { run, signal: lifetime.signal },
          coverPositionY
        );
        if (!prepared) {
          failed = true;
          return;
        }
        await run(() => {
          renderer = prepared;
          size();
          // Cold interactions already use the HTML swap. Do not replay them
          // from the cover when asynchronous GPU preparation finishes.
          progress = target();
          renderer?.render(progress, originX, originY);
          element.dataset.shaderReady = "true";
        });
        prepared = null;
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) disable();
      } finally {
        prepared?.dispose();
        preparing = false;
        if (!disposed && !failed && visible && motion.matches && !renderer) void prepare();
      }
    };
    const loaded = () => {
      if (previewImage.complete && previewImage.naturalWidth) element.dataset.previewReady = "true";
      animate();
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
      focused = event.target instanceof Element && event.target.matches(":focus-visible");
      animate();
      void prepare();
    };
    const blur = (event: FocusEvent) => {
      if (event.relatedTarget instanceof Node && card.contains(event.relatedTarget)) return;
      focused = false;
      animate();
    };
    const pointerDown = (event: PointerEvent) => {
      const inside = event.target instanceof Node && element.contains(event.target);
      if (inside) touchActivation = event.pointerType === "touch";
      validTap = false;
      if (event.pointerType !== "touch") return;
      if (!event.isPrimary || contact) {
        contact = null;
        return;
      }
      if (!inside && !tapped) return;
      contact = { id: event.pointerId, x: event.clientX, y: event.clientY, time: event.timeStamp, inside };
    };
    const pointerMove = (event: PointerEvent) => {
      if (contact?.id === event.pointerId && Math.hypot(event.clientX - contact.x, event.clientY - contact.y) > 10)
        contact = null;
    };
    const pointerUp = (event: PointerEvent) => {
      const start = contact;
      contact = null;
      if (
        !start ||
        start.id !== event.pointerId ||
        event.timeStamp - start.time > 500 ||
        Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10
      )
        return;
      const inside = event.target instanceof Node && element.contains(event.target);
      validTap = start.inside && inside;
      if (!start.inside && !inside && tapped) {
        tapped = false;
        delete element.dataset.tapPreview;
        animate();
      }
    };
    const cancelContact = () => {
      contact = null;
      validTap = false;
    };
    // React's handler cancels navigation before Next Link handles the click.
    touchClick.current = (event) => {
      if (event.detail === 0 || !touchActivation) return;
      touchActivation = false;
      if (!validTap) {
        event.preventDefault();
        return;
      }
      validTap = false;
      if (tapped && (!renderer || (!frame && progress === 1))) return;
      event.preventDefault();
      if (tapped) return;
      const rect = element.getBoundingClientRect();
      originX = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
      originY = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
      tapped = true;
      element.dataset.tapPreview = "true";
      animate();
      void prepare();
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
    motion.addEventListener("change", preferences);
    hover.addEventListener("change", preferences);
    document.addEventListener("visibilitychange", visibility);
    loaded();

    return () => {
      disposed = true;
      lifetime.abort();
      scrollIdle.release();
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
      touchClick.current = null;
      delete element.dataset.tapPreview;
      motion.removeEventListener("change", preferences);
      hover.removeEventListener("change", preferences);
      document.removeEventListener("visibilitychange", visibility);
      renderer?.dispose();
      delete element.dataset.shaderReady;
      delete element.dataset.previewReady;
    };
  }, [src, previewSrc, coverPositionY, lowPerformance]);

  return (
    <Link
      href={href}
      className="project-visual"
      ref={host}
      aria-label={`Read the ${title} case study`}
      aria-describedby={descriptionId}
      onClick={(event) => touchClick.current?.(event)}
    >
      <span id={descriptionId} className="sr-only">
        {showingPreview ? previewAlt : alt}
      </span>
      <Image
        ref={cover}
        src={src}
        alt={alt}
        aria-hidden="true"
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
    </Link>
  );
}
