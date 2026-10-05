"use client";

import { useEffect } from "react";
import { performanceModeConfig, useGraphicsPerformance } from "@/lib/graphics-performance";
import { headingLines, strokeInLine, type Point, type TextLine } from "@/lib/heading-water-measurement";
import type { WaterStroke, WaterRenderer } from "@/lib/heading-water-renderer";
import { acquireScrollIdle } from "@/lib/scroll-idle";

const selector = "#hero-title";
const settleSeconds = 8;
/** Optional lighting over real HTML text; the canvas never replaces a heading. */
export default function HeadingWater() {
  const lowPerformance = useGraphicsPerformance(
    (state) => !performanceModeConfig[state.mode].water || !state.waterEnabled
  );
  useEffect(() => {
    if (lowPerformance) return;
    const heroHeading = document.querySelector<HTMLElement>(selector);
    if (!heroHeading) return;
    const preference = matchMedia(
      "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) and (forced-colors: none)"
    );
    let renderer: WaterRenderer | null = null;
    let canvas: HTMLCanvasElement | null = null;
    const mask = document.createElement("canvas");
    const context = mask.getContext("2d");
    // Accurate glyph spacing is required. Older browsers keep the HTML fallback.
    if (!context || !("letterSpacing" in context)) return;
    const scrollIdle = acquireScrollIdle();
    const lifetime = new AbortController();

    let disposed = false;
    let unavailable = false;
    let loading = false;
    let resumePending = false;
    let visible = false;
    let dirty = true;
    let frame = 0;
    let lines: TextLine[] = [];
    let previous: Point | null = null;
    let pending: Point | null = null;
    let lastStroke = -Infinity;
    let lastFrame = 0;
    let width = 0;
    let height = 0;
    let scrollX = window.scrollX;
    let scrollY = window.scrollY;

    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      lastStroke = -Infinity;
      lastFrame = 0;
      pending = previous = null;
      renderer?.reset();
      if (canvas) canvas.hidden = true;
    };
    const releaseRenderer = () => {
      canvas?.removeEventListener("webglcontextlost", contextLost);
      renderer?.dispose();
      canvas?.remove();
      renderer = null;
      canvas = null;
    };

    const rebuildMask = () => {
      // innerWidth includes the scrollbar, but the fixed canvas does not.
      // Give the mask, simulation, and displayed canvas identical CSS extents.
      width = document.documentElement.clientWidth;
      height = document.documentElement.clientHeight;
      if (canvas) {
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
      }
      // Keep the hero's text mask at a bounded resolution.
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5, 2048 / Math.max(width, height));
      mask.width = Math.max(1, Math.round(width * ratio));
      mask.height = Math.max(1, Math.round(height * ratio));
      // Account for rounded backing-buffer dimensions at fractional zoom/DPR.
      context.setTransform(mask.width / width, 0, 0, mask.height / height, 0, 0);
      context.fillStyle = "white";
      context.textBaseline = "alphabetic";
      lines = [];

      for (const heading of document.querySelectorAll<HTMLElement>(selector)) {
        const rect = heading.getBoundingClientRect();
        const style = getComputedStyle(heading);
        if (
          rect.width < 3 ||
          rect.height < 3 ||
          rect.bottom < 0 ||
          rect.top > height ||
          rect.right < 0 ||
          rect.left > width ||
          style.opacity === "0" ||
          style.clipPath !== "none"
        )
          continue;
        lines.push(...headingLines(heading));
      }

      for (const { text, rect, style } of lines) {
        context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        context.letterSpacing = style.letterSpacing === "normal" ? "0px" : style.letterSpacing;
        context.wordSpacing = style.wordSpacing === "normal" ? "0px" : style.wordSpacing;
        context.fontKerning = "normal";
        context.direction = style.direction === "rtl" ? "rtl" : "ltr";
        context.textAlign = "left";
        const content =
          style.textTransform === "uppercase"
            ? text.toUpperCase()
            : style.textTransform === "lowercase"
              ? text.toLowerCase()
              : text;
        const metrics = context.measureText(content);
        const descent = metrics.fontBoundingBoxDescent;
        const ascent = metrics.fontBoundingBoxAscent;
        // DOM text ranges enclose the font box, not the CSS line-height box.
        const baseline = rect.top + (rect.height - ascent - descent) / 2 + ascent;
        context.fillText(content, rect.left, baseline);
      }

      renderer?.resize(mask.width, mask.height, width, height);
      renderer?.setMask(mask);
      dirty = false;
    };

    const draw = (milliseconds: number) => {
      frame = 0;
      if (!renderer || !canvas || !visible || !preference.matches || document.hidden) {
        stop();
        return;
      }
      if (scrollIdle.isScrolling()) {
        pauseForScroll();
        return;
      }
      try {
        if (dirty) rebuildMask();
      } catch {
        stop();
        unavailable = true;
        releaseRenderer();
        return;
      }
      if (scrollX !== window.scrollX || scrollY !== window.scrollY) {
        renderer.shift(window.scrollX - scrollX, window.scrollY - scrollY);
        scrollX = window.scrollX;
        scrollY = window.scrollY;
      }
      const time = milliseconds / 1000;
      const strokes: WaterStroke[] = [];

      if (pending) {
        const point = pending;
        const from = previous && point.time - previous.time < 200 ? previous : point;
        const dx = point.x - from.x;
        const dy = point.y - from.y;
        const distance = Math.hypot(dx, dy);
        if (distance >= 0.5) {
          for (const { rect } of lines) {
            const stroke = strokeInLine(from, point, rect);
            if (stroke) strokes.push(stroke);
          }
          if (strokes.length) lastStroke = time;
        }
        if (distance >= 0.5 || from === point) previous = point;
        pending = null;
      }

      const idle = time - lastStroke;
      if (idle < settleSeconds) {
        canvas.hidden = false;
        // Natural damping does most of the settling; ease out the final 2 seconds.
        const fade = Math.max(0, Math.min(1, (idle - 6) / 2));
        renderer.render(lastFrame ? time - lastFrame : 1 / 60, strokes, 1 - fade * fade * (3 - 2 * fade));
        lastFrame = time;
        frame = requestAnimationFrame(draw);
      } else {
        canvas.hidden = true;
        if (lastFrame) renderer.reset();
        lastFrame = 0;
      }
    };

    const pauseForScroll = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      if (canvas) canvas.hidden = true;
      if (!renderer || !lastFrame || resumePending) return;
      resumePending = true;
      void scrollIdle
        .run(() => {
          resumePending = false;
          if (renderer && lastFrame && !frame) frame = requestAnimationFrame(draw);
        }, lifetime.signal)
        .catch(() => {
          resumePending = false;
        });
    };

    const initialize = async () => {
      if (loading || renderer || unavailable || disposed) return;
      loading = true;
      try {
        const [{ createWaterRenderer }] = await Promise.all([
          scrollIdle.run(() => import("@/lib/heading-water-renderer"), lifetime.signal),
          document.fonts.ready,
        ]);
        await scrollIdle.run(() => {
          if (disposed || !visible || !preference.matches || document.hidden) return;
          canvas = document.createElement("canvas");
          canvas.className = "heading-water-canvas";
          canvas.setAttribute("aria-hidden", "true");
          canvas.hidden = true;
          renderer = createWaterRenderer(canvas);
          if (!renderer) {
            unavailable = true;
            canvas = null;
            return;
          }
          canvas.addEventListener("webglcontextlost", contextLost);
          document.body.append(canvas);
          dirty = true;
          rebuildMask();
          frame = requestAnimationFrame(draw);
        }, lifetime.signal);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) unavailable = true;
        stop();
        releaseRenderer();
      } finally {
        loading = false;
      }
    };

    const contextLost = () => {
      stop();
      unavailable = true;
    };

    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || !visible || !preference.matches || document.hidden || unavailable) return;
      if (scrollIdle.isScrolling()) {
        pending = previous = null;
        return;
      }
      pending = { x: event.clientX, y: event.clientY, time: event.timeStamp };
      if (!renderer) {
        // Defer the shader download and GPU context until the hero is approached.
        const nearHeading = Array.from(document.querySelectorAll(selector)).some((heading) => {
          const rect = heading.getBoundingClientRect();
          return (
            event.clientX >= rect.left - 80 &&
            event.clientX <= rect.right + 80 &&
            event.clientY >= rect.top - 80 &&
            event.clientY <= rect.bottom + 80
          );
        });
        if (!previous) previous = pending;
        if (nearHeading) void initialize();
      } else if (!frame) {
        frame = requestAnimationFrame(draw);
      }
    };

    const leave = () => {
      pending = previous = null;
    }; // Let the water settle after exit.
    const invalidate = () => {
      dirty = true;
      stop();
    };
    const scroll = (event: Event) => {
      dirty = true;
      pending = previous = null;
      if (event.target !== document) stop();
      else pauseForScroll();
      // Rebuild/translate the text mask once after momentum settles, rather than
      // measuring glyphs and uploading a viewport texture on every scroll frame.
    };
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (!visible) stop();
    });
    intersection.observe(heroHeading);
    const observer = new MutationObserver(invalidate);
    observer.observe(heroHeading, { childList: true, subtree: true, characterData: true });
    const resize = new ResizeObserver(() => {
      dirty = true;
    });
    resize.observe(document.body);
    document.fonts.addEventListener("loadingdone", invalidate);
    document.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerleave", leave);
    document.addEventListener("visibilitychange", stop);
    window.addEventListener("blur", stop);
    window.addEventListener("scroll", scroll, { passive: true, capture: true });
    window.addEventListener("resize", invalidate, { passive: true });
    preference.addEventListener("change", invalidate);

    return () => {
      disposed = true;
      lifetime.abort();
      scrollIdle.release();
      stop();
      observer.disconnect();
      intersection.disconnect();
      resize.disconnect();
      releaseRenderer();
      document.fonts.removeEventListener("loadingdone", invalidate);
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", leave);
      document.removeEventListener("visibilitychange", stop);
      window.removeEventListener("blur", stop);
      window.removeEventListener("scroll", scroll, true);
      window.removeEventListener("resize", invalidate);
      preference.removeEventListener("change", invalidate);
    };
  }, [lowPerformance]);

  return null;
}
