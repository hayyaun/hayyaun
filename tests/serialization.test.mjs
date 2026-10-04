import assert from "node:assert/strict";
import { test } from "node:test";
import { serializeJsonLd } from "../lib/json-ld.ts";
import { strokeInLine } from "../lib/heading-water-measurement.ts";

test("JSON-LD round-trips HTML-like text without allowing a closing script tag", () => {
  const data = { name: '</script><script>alert("test")</script>', text: "a < b & café" };
  const serialized = serializeJsonLd(data);
  assert.equal(serialized.includes("<"), false);
  assert.deepEqual(JSON.parse(serialized), data);
});

test("a fast pointer crossing clips to the text line; a miss produces no stroke", () => {
  const rect = { left: 10, right: 30, top: 10, bottom: 30, height: 20 };
  const crossing = strokeInLine({ x: 0, y: 20, time: 0 }, { x: 40, y: 20, time: 16 }, rect);
  assert.equal(crossing.fromX, 10);
  assert.equal(crossing.x, 30);
  assert.equal(strokeInLine({ x: 0, y: 0, time: 0 }, { x: 40, y: 0, time: 16 }, rect), null);
});
