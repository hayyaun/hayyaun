"use client";

import { useEffect, useRef } from "react";

const slogans = [
  ["Ideas", "into", "real", "experiences"],
  ["Detail", "in", "every", "interaction"],
  ["Less", "noise", "more", "purpose"],
  ["Where", "logic", "meets", "feeling"],
] as const;

const glyphs = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/#<>";
const holdDuration = 5000;
const scrambleDuration = 700;

export default function HeroSlogan() {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const lines = element.querySelectorAll<HTMLElement>(".hero-slogan-line");
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    let index = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    function settle() {
      lines.forEach((line, row) => {
        line.textContent = slogans[index][row];
      });
    }

    function scramble() {
      const previous = slogans[index];
      index = (index + 1) % slogans.length;
      const next = slogans[index];
      const started = performance.now();

      function tick() {
        const progress = Math.min((performance.now() - started) / scrambleDuration, 1);
        lines.forEach((line, row) => {
          const length = Math.max(previous[row].length, next[row].length);
          line.textContent = Array.from({ length }, (_, column) => {
            // A short burst of noise resolves left to right, with each row offset.
            const threshold = 0.25 + (column / length) * 0.5 + row * 0.06;
            if (progress >= threshold) return next[row][column] ?? "";
            return glyphs[Math.floor(Math.random() * glyphs.length)];
          }).join("");
        });

        if (progress < 1) {
          timer = setTimeout(tick, 40);
        } else {
          settle();
          timer = setTimeout(scramble, holdDuration);
        }
      }

      tick();
    }

    function sync() {
      clearTimeout(timer);
      if (motion.matches) index = 0;
      settle();
      if (visible && !document.hidden && !motion.matches) {
        timer = setTimeout(scramble, holdDuration);
      }
    }

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    observer.observe(element);
    motion.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
      motion.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  return (
    <span className="hero-note" ref={ref}>
      <span className="sr-only">Ideas into real experiences.</span>
      <span aria-hidden="true">
        {slogans[0].map((word, row) => (
          <span className="hero-slogan-line" key={row}>{word}</span>
        ))}
      </span>
    </span>
  );
}
