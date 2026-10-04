"use client";

import { useRef, type ReactNode } from "react";

export default function CapabilityCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  const host = useRef<HTMLElement>(null);
  const play = () => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (host.current) host.current.dataset.animating = "true";
  };
  const finish = () => {
    const card = host.current;
    if (!card || card.getAnimations({ subtree: true }).some((animation) => animation.playState === "running")) return;
    delete card.dataset.animating;
  };
  return (
    <article
      ref={host}
      onPointerEnter={play}
      onFocus={play}
      onAnimationEnd={finish}
    >
      {children}
      <h3 className="text-lead font-normal tracking-[-0.04em]">{title}</h3>
      <p className="mt-1.5 text-small text-muted">{description}</p>
    </article>
  );
}
