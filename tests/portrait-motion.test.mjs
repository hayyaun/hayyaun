import assert from "node:assert/strict";
import { test } from "node:test";
import { portraitClips, portraitRegion } from "../lib/portrait-motion.ts";

test("portrait regions leave the face and lower section neutral", () => {
  assert.equal(portraitRegion(0.2, 0.4), "left");
  assert.equal(portraitRegion(0.5, 0.15), "middle");
  assert.equal(portraitRegion(0.8, 0.4), "right");
  assert.equal(portraitRegion(0.5, 0.5), null);
  for (const x of [0, 0.2, 0.5, 0.8, 1]) assert.equal(portraitRegion(x, 0.8), null);
});

test("every recorded motion range stays inside the 48-second processed video", () => {
  const ranges = [
    portraitClips.idle,
    ...["left", "middle", "right"].flatMap((direction) => Object.values(portraitClips[direction])),
  ];
  for (const [start, end] of ranges) {
    assert.ok(start >= 0 && start < end && end < 48);
  }
  for (const direction of ["left", "middle", "right"]) {
    const clip = portraitClips[direction];
    assert.equal(clip.enter[1], clip.hold[0], "the turn flows straight into the held gaze");
    assert.ok(clip.hold[1] <= clip.exit[0]);
  }
});
