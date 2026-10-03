"use client";

import { useEffect } from "react";
import type { WaterImpulse, WaterRenderer } from "@/lib/heading-water-renderer";

const selector = "h1,h2,h3,h4,h5,h6";
const lifetime = 5.5;
type Point = { x: number; y: number; time: number };
type TextLine = { text: string; rect: DOMRect; style: CSSStyleDeclaration };

/** Measure the actual DOM line breaks, including nested links and inline text. */
function headingLines(element: HTMLElement): TextLine[] {
  const lines: TextLine[] = [];
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  let node: Node | null;

  while ((node = walker.nextNode())) {
    const parent = node.parentElement;
    if (!parent || parent.closest('[aria-hidden="true"]')) continue;
    const style = getComputedStyle(parent);
    if (style.visibility !== "visible" || style.display === "none") continue;
    const value = node.textContent ?? "";
    let start = 0;
    let top = -Infinity;
    let offset = 0;

    const addLine = (end: number) => {
      range.setStart(node!, start);
      range.setEnd(node!, end);
      const rect = range.getBoundingClientRect();
      const text = value.slice(start, end).replace(/\s+/g, " ");
      if (text.trim() && rect.width && rect.height) lines.push({ text, rect, style });
    };

    // Code points keep surrogate pairs intact. DOM ranges supply the wrapping.
    for (const character of value) {
      range.setStart(node, offset);
      range.setEnd(node, offset + character.length);
      const rect = range.getBoundingClientRect();
      if (rect.width && rect.height) {
        if (top !== -Infinity && Math.abs(rect.top - top) > 2) {
          addLine(offset);
          start = offset;
        }
        top = rect.top;
      }
      offset += character.length;
    }
    addLine(value.length);
  }
  return lines;
}

/** Optional lighting over real HTML text; the canvas never replaces a heading. */
export default function HeadingWater() {
  useEffect(() => {
    const preference = matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) and (forced-colors: none)");
    let renderer: WaterRenderer | null = null;
    let canvas: HTMLCanvasElement | null = null;
    const mask = document.createElement("canvas");
    const context = mask.getContext("2d");
    // Accurate glyph spacing is required. Older browsers keep the HTML fallback.
    if (!context || !("letterSpacing" in context)) return;

    let disposed = false;
    let unavailable = false;
    let loading = false;
    let dirty = true;
    let frame = 0;
    let lines: TextLine[] = [];
    let impulses: WaterImpulse[] = [];
    let previous: Point | null = null;
    let pending: Point | null = null;
    let lastImpulse = -Infinity;
    let width = 0;
    let height = 0;

    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      impulses = [];
      pending = previous = null;
      if (canvas) canvas.hidden = true;
    };

    const rebuildMask = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      // A single bounded-resolution surface is shared by all visible headings.
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5, 2048 / Math.max(width, height));
      mask.width = Math.max(1, Math.round(width * ratio));
      mask.height = Math.max(1, Math.round(height * ratio));
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.fillStyle = "white";
      context.textBaseline = "alphabetic";
      lines = [];

      for (const heading of document.querySelectorAll<HTMLElement>(selector)) {
        const rect = heading.getBoundingClientRect();
        const style = getComputedStyle(heading);
        if (rect.width < 3 || rect.height < 3 || rect.bottom < 0 || rect.top > height || rect.right < 0 || rect.left > width || style.opacity === "0" || style.clipPath !== "none") continue;
        lines.push(...headingLines(heading));
      }

      for (const { text, rect, style } of lines) {
        context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        context.letterSpacing = style.letterSpacing === "normal" ? "0px" : style.letterSpacing;
        context.wordSpacing = style.wordSpacing === "normal" ? "0px" : style.wordSpacing;
        context.fontKerning = "normal";
        context.direction = style.direction === "rtl" ? "rtl" : "ltr";
        context.textAlign = "left";
        const content = style.textTransform === "uppercase" ? text.toUpperCase() : style.textTransform === "lowercase" ? text.toLowerCase() : text;
        const metrics = context.measureText(content);
        const descent = metrics.fontBoundingBoxDescent;
        const ascent = metrics.fontBoundingBoxAscent;
        // DOM text ranges enclose the font box, not the CSS line-height box.
        const baseline = rect.top + (rect.height - ascent - descent) / 2 + ascent;
        context.fillText(content, rect.left, baseline);
      }

      renderer?.resize(mask.width, mask.height);
      renderer?.setMask(mask);
      dirty = false;
    };

    const draw = (milliseconds: number) => {
      frame = 0;
      if (!renderer || !canvas || !preference.matches || document.hidden) { stop(); return; }
      if (dirty) rebuildMask();
      const time = milliseconds / 1000;
      impulses = impulses.filter((impulse) => time - impulse.born < lifetime);

      if (pending) {
        const point = pending;
        const from = previous && point.time - previous.time < 150 ? previous : point;
        const dx = point.x - from.x;
        const dy = point.y - from.y;
        const distance = Math.hypot(dx, dy);
        if (distance > 1 && time - lastImpulse > .055) {
          const steps = Math.min(8, Math.max(1, Math.ceil(distance / 18)));
          for (let step = 1; step <= steps; step++) {
            const x = from.x + dx * step / steps;
            const y = from.y + dy * step / steps;
            if (!lines.some(({ rect }) => x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom)) continue;
            const speed = distance / Math.max(16, point.time - from.time);
            impulses.push({ x, y, born: time, dx: dx / distance, dy: dy / distance, strength: Math.min(.85, .38 + speed * .12) / Math.sqrt(steps) });
            lastImpulse = time;
          }
          impulses = impulses.slice(-32);
        }
        previous = point;
        pending = null;
      }

      if (impulses.length) {
        canvas.hidden = false;
        renderer.render(time, impulses, width, height);
        frame = requestAnimationFrame(draw);
      } else {
        canvas.hidden = true;
      }
    };

    const initialize = async () => {
      if (loading || renderer || unavailable || disposed) return;
      loading = true;
      try {
        const [{ createWaterRenderer }] = await Promise.all([import("@/lib/heading-water-renderer"), document.fonts.ready]);
        if (disposed || !preference.matches || document.hidden) return;
        canvas = document.createElement("canvas");
        canvas.className = "heading-water-canvas";
        canvas.setAttribute("aria-hidden", "true");
        canvas.hidden = true;
        renderer = createWaterRenderer(canvas);
        if (!renderer) { unavailable = true; canvas = null; return; }
        canvas.addEventListener("webglcontextlost", contextLost);
        document.body.append(canvas);
        dirty = true;
        frame = requestAnimationFrame(draw);
      } catch {
        unavailable = true;
        stop();
      } finally {
        loading = false;
      }
    };

    const contextLost = () => {
      stop();
      unavailable = true;
    };

    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || !preference.matches || document.hidden || unavailable) return;
      pending = { x: event.clientX, y: event.clientY, time: event.timeStamp };
      if (!renderer) {
        // Defer the shader download and GPU context until a heading is approached.
        const nearHeading = Array.from(document.querySelectorAll(selector)).some((heading) => {
          const rect = heading.getBoundingClientRect();
          return event.clientX >= rect.left - 80 && event.clientX <= rect.right + 80 && event.clientY >= rect.top - 80 && event.clientY <= rect.bottom + 80;
        });
        previous = pending;
        if (nearHeading) void initialize();
      } else if (!frame) {
        frame = requestAnimationFrame(draw);
      }
    };

    const leave = () => { pending = previous = null; }; // Let the water settle after exit.
    const invalidate = () => { dirty = true; stop(); };
    const observer = new MutationObserver((records) => {
      if (records.every((record) => record.target === canvas || (record.type === "childList" && [...record.addedNodes, ...record.removedNodes].every((node) => node === canvas)))) return;
      invalidate();
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    const resize = new ResizeObserver(invalidate);
    resize.observe(document.body);
    document.fonts.addEventListener("loadingdone", invalidate);
    document.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerleave", leave);
    document.addEventListener("visibilitychange", stop);
    window.addEventListener("blur", stop);
    window.addEventListener("scroll", invalidate, { passive: true, capture: true });
    window.addEventListener("resize", invalidate, { passive: true });
    preference.addEventListener("change", invalidate);

    return () => {
      disposed = true;
      stop();
      observer.disconnect();
      resize.disconnect();
      renderer?.dispose();
      canvas?.removeEventListener("webglcontextlost", contextLost);
      canvas?.remove();
      document.fonts.removeEventListener("loadingdone", invalidate);
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", leave);
      document.removeEventListener("visibilitychange", stop);
      window.removeEventListener("blur", stop);
      window.removeEventListener("scroll", invalidate, true);
      window.removeEventListener("resize", invalidate);
      preference.removeEventListener("change", invalidate);
    };
  }, []);

  return null;
}
