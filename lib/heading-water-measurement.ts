import type { WaterStroke } from "./heading-water-renderer";

export type Point = { x: number; y: number; time: number };
export type TextLine = { text: string; rect: DOMRect; style: CSSStyleDeclaration };

/** Clip the swept mouse segment to a text line, including fast crossings. */
export function strokeInLine(from: Point, to: Point, rect: DOMRect): WaterStroke | null {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  let enter = 0;
  let exit = 1;
  for (const [start, delta, min, max] of [
    [from.x, dx, rect.left, rect.right],
    [from.y, dy, rect.top, rect.bottom],
  ]) {
    if (Math.abs(delta) < 0.001) {
      if (start < min || start > max) return null;
    } else {
      const a = (min - start) / delta;
      const b = (max - start) / delta;
      enter = Math.max(enter, Math.min(a, b));
      exit = Math.min(exit, Math.max(a, b));
      if (exit <= enter) return null;
    }
  }
  const speed = Math.hypot(dx, dy) / Math.max(8, to.time - from.time);
  return {
    fromX: from.x + dx * enter,
    fromY: from.y + dy * enter,
    x: from.x + dx * exit,
    y: from.y + dy * exit,
    radius: Math.max(12, Math.min(25, rect.height * 0.24)),
    strength: 0.45 + Math.min(0.35, speed * 0.12),
  };
}

/** Measure the actual DOM line breaks, including nested links and inline text. */
export function headingLines(element: HTMLElement): TextLine[] {
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
