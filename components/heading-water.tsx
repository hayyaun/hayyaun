"use client";

import { useEffect } from "react";

type Ripple = { x: number; y: number; born: number; strength: number };
type Surface = { element: HTMLElement; rect: DOMRect; ripples: Ripple[] };

const lifetime = 850;
const selector = "h1,h2,h3,h4,h5,h6";

/** A text-clipped water surface; headings remain ordinary server-rendered HTML. */
export default function HeadingWater() {
  useEffect(() => {
    const preference = matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
    if (!CSS.supports("background-clip", "text")) return;

    let surfaces: Surface[] = [];
    let dirty = true;
    let frame = 0;
    let pointer: { x: number; y: number } | null = null;
    let previous: { x: number; y: number; time: number } | null = null;

    const clear = (surface: Surface) => {
      surface.element.removeAttribute("data-water-active");
      surface.element.style.removeProperty("--heading-water");
      surface.ripples = [];
    };

    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      pointer = previous = null;
      surfaces.forEach(clear);
    };

    const draw = (time: number) => {
      frame = 0;
      if (!preference.matches || document.hidden) { stop(); return; }

      if (dirty) {
        const existing = new Map(surfaces.map((surface) => [surface.element, surface]));
        surfaces = Array.from(document.querySelectorAll<HTMLElement>(selector), (element) => {
          const surface = existing.get(element) ?? { element, rect: element.getBoundingClientRect(), ripples: [] };
          surface.rect = element.getBoundingClientRect();
          existing.delete(element);
          return surface;
        });
        existing.forEach(clear);
        dirty = false;
      }

      if (pointer) {
        const distance = previous ? Math.hypot(pointer.x - previous.x, pointer.y - previous.y) : 12;
        if (!previous || (distance >= 5 && time - previous.time >= 32)) {
          const { x, y } = pointer;
          for (const surface of surfaces) {
            const { rect } = surface;
            if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) continue;
            surface.ripples.push({ x: x - rect.left, y: y - rect.top, born: time, strength: Math.min(1, .45 + distance / 65) });
            // Bound paint work even during rapid pointer movement.
            surface.ripples = surface.ripples.slice(-5);
          }
          previous = { x, y, time };
        }
        pointer = null;
      }

      let active = false;
      for (const surface of surfaces) {
        surface.ripples = surface.ripples.filter((ripple) => time - ripple.born < lifetime);
        if (!surface.ripples.length) {
          if (surface.element.hasAttribute("data-water-active")) clear(surface);
          continue;
        }
        active = true;
        const rings = surface.ripples.map((ripple) => {
          const progress = (time - ripple.born) / lifetime;
          const radius = 5 + progress * 100;
          const alpha = ((1 - progress) ** 2 * ripple.strength).toFixed(3);
          // Paired light/dark wave fronts suggest water catching the light.
          return `radial-gradient(circle at ${ripple.x}px ${ripple.y}px, transparent ${radius * .35}px, rgb(133 169 206 / ${alpha}) ${radius * .48}px, rgb(226 239 250 / ${alpha}) ${radius * .55}px, transparent ${radius * .64}px, transparent ${radius * .78}px, rgb(126 111 174 / ${alpha}) ${radius * .85}px, rgb(221 238 250 / ${alpha}) ${radius * .92}px, transparent ${radius}px)`;
        });
        surface.element.style.setProperty("--heading-water", rings.join(","));
        surface.element.setAttribute("data-water-active", "");
      }
      if (active) frame = requestAnimationFrame(draw);
    };

    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || !preference.matches || document.hidden) return;
      pointer = { x: event.clientX, y: event.clientY };
      if (!frame) frame = requestAnimationFrame(draw);
    };
    const invalidate = () => { dirty = true; stop(); };
    const observer = new MutationObserver(() => { dirty = true; });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    const resize = new ResizeObserver(invalidate);
    resize.observe(document.body);
    document.fonts.addEventListener("loadingdone", invalidate);
    document.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerleave", stop);
    document.addEventListener("visibilitychange", stop);
    window.addEventListener("blur", stop);
    window.addEventListener("scroll", invalidate, { passive: true, capture: true });
    window.addEventListener("resize", invalidate, { passive: true });
    preference.addEventListener("change", invalidate);

    return () => {
      stop();
      observer.disconnect();
      resize.disconnect();
      document.fonts.removeEventListener("loadingdone", invalidate);
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", stop);
      document.removeEventListener("visibilitychange", stop);
      window.removeEventListener("blur", stop);
      window.removeEventListener("scroll", invalidate, true);
      window.removeEventListener("resize", invalidate);
      preference.removeEventListener("change", invalidate);
    };
  }, []);

  return null;
}
