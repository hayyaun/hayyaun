"use client";

import { useState } from "react";

export default function DevToolsToggle() {
  const [active, setActive] = useState(false);

  function toggle() {
    const next = !active;
    setActive(next);
    window.dispatchEvent(new CustomEvent("hayyaun:debug-tools", { detail: next }));
  }

  return (
    <button
      type="button"
      className="dev-tools-toggle"
      aria-label={active ? "Hide debug controls" : "Show debug controls"}
      aria-pressed={active}
      onClick={toggle}
    >
      <span aria-hidden="true">⚙</span>
    </button>
  );
}
