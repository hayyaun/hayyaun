"use client";

import { useRef, useState, type PointerEvent } from "react";
import PortraitPlayer from "@/components/portrait-player";
import { portraitRegion, type PortraitDirection } from "@/lib/portrait-motion";

const skills = [
  {
    id: "left",
    number: "01",
    title: "DevOps",
    tools: ["Docker", "Git"],
    description: "The tools behind the build.",
    detail: "Containerized environments and version-controlled development.",
    icon: "↳",
  },
  {
    id: "middle",
    number: "02",
    title: "Animations",
    tools: ["Three.js", "GSAP"],
    description: "A sense of motion. A little depth.",
    detail: "Interactive 3D and purposeful animation for the web.",
    icon: "✳",
  },
  {
    id: "right",
    number: "03",
    title: "Frontend",
    tools: ["Next.js", "WordPress"],
    description: "Where the experience takes shape.",
    detail: "Websites built around clear interfaces and considered interactions.",
    icon: "⌘",
  },
] as const;

export default function PortraitSkills() {
  const [active, setActive] = useState<PortraitDirection | null>(null);
  const focused = useRef<PortraitDirection | null>(null);
  const lastRegion = useRef<PortraitDirection | null>(null);

  function move(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || focused.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const next = portraitRegion((event.clientX - rect.left) / rect.width, (event.clientY - rect.top) / rect.height);
    if (lastRegion.current !== next) {
      lastRegion.current = next;
      setActive(next);
    }
  }

  return (
    <section className="portrait-section page-width border-b border-line" aria-labelledby="portrait-title">
      <div className="portrait-heading flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="section-label">Meet the developer</p>
          <h2 id="portrait-title" className="mt-3 text-heading">
            A face behind the pixels.
          </h2>
        </div>
        <p className="portrait-instruction text-small text-subtle">
          <span aria-hidden="true">↖</span> Explore what I work with.
        </p>
      </div>
      <div
        className="portrait-stage"
        data-active={active ?? "idle"}
        onPointerMove={move}
        onPointerLeave={() => {
          lastRegion.current = null;
          if (!focused.current) setActive(null);
        }}
      >
        <div className="portrait-orbit" aria-hidden="true" />
        <div className="portrait-person">
          <PortraitPlayer direction={active} />
        </div>
        <div className="portrait-skills" aria-label="Explore technical skills">
          {skills.map((skill) => (
            <div
              key={skill.id}
              className={`portrait-skill portrait-skill-${skill.id}`}
              data-selected={active === skill.id}
            >
              <button
                type="button"
                className="portrait-trigger"
                aria-pressed={active === skill.id}
                aria-controls={`portrait-detail-${skill.id}`}
                onFocus={() => {
                  // Mouse clicks must not pin the keyboard's selection.
                  focused.current = document.activeElement?.matches(":focus-visible") ? skill.id : null;
                  setActive(skill.id);
                }}
                onBlur={() => {
                  focused.current = null;
                  setActive(null);
                }}
                onPointerEnter={(event) => {
                  if (event.pointerType === "mouse" && !focused.current) setActive(skill.id);
                }}
                onClick={() => setActive(skill.id)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.currentTarget.blur();
                    setActive(null);
                  }
                }}
              >
                <span className="portrait-skill-number font-mono">{skill.number}</span>
                <span className="portrait-skill-title">{skill.title}</span>
                <span className="portrait-skill-icon" aria-hidden="true">
                  {skill.icon}
                </span>
                <span className="portrait-tools">{skill.tools.join(" / ")}</span>
              </button>
              <div id={`portrait-detail-${skill.id}`} className="portrait-detail">
                <p className="portrait-skill-description">{skill.description}</p>
                <p className="portrait-skill-copy">{skill.detail}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="portrait-signature" aria-hidden="true">
          <span className="portrait-status" /> Hayyaun <span className="text-muted">/ Developer</span>
        </div>
      </div>
    </section>
  );
}
