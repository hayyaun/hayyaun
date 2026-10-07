"use client";

import { useRef, useState } from "react";
import PortraitPlayer from "@/components/portrait-player";
import { type PortraitDirection } from "@/lib/portrait-motion";

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
  const [hovered, setHovered] = useState<PortraitDirection | null>(null);
  const [focused, setFocused] = useState<PortraitDirection | null>(null);
  const [tapped, setTapped] = useState<PortraitDirection | null>(null);
  const pointerType = useRef("mouse");
  const active = focused ?? hovered ?? tapped;

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
      <div className="portrait-stage" data-active={active ?? "idle"}>
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
              onPointerEnter={(event) => {
                if (event.pointerType === "touch") return;
                setTapped(null);
                setHovered(skill.id);
              }}
              onPointerLeave={() => setHovered(null)}
            >
              <button
                type="button"
                className="portrait-trigger"
                aria-pressed={active === skill.id}
                aria-controls={`portrait-detail-${skill.id}`}
                onFocus={(event) => {
                  if (event.currentTarget.matches(":focus-visible")) setFocused(skill.id);
                }}
                onBlur={() => setFocused(null)}
                onPointerDown={(event) => {
                  pointerType.current = event.pointerType;
                  if (event.pointerType === "mouse") setFocused(null);
                }}
                onClick={() => {
                  if (pointerType.current !== "mouse")
                    setTapped((previous) => (previous === skill.id ? null : skill.id));
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.currentTarget.blur();
                    setFocused(null);
                    setTapped(null);
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
