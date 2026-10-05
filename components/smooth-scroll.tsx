"use client";

import type Lenis from "lenis";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

/** Enhance desktop wheel input without replacing native touch or navigation. */
export default function SmoothScroll() {
  const pathname = usePathname();

  useEffect(() => {
    const desktop = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let lenis: Lenis | undefined;
    let generation = 0;
    const cancelInertia = () => {
      if (lenis?.isScrolling === "smooth") lenis.scrollTo(lenis.actualScroll, { immediate: true });
    };

    const update = async () => {
      const current = ++generation;
      lenis?.destroy();
      lenis = undefined;
      if (!desktop.matches || reducedMotion.matches || document.hidden) return;

      // Touch devices and reduced-motion visitors never download the library.
      const lenisModule = await import("lenis").catch(() => null);
      if (!lenisModule || current !== generation) return;
      lenis = new lenisModule.default({
        autoRaf: true,
        lerp: 0.18,
        smoothWheel: true,
        syncTouch: false,
        respectReducedMotion: true,
        stopInertiaOnNavigate: true,
        // Hash navigation stays with the browser/Next.js, including focus/history.
        anchors: false,
        virtualScroll: ({ event, deltaX, deltaY }) => {
          if (
            event instanceof WheelEvent &&
            (event.shiftKey ||
              event.ctrlKey ||
              Math.abs(deltaX) > Math.abs(deltaY) ||
              (event.target instanceof Element && event.target.closest("[data-lenis-prevent]")))
          ) {
            cancelInertia();
            return false;
          }
          return true;
        },
      });
    };

    const onClick = (event: MouseEvent) => {
      if (event.target instanceof Element && event.target.closest("a[href]")) cancelInertia();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " ", "Escape", "Tab"].includes(event.key)) {
        cancelInertia();
      }
    };

    void update();
    desktop.addEventListener("change", update);
    reducedMotion.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    // Reset before native scrolling/focus takes place; never prevent these events.
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("focusin", cancelInertia);
    document.addEventListener("pointerdown", cancelInertia, true);
    window.addEventListener("popstate", cancelInertia);
    window.addEventListener("hashchange", cancelInertia);

    return () => {
      generation++;
      lenis?.destroy();
      desktop.removeEventListener("change", update);
      reducedMotion.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", update);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("focusin", cancelInertia);
      document.removeEventListener("pointerdown", cancelInertia, true);
      window.removeEventListener("popstate", cancelInertia);
      window.removeEventListener("hashchange", cancelInertia);
    };
  }, [pathname]);

  return null;
}
