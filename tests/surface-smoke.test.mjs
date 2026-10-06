import assert from "node:assert/strict";
import { test } from "node:test";
import { Box3, LinearFilter, Vector3 } from "three";
import { SurfaceSmoke, smokeLifetime, ambientSmokeTiming } from "../components/three/prism/surface-smoke.ts";

const front = new Vector3(0, 0, 1);
const at = (x) => new Vector3(x, 0, 0);

function close(actual, expected, message = `${actual} differs from ${expected}`) {
  assert.ok(Math.abs(actual - expected) < 1e-10, message);
}

function boundedSmoke() {
  const smoke = new SurfaceSmoke();
  smoke.setBounds(new Box3(new Vector3(-0.5, -0.5, -0.5), new Vector3(0.5, 0.5, 0.5)));
  return smoke;
}

function assertEmptyWake(smoke) {
  const { data } = smoke.uniforms.uSmokeVolume.value.image;
  assert.ok(
    data.every((value, index) => value === (index % 4 === 3 ? 0 : 128)),
    "empty wake has neutral RGB and zero alpha"
  );
}

function volumeCell(smoke, point) {
  const { data, width, height, depth } = smoke.uniforms.uSmokeVolume.value.image;
  const min = smoke.uniforms.uSmokeMin.value;
  const extent = smoke.uniforms.uSmokeExtent.value;
  const x = Math.floor(((point.x - min.x) / extent.x) * width);
  const y = Math.floor(((point.y - min.y) / extent.y) * height);
  const z = Math.floor(((point.z - min.z) / extent.z) * depth);
  const offset = (x + width * (y + height * z)) * 4;
  return data.subarray(offset, offset + 4);
}

function maximumAlpha(smoke) {
  const { data } = smoke.uniforms.uSmokeVolume.value.image;
  let maximum = 0;
  for (let index = 3; index < data.length; index += 4) maximum = Math.max(maximum, data[index]);
  return maximum;
}

test("a single touch dab reveals smoke without needing a drag and fades completely", () => {
  const smoke = boundedSmoke();
  smoke.dab(at(0), front, 0);
  smoke.advance(0.15);
  assert.ok(maximumAlpha(smoke) > 0, "one contact paints a visible patch");
  assert.equal(smoke.uniforms.uSmokeActive.value, 1);
  smoke.advance(smokeLifetime + 0.01);
  assertEmptyWake(smoke);
  assert.equal(smoke.uniforms.uSmokeActive.value, 0);
});

test("separate taps do not draw a connecting stroke", () => {
  const smoke = boundedSmoke();
  smoke.dab(at(-0.4), front, 0);
  smoke.dab(at(0.4), front, 0.1);
  assert.equal(smoke.uniforms.uSmokeCount.value, 2);
  assert.equal(smoke.uniforms.uSmokeNormals.value[0].w, 0);
  assert.equal(smoke.uniforms.uSmokeNormals.value[1].w, 0);
});

test("idle mist fades in slowly, holds its density, then fades completely", () => {
  const smoke = boundedSmoke();
  smoke.sample(at(0), front, 0, 16, 0.45, true);
  smoke.sample(at(0.12), front, 0.1, 16, 0.45, true);
  smoke.advance(0.15);
  const early = maximumAlpha(smoke);
  smoke.advance(0.65);
  const rising = maximumAlpha(smoke);
  smoke.advance(1.25);
  const peak = maximumAlpha(smoke);
  smoke.advance(1.85);
  assert.ok(early < rising && rising < peak, "density builds gradually rather than popping in");
  assert.equal(maximumAlpha(smoke), peak, "fully revealed mist stays visible through its hold");
  smoke.advance(3.1);
  assert.ok(maximumAlpha(smoke) < peak && maximumAlpha(smoke) > 0);
  const lifetime = ambientSmokeTiming.fadeIn + ambientSmokeTiming.hold + ambientSmokeTiming.fadeOut;
  smoke.advance(lifetime + 0.11);
  assertEmptyWake(smoke);
  assert.equal(smoke.uniforms.uSmokeActive.value, 0);
});

test("idle mist covers a wider area than a pointer stroke", () => {
  const ambient = boundedSmoke();
  const pointer = boundedSmoke();
  for (const [smoke, idle] of [
    [ambient, true],
    [pointer, false],
  ]) {
    smoke.sample(at(0), front, 0, 16, 0.45, idle);
    smoke.sample(at(0.12), front, 0.1, 16, 0.45, idle);
    smoke.advance(idle ? 1.25 : 0.25);
  }
  const edge = new Vector3(0.06, 0.4, 0);
  assert.ok(volumeCell(ambient, edge)[3] > volumeCell(pointer, edge)[3] * 2);
});

test("gentle autonomous strokes stay dimmer than pointer strokes and expire fully", () => {
  const ambient = boundedSmoke();
  const pointer = boundedSmoke();
  for (const [smoke, strength] of [
    [ambient, 0.45],
    [pointer, 1],
  ]) {
    smoke.sample(at(0), front, 0, 16, strength);
    smoke.sample(at(0.12), front, 0.1, 16, strength);
    smoke.advance(0.25);
  }
  assert.ok(maximumAlpha(ambient) > 0);
  assert.ok(maximumAlpha(ambient) < maximumAlpha(pointer) * 0.5);
  ambient.advance(smokeLifetime + 0.11);
  assertEmptyWake(ambient);
  assert.equal(ambient.uniforms.uSmokeActive.value, 0);
});

test("a gentle stroke cannot erase a brighter pointer wake", () => {
  const smoke = boundedSmoke();
  smoke.sample(at(0), front, 0);
  smoke.sample(at(0.12), front, 0.1);
  smoke.advance(0.25);
  const before = volumeCell(smoke, at(0.06))[3];
  smoke.breakStroke();
  smoke.sample(at(0), front, 0.26, 16, 0.45);
  smoke.sample(at(0.12), front, 0.36, 16, 0.45);
  smoke.advance(0.4);
  assert.ok(volumeCell(smoke, at(0.06))[3] >= before * 0.98);
});

test("small movement accumulates from the last retained sample, rather than each pointer event", () => {
  const smoke = new SurfaceSmoke();
  smoke.sample(at(0), front, 0);
  smoke.sample(at(0.02), front, 0.05);
  smoke.sample(at(0.04), front, 0.1);
  assert.equal(smoke.uniforms.uSmokeCount.value, 1);
  assert.equal(smoke.uniforms.uSmokePoints.value[0].w, 0);
  assert.equal(smoke.advance(0.1), 0, "one point does not form visible smoke");

  smoke.sample(at(0.05), front, 0.15);
  assert.equal(smoke.uniforms.uSmokeCount.value, 2);
  close(smoke.uniforms.uSmokePoints.value[0].x, 0.05);
  close(smoke.uniforms.uSmokePoints.value[0].w, 0.15);
  assert.equal(smoke.uniforms.uSmokeNormals.value[0].w, 1);
  close(smoke.advance(0.15), 0.15 + smokeLifetime);
});

test("stationary input and sub-spacing jitter do not refresh a stroke's lifetime", () => {
  const smoke = new SurfaceSmoke();
  smoke.sample(at(0), front, 0);
  smoke.sample(at(0.06), front, 0.1);
  const retained = smoke.uniforms.uSmokePoints.value.slice(0, 2).map((point) => point.toArray());

  for (let tick = 2; tick <= 20; tick++) {
    const x = tick % 2 === 0 ? 0.06 : 0.07;
    smoke.sample(at(x), front, tick * 0.1);
  }
  assert.equal(smoke.uniforms.uSmokeCount.value, 2);
  assert.deepEqual(
    smoke.uniforms.uSmokePoints.value.slice(0, 2).map((point) => point.toArray()),
    retained
  );
  close(smoke.advance(2.1), 0.1 + smokeLifetime);
  close(smoke.advance(smokeLifetime), 0.1 + smokeLifetime, "the final painted endpoint finishes fading independently");
  assert.equal(smoke.uniforms.uSmokeCount.value, 1);
  assert.equal(smoke.advance(smokeLifetime + 0.11), 0);
  assert.equal(smoke.uniforms.uSmokeCount.value, 0);
});

test("moving farther between events fills the stroke with spaced, time-ordered samples", () => {
  const smoke = new SurfaceSmoke();
  smoke.sample(at(0), front, 0);
  smoke.sample(at(0.24), front, 0.12);

  assert.equal(smoke.uniforms.uSmokeCount.value, 4);
  const points = smoke.uniforms.uSmokePoints.value;
  const normals = smoke.uniforms.uSmokeNormals.value;
  for (let i = 0; i < 4; i++) {
    close(points[i].x, 0.24 - i * 0.08);
    close(points[i].w, 0.12 - i * 0.04);
    assert.equal(normals[i].w, i < 3 ? 1 : 0);
    assert.deepEqual(normals[i].toArray().slice(0, 3), [0, 0, 1]);
    if (i < 3) assert.ok(points[i].x - points[i + 1].x <= 0.09);
  }
});

test("a surface miss breaks connectivity while the preceding stroke can finish fading", () => {
  const smoke = new SurfaceSmoke();
  smoke.sample(at(0), front, 0);
  smoke.sample(at(0.06), front, 0.05);
  // The pointer integration calls breakStroke when its ray misses the surface.
  smoke.breakStroke();
  assert.equal(smoke.uniforms.uSmokeCount.value, 2);
  close(smoke.advance(0.06), 0.05 + smokeLifetime);

  smoke.sample(at(0.12), front, 0.1);
  assert.equal(smoke.uniforms.uSmokeCount.value, 3);
  assert.equal(smoke.uniforms.uSmokeNormals.value[0].w, 0, "reentry does not join the previous stroke");
  close(smoke.advance(0.1), 0.05 + smokeLifetime);

  smoke.sample(at(0.18), front, 0.15);
  assert.deepEqual(
    smoke.uniforms.uSmokeNormals.value.slice(0, 4).map((normal) => normal.w),
    [1, 0, 1, 0]
  );
  close(smoke.advance(0.15), 0.15 + smokeLifetime);
});

for (const { reason, position, normal, time } of [
  { reason: "a long input gap", position: 0.12, normal: front, time: 0.3 },
  { reason: "a large spatial jump", position: 1, normal: front, time: 0.1 },
  { reason: "an opposing surface normal", position: 0.12, normal: new Vector3(0, 0, -1), time: 0.1 },
]) {
  test(`${reason} starts a new stroke without interpolating across the discontinuity`, () => {
    const smoke = new SurfaceSmoke();
    smoke.sample(at(0), front, 0);
    smoke.sample(at(0.06), front, 0.05);
    smoke.sample(at(position), normal, time);

    assert.equal(smoke.uniforms.uSmokeCount.value, 3);
    close(smoke.uniforms.uSmokePoints.value[0].x, position);
    assert.equal(smoke.uniforms.uSmokePoints.value[0].w, time);
    assert.equal(smoke.uniforms.uSmokeNormals.value[0].w, 0);
    close(smoke.uniforms.uSmokePoints.value[1].x, 0.06);
    close(smoke.advance(time), 0.05 + smokeLifetime, "the disconnected point does not extend existing smoke");

    smoke.sample(at(position + 0.06), normal, time + 0.05);
    assert.equal(smoke.uniforms.uSmokeCount.value, 4);
    assert.deepEqual(
      smoke.uniforms.uSmokeNormals.value.slice(0, 4).map((value) => value.w),
      [1, 0, 1, 0]
    );
    close(smoke.advance(time + 0.05), time + 0.05 + smokeLifetime);
  });
}

test("the fixed shader capacity retains the newest samples even with a larger caller limit", () => {
  const smoke = new SurfaceSmoke();
  const capacity = smoke.uniforms.uSmokePoints.value.length;
  assert.equal(capacity, 32);
  for (let i = 0; i < 45; i++) smoke.sample(at(i * 0.06), front, i * 0.02, 100);

  assert.equal(smoke.uniforms.uSmokeCount.value, capacity);
  assert.equal(smoke.uniforms.uSmokeNormals.value.length, capacity);
  for (let i = 0; i < capacity; i++) {
    close(smoke.uniforms.uSmokePoints.value[i].x, (44 - i) * 0.06);
    close(smoke.uniforms.uSmokePoints.value[i].w, (44 - i) * 0.02);
  }
});

test("lowering the quality limit truncates old history and remains bounded during interpolation", () => {
  const smoke = new SurfaceSmoke();
  for (let i = 0; i < 20; i++) smoke.sample(at(i * 0.06), front, i * 0.02);
  smoke.sample(at(1.2), front, 0.4, 8);
  assert.equal(smoke.uniforms.uSmokeCount.value, 8);
  close(smoke.uniforms.uSmokePoints.value[0].x, 1.2);
  close(smoke.uniforms.uSmokePoints.value[7].x, 0.78);

  smoke.sample(at(1.44), front, 0.5, 8);
  assert.equal(smoke.uniforms.uSmokeCount.value, 8);
  close(smoke.uniforms.uSmokePoints.value[0].x, 1.44);
  close(smoke.uniforms.uSmokePoints.value[7].x, 0.96);
  assert.equal(smoke.uniforms.uSmokePoints.value.length, 32);
});

test("sampling, expiry, and clear reuse uniform arrays and all vector slots", () => {
  const smoke = new SurfaceSmoke();
  const uniforms = smoke.uniforms;
  const entries = Object.values(uniforms);
  const pointArray = uniforms.uSmokePoints.value;
  const normalArray = uniforms.uSmokeNormals.value;
  const points = [...pointArray];
  const normals = [...normalArray];
  const input = at(0);
  smoke.sample(input, front, 0);
  input.set(9, 9, 9);
  assert.deepEqual(pointArray[0].toArray(), [0, 0, 0, 0], "the buffer copies input coordinates");
  for (let i = 1; i < 45; i++) smoke.sample(at(i * 0.06), front, i * 0.02);
  smoke.sample(at(2.7), front, 0.9, 8);
  smoke.advance(10);
  smoke.clear();
  smoke.sample(at(0), front, 11);

  assert.equal(smoke.uniforms, uniforms);
  Object.values(smoke.uniforms).forEach((entry, i) => assert.equal(entry, entries[i]));
  assert.equal(uniforms.uSmokePoints.value, pointArray);
  assert.equal(uniforms.uSmokeNormals.value, normalArray);
  points.forEach((point, i) => assert.equal(pointArray[i], point));
  normals.forEach((normal, i) => assert.equal(normalArray[i], normal));
});

test("retained stroke endpoints expire independently from the final volume fade", () => {
  const smoke = new SurfaceSmoke();
  smoke.sample(at(0), front, 0);
  smoke.sample(at(0.06), front, 0.1);
  smoke.sample(at(0.12), front, 0.2);
  close(smoke.advance(smokeLifetime - 0.01), 0.2 + smokeLifetime);
  assert.equal(smoke.uniforms.uSmokeCount.value, 3);
  close(smoke.advance(smokeLifetime + 0.01), 0.2 + smokeLifetime);
  assert.equal(smoke.uniforms.uSmokeCount.value, 2);
  close(smoke.advance(smokeLifetime + 0.11), 0.2 + smokeLifetime);
  assert.equal(smoke.uniforms.uSmokeCount.value, 1);
  assert.equal(smoke.advance(smokeLifetime + 0.21), 0);
  assert.equal(smoke.uniforms.uSmokeCount.value, 0);
  assert.equal(smoke.uniforms.uSmokeTime.value, smokeLifetime + 0.21);
  assert.equal(smoke.advance(20), 0);

  smoke.sample(at(0.13), front, 20.01);
  assert.equal(smoke.uniforms.uSmokeCount.value, 1);
  assert.equal(smoke.uniforms.uSmokeNormals.value[0].w, 0, "new input does not connect to expired history");
  assert.equal(smoke.advance(20.01), 0);
});

test("clear removes the stroke immediately and resets continuity for the next input", () => {
  const smoke = new SurfaceSmoke();
  smoke.sample(at(0), front, 0);
  smoke.sample(at(0.06), front, 0.05);
  smoke.clear();
  assert.equal(smoke.uniforms.uSmokeCount.value, 0);
  assert.equal(smoke.advance(0.06), 0);

  smoke.sample(at(0.12), front, 0.1);
  assert.equal(smoke.uniforms.uSmokeCount.value, 1);
  assert.equal(smoke.uniforms.uSmokeNormals.value[0].w, 0);
  assert.equal(smoke.advance(0.1), 0);
});

test("bounds configure a fixed filtered volume and map a translated surface into it", () => {
  const smoke = new SurfaceSmoke();
  const bounds = new Box3(new Vector3(10, 20, 30), new Vector3(12, 24, 36));
  smoke.setBounds(bounds);
  const texture = smoke.uniforms.uSmokeVolume.value;
  assert.deepEqual([texture.image.width, texture.image.height, texture.image.depth], [48, 48, 32]);
  assert.equal(texture.image.data.length, 48 * 48 * 32 * 4);
  assert.equal(texture.minFilter, LinearFilter);
  assert.equal(texture.magFilter, LinearFilter);
  assert.deepEqual(smoke.uniforms.uSmokeMin.value.toArray(), [9.5, 19.5, 29.5]);
  assert.deepEqual(smoke.uniforms.uSmokeExtent.value.toArray(), [3, 5, 7]);
  assert.deepEqual(bounds.min.toArray(), [10, 20, 30], "the caller's bounds are not mutated");
  assertEmptyWake(smoke);

  smoke.sample(new Vector3(11, 22, 33), front, 0);
  smoke.sample(new Vector3(11.12, 22, 33), front, 0.1);
  smoke.advance(0.2);
  assert.ok(volumeCell(smoke, new Vector3(11.12, 22, 33))[3] > 0);
  assert.equal(volumeCell(smoke, new Vector3(10, 20, 30))[3], 0);
});

test("isolated and disconnected points leave the wake empty until a stroke connects", () => {
  const smoke = boundedSmoke();
  smoke.sample(at(-0.2), front, 0);
  assert.equal(smoke.advance(0.05), 0);
  assertEmptyWake(smoke);
  smoke.breakStroke();
  smoke.sample(at(0), front, 0.1);
  assert.equal(smoke.advance(0.15), 0);
  assertEmptyWake(smoke);

  smoke.sample(at(0.06), front, 0.2);
  close(smoke.advance(0.3), 0.2 + smokeLifetime);
  assert.ok(maximumAlpha(smoke) > 0);
  assert.equal(smoke.uniforms.uSmokeActive.value, 1);
});

test("the wake is localized along the surface with a soft tangent edge and a thin normal shell", () => {
  const smoke = boundedSmoke();
  smoke.sample(at(0), front, 0);
  smoke.sample(at(0.12), front, 0.1);
  smoke.advance(0.2);
  const center = volumeCell(smoke, at(0.12))[3];
  const edge = volumeCell(smoke, new Vector3(0.12, 0.25, 0))[3];
  assert.ok(center > edge && edge > 0, "the footprint fades across neighboring tangent cells");
  assert.equal(volumeCell(smoke, new Vector3(0.12, 0.8, 0))[3], 0);
  assert.equal(
    volumeCell(smoke, new Vector3(0.12, 0, 0.3))[3],
    0,
    "a nearby parallel surface outside the normal shell is untouched"
  );
});

test("separate gestures paint their own wakes without filling the space between them", () => {
  const smoke = new SurfaceSmoke();
  smoke.setBounds(new Box3(new Vector3(-1, -0.5, -0.5), new Vector3(1, 0.5, 0.5)));
  smoke.sample(at(-0.6), front, 0);
  smoke.sample(at(-0.54), front, 0.05);
  smoke.breakStroke();
  smoke.sample(at(0.6), front, 0.1);
  smoke.advance(0.15);
  assert.equal(volumeCell(smoke, at(0.6))[3], 0, "the disconnected seed paints no dot");
  smoke.sample(at(0.66), front, 0.2);
  smoke.advance(0.3);
  assert.ok(volumeCell(smoke, at(-0.54))[3] > 0);
  assert.ok(volumeCell(smoke, at(0.66))[3] > 0);
  assert.equal(volumeCell(smoke, at(0))[3], 0, "the gestures do not acquire a connecting wake");
});

test("a painted endpoint fades in and out smoothly without new pointer input", () => {
  const smoke = boundedSmoke();
  smoke.sample(at(0), front, 0);
  smoke.sample(at(0.12), front, 0.1);
  const alphaAt = (time) => {
    smoke.advance(time);
    // This fringe lies beyond the earlier stamps, so it belongs to the new endpoint.
    return volumeCell(smoke, at(0.54))[3];
  };
  const fadeIn = [0.1, 0.125, 0.15, 0.2].map(alphaAt);
  assert.equal(fadeIn[0], 0);
  assert.ok(fadeIn[1] > 0 && fadeIn[1] < fadeIn[2] && fadeIn[2] < fadeIn[3]);
  const fadeOut = [0.5, 1.2, 1.8, smokeLifetime + 0.11].map(alphaAt);
  assert.ok(fadeOut[0] > fadeOut[1] && fadeOut[1] > fadeOut[2] && fadeOut[2] > 0);
  assert.equal(fadeOut[3], 0);
  assert.equal(smoke.uniforms.uSmokeActive.value, 0);
  assertEmptyWake(smoke);
});

test("a new zero-age sample cannot dim the bright wake where brush footprints overlap", () => {
  const smoke = boundedSmoke();
  smoke.sample(at(0), front, 0);
  smoke.sample(at(0.12), front, 0.1);
  smoke.advance(0.2);
  const { data } = smoke.uniforms.uSmokeVolume.value.image;
  const before = data.slice();
  assert.ok(maximumAlpha(smoke) > 128, "the preceding wake is already bright");

  // Hold the clock still so any drop comes from restamping rather than normal decay.
  smoke.sample(at(0.18), front, 0.2);
  smoke.advance(0.2);
  assert.equal(smoke.uniforms.uSmokePoints.value[0].w, 0.2, "a fresh sample was retained");
  let overlapCells = 0;
  for (let offset = 3; offset < data.length; offset += 4) {
    if (!before[offset]) continue;
    assert.ok(data[offset] >= before[offset], `restamping reduced alpha from ${before[offset]} to ${data[offset]}`);
    overlapCells++;
  }
  assert.ok(overlapCells > 0);
});

for (const { name, normal } of [
  { name: "front", normal: front },
  { name: "back", normal: new Vector3(0, 0, -1) },
  { name: "side", normal: new Vector3(1, 0, 0) },
  { name: "diagonal", normal: new Vector3(1, 2, 3).normalize() },
]) {
  test(`${name} wake normals keep their signed direction while alpha fades`, () => {
    const smoke = boundedSmoke();
    const end = new Vector3(0, 1, 0).cross(normal).normalize().multiplyScalar(0.12);
    smoke.sample(at(0), normal, 0);
    smoke.sample(end, normal, 0.1);
    for (const time of [0.2, 1.2, 1.6]) {
      smoke.advance(time);
      const { data } = smoke.uniforms.uSmokeVolume.value.image;
      let checked = 0;
      for (let offset = 0; offset < data.length; offset += 4) {
        const alpha = data[offset + 3];
        if (!alpha) {
          assert.equal(data[offset], 128);
          assert.equal(data[offset + 1], 128);
          assert.equal(data[offset + 2], 128);
        }
        if (alpha < 32) continue;
        const direction = new Vector3(data[offset] - 128, data[offset + 1] - 128, data[offset + 2] - 128);
        assert.ok(
          Math.abs(direction.length() - (127 * alpha) / 255) < 2,
          "encoded magnitude follows density before linear filtering"
        );
        assert.ok(direction.normalize().dot(normal) > 0.995, "quantized normal keeps its original facing");
        checked++;
      }
      assert.ok(checked > 0, "the fixture contains strongly painted cells");
    }
  });
}

test("volume activity outlives expired buffer segments until the final painted endpoint fades", () => {
  const smoke = boundedSmoke();
  smoke.sample(at(0), front, 0);
  // Turning across the surface paints cells outside the older face's thin shell.
  smoke.sample(at(0.06), new Vector3(1, 0, 1).normalize(), 0.17);
  const until = smoke.advance(smokeLifetime + 0.01);
  assert.equal(smoke.uniforms.uSmokeCount.value, 1, "the old stroke endpoint has already expired");
  assert.ok(maximumAlpha(smoke) >= 2, "the final endpoint still has visible mask density");
  assert.equal(smoke.uniforms.uSmokeActive.value, 1);
  close(until, 0.17 + smokeLifetime);
  assert.equal(smoke.advance(until + 0.01), 0);
  assert.equal(smoke.uniforms.uSmokeActive.value, 0);
  assertEmptyWake(smoke);
});

test("texture uploads occur only when stored pixels change and stop after clear", () => {
  const smoke = boundedSmoke();
  const texture = smoke.uniforms.uSmokeVolume.value;
  const initialVersion = texture.version;
  smoke.advance(0);
  smoke.sample(at(0), front, 0);
  smoke.advance(0.05);
  assert.equal(texture.version, initialVersion, "idle and isolated input require no upload");
  smoke.sample(at(0.12), front, 0.1);
  smoke.advance(0.2);
  assert.ok(texture.version > initialVersion);
  const paintedVersion = texture.version;
  smoke.advance(0.2);
  smoke.advance(0.25);
  assert.equal(texture.version, paintedVersion, "equal pixels and the full-density plateau require no upload");
  smoke.advance(1.2);
  assert.ok(texture.version > paintedVersion);
  const fadedVersion = texture.version;
  smoke.clear();
  assert.ok(texture.version > fadedVersion, "clearing visible pixels updates the texture");
  assertEmptyWake(smoke);
  const clearedVersion = texture.version;
  smoke.clear();
  smoke.advance(10);
  smoke.advance(20);
  assert.equal(texture.version, clearedVersion, "an empty mask stays idle");
});

test("clear and bounds changes reuse the texture and data while removing stale paint and continuity", () => {
  const smoke = boundedSmoke();
  const texture = smoke.uniforms.uSmokeVolume.value;
  const data = texture.image.data;
  const min = smoke.uniforms.uSmokeMin.value;
  const extent = smoke.uniforms.uSmokeExtent.value;
  smoke.sample(at(0), front, 0);
  smoke.sample(at(0.12), front, 0.1);
  smoke.advance(0.2);
  assert.ok(maximumAlpha(smoke) > 0);
  smoke.clear();
  assertEmptyWake(smoke);
  assert.equal(smoke.uniforms.uSmokeCount.value, 0);
  assert.equal(smoke.uniforms.uSmokeActive.value, 0);
  smoke.sample(at(0.18), front, 0.25);
  assert.equal(smoke.advance(0.3), 0);
  assertEmptyWake(smoke);
  smoke.sample(at(0.24), front, 0.35);
  smoke.advance(0.5);
  assert.ok(maximumAlpha(smoke) > 0);

  smoke.setBounds(new Box3(new Vector3(2, 3, 4), new Vector3(3, 5, 7)));
  assertEmptyWake(smoke);
  assert.equal(smoke.uniforms.uSmokeCount.value, 0);
  assert.equal(smoke.uniforms.uSmokeActive.value, 0);
  assert.equal(smoke.uniforms.uSmokeVolume.value, texture);
  assert.equal(texture.image.data, data);
  assert.equal(smoke.uniforms.uSmokeMin.value, min);
  assert.equal(smoke.uniforms.uSmokeExtent.value, extent);
  assert.deepEqual(min.toArray(), [1.5, 2.5, 3.5]);
  assert.deepEqual(extent.toArray(), [2, 3, 4]);
});
