import { Box3, Data3DTexture, LinearFilter, RGBAFormat, Vector3, Vector4, type MeshPhysicalMaterial } from "three";

const capacity = 32;
export const smokeLifetime = 2.2;
const spacing = 0.045;
const volumeSize = [48, 48, 32] as const;

function smoothstep(low: number, high: number, value: number) {
  const t = Math.max(0, Math.min(1, (value - low) / (high - low)));
  return t * t * (3 - 2 * t);
}

/** Only the soft pointer wake is rasterized; the visible smoke is procedural. */
class SmokeWake {
  readonly data = new Uint8Array(volumeSize[0] * volumeSize[1] * volumeSize[2] * 4);
  readonly texture = new Data3DTexture(this.data, ...volumeSize);
  readonly min = new Vector3(-1.8, -1.8, -1.8);
  readonly extent = new Vector3(3.6, 3.6, 3.6);
  private readonly strength = new Uint8Array(this.data.length / 4);
  private readonly initial = new Uint8Array(this.strength.length);
  private readonly normals = new Int8Array((this.data.length / 4) * 3);
  private readonly birth = new Float64Array(this.strength.length);
  private readonly occupied = new Uint32Array(this.strength.length);
  private count = 0;
  private dirty = false;

  constructor() {
    this.resetPixels();
    this.texture.format = RGBAFormat;
    this.texture.minFilter = this.texture.magFilter = LinearFilter;
    this.texture.needsUpdate = true;
  }

  setBounds(bounds: Box3) {
    this.clear();
    this.min.copy(bounds.min).addScalar(-0.5);
    bounds.getSize(this.extent).addScalar(1);
  }

  clear() {
    if (!this.count) return;
    this.resetPixels();
    this.strength.fill(0);
    this.initial.fill(0);
    this.count = 0;
    this.texture.needsUpdate = true;
    this.dirty = false;
  }

  private resetPixels() {
    this.data.fill(128);
    for (let i = 3; i < this.data.length; i += 4) this.data[i] = 0;
  }

  paint(point: Vector3, normal: Vector3, birth: number, now: number) {
    const [width, height, depth] = volumeSize;
    const sx = this.extent.x / width,
      sy = this.extent.y / height,
      sz = this.extent.z / depth;
    const px = (point.x - this.min.x) / sx - 0.5;
    const py = (point.y - this.min.y) / sy - 0.5;
    const pz = (point.z - this.min.z) / sz - 0.5;
    const radius = 0.46;
    const x0 = Math.max(0, Math.ceil(px - radius / sx)),
      x1 = Math.min(width - 1, Math.floor(px + radius / sx));
    const y0 = Math.max(0, Math.ceil(py - radius / sy)),
      y1 = Math.min(height - 1, Math.floor(py + radius / sy));
    const z0 = Math.max(0, Math.ceil(pz - radius / sz)),
      z1 = Math.min(depth - 1, Math.floor(pz + radius / sz));
    for (let z = z0; z <= z1; z++) {
      const dz = (z - pz) * sz;
      for (let y = y0; y <= y1; y++) {
        const dy = (y - py) * sy;
        for (let x = x0; x <= x1; x++) {
          const dx = (x - px) * sx;
          const normalDistance = dx * normal.x + dy * normal.y + dz * normal.z;
          if (Math.abs(normalDistance) >= 0.16) continue;
          const tangentSquared = Math.max(0, dx * dx + dy * dy + dz * dz - normalDistance * normalDistance);
          const footprint = Math.exp(-tangentSquared / 0.055) * (1 - smoothstep(0.035, 0.16, Math.abs(normalDistance)));
          const candidate = Math.round(255 * footprint);
          if (candidate < 2) continue;
          const index = x + width * (y + height * z);
          if (this.strength[index] && birth < this.birth[index]) continue;
          const oldAge = Math.max(0, now - this.birth[index]);
          const previous =
            (this.initial[index] + (this.strength[index] - this.initial[index]) * smoothstep(0, 0.1, oldAge)) *
            (1 - smoothstep(0.3, smokeLifetime, oldAge));
          if (candidate < previous) continue;
          if (!this.strength[index]) this.occupied[this.count++] = index;
          this.strength[index] = candidate;
          // Renew from the currently visible density, so fresh stamps never erase
          // bright mist while their fade-in catches up.
          this.initial[index] = Math.round(previous);
          this.birth[index] = birth;
          this.normals[index * 3] = Math.round(normal.x * 127);
          this.normals[index * 3 + 1] = Math.round(normal.y * 127);
          this.normals[index * 3 + 2] = Math.round(normal.z * 127);
          this.dirty = true;
        }
      }
    }
  }

  advance(now: number) {
    let until = 0;
    for (let slot = 0; slot < this.count; slot++) {
      const index = this.occupied[slot];
      const age = Math.max(0, now - this.birth[index]);
      const ramp = this.initial[index] + (this.strength[index] - this.initial[index]) * smoothstep(0, 0.1, age);
      const alpha = Math.round(ramp * (1 - smoothstep(0.3, smokeLifetime, age)));
      // Premultiply the signed normal by density before trilinear filtering.
      // Empty texels contribute zero direction, rather than an arbitrary back normal.
      for (let component = 0; component < 3; component++) {
        const value = 128 + Math.round((this.normals[index * 3 + component] * alpha) / 255);
        if (this.data[index * 4 + component] !== value) {
          this.data[index * 4 + component] = value;
          this.dirty = true;
        }
      }
      if (this.data[index * 4 + 3] !== alpha) {
        this.data[index * 4 + 3] = alpha;
        this.dirty = true;
      }
      if (age >= smokeLifetime) {
        this.strength[index] = 0;
        this.initial[index] = 0;
        this.occupied[slot--] = this.occupied[--this.count];
      } else until = Math.max(until, this.birth[index] + smokeLifetime);
    }
    if (this.dirty) {
      this.texture.needsUpdate = true;
      this.dirty = false;
    }
    return until;
  }
}

/** Shared with the environment so both effects use the same demand-render clock. */
export class SurfaceActivity {
  readonly version: string;
  constructor(version = "") {
    this.version = version;
  }

  private until = 0;
  private wake = () => {};
  getUntil() {
    return this.until;
  }
  setUntil(until: number) {
    this.until = until;
  }
  request(until: number) {
    this.until = Math.max(this.until, until);
    this.wake();
  }
  subscribe(wake: () => void) {
    this.wake = wake;
    return () => {
      if (this.wake === wake) this.wake = () => {};
    };
  }
}

// Object-space coordinates avoid UV seams and keep strokes attached when orbiting.
const declarations = /* glsl */ `
  varying vec3 vSmokePosition;
  varying vec3 vSmokeNormal;
  precision highp sampler3D;
  uniform sampler3D uSmokeVolume;
  uniform vec3 uSmokeMin;
  uniform vec3 uSmokeExtent;
  uniform int uSmokeActive;
  uniform float uSmokeTime;

  float smokeHash(vec3 p) {
    p = fract(p * .1031);
    p += dot(p, p.yzx + 33.33);
    return fract((p.x + p.y) * p.z);
  }

  float smokeNoise(vec3 p) {
    vec3 i = floor(p), f = fract(p);
    // Quintic interpolation keeps the field's first two derivatives continuous.
    f = f * f * f * (f * (f * 6. - 15.) + 10.);
    return mix(
      mix(mix(smokeHash(i), smokeHash(i + vec3(1, 0, 0)), f.x),
          mix(smokeHash(i + vec3(0, 1, 0)), smokeHash(i + vec3(1, 1, 0)), f.x), f.y),
      mix(mix(smokeHash(i + vec3(0, 0, 1)), smokeHash(i + vec3(1, 0, 1)), f.x),
          mix(smokeHash(i + vec3(0, 1, 1)), smokeHash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
  }

  float smokeFbm(vec3 p, bool detailed) {
    const mat3 turn = mat3(0., .8, .6, -.8, .36, -.48, -.6, -.48, .64);
    float field = 0.;
    float amplitude = .5;
    for (int octave = 0; octave < 3; octave++) {
      if (!detailed && octave == 2) break;
      field += amplitude * smokeNoise(p);
      p = turn * p * 2.02 + vec3(3.1, 7.7, 1.9);
      amplitude *= .5;
    }
    return field / (detailed ? .875 : .75);
  }

  // Analytic coverage rather than a subpixel hard edge: MSAA only covers geometry.
  float smokeFold(float distanceToFold, float width, float pixelWidth) {
    float aa = pixelWidth * .8;
    float edge = 1. - smoothstep(max(0., width - aa), width + aa, abs(distanceToFold));
    float radius = distanceToFold / max(width + aa, .0001);
    float mist = exp(-radius * radius * .5);
    return edge * .35 + mist * .65;
  }

  struct SmokeField {
    vec3 folds;
    vec3 widths;
    float wake;
    float breakup;
    float haze;
  };

  SmokeField surfaceSmoke() {
    SmokeField field;
    field.folds = vec3(1.);
    field.widths = vec3(.02);
    field.wake = 0.;
    field.breakup = 0.;
    field.haze = 0.;
    // The usual idle frame takes this branch before texture or noise evaluation.
    if (uSmokeActive == 0) return field;
    vec3 p = vSmokePosition;
    vec3 surfaceNormal = normalize(vSmokeNormal);
    vec4 imprint = texture(uSmokeVolume, (p - uSmokeMin) / uSmokeExtent);
    if (imprint.a < .006) return field;
    vec3 paintedDirection = imprint.rgb * 255. - 128.;
    vec3 paintedNormal = paintedDirection / max(length(paintedDirection), .0001);
    float wake = imprint.a * smoothstep(.2, .8, dot(surfaceNormal, paintedNormal));
    if (wake < .006) return field;
    float drift = uSmokeTime * .12;
    // One continuous object-space field: switching nearest pointer segments cannot
    // change the smoke's coordinates or introduce seams in a curved gesture.
    vec3 flow = p * 2.1 - vec3(0., drift * .7, drift * .3);
    // Nested domain warping folds the same continuous field into rolling wisps.
    // The final noise deforms their position, rather than painting dots on a blur.
    vec2 warp = vec2(smokeFbm(flow + vec3(0., -drift, 0.), false),
                     smokeFbm(flow + vec3(4.7, 1.3, drift), false));
    float folds = smokeFbm(flow + vec3(warp * 1.8, drift * .5), true);
    float strand = (folds - .52) * 1.25;
    float breathing = sin(p.y * 2.7 + p.x * 1.4 + folds * 3. - uSmokeTime * .4);
    float ribbonWidth = .012 + .009 * warp.x;
    // A pale primary fold and two offset violet folds, with open, transparent gaps.
    field.folds = vec3(strand, strand - .085 - breathing * .025, strand + .075 + (warp.y - .5) * .045);
    field.widths = ribbonWidth * vec3(1., .7, .5);
    field.wake = wake;
    field.breakup = smoothstep(.2, .63, warp.y + breathing * .1);
    // Translucent film behind the folds gives depth without filling their gaps.
    float film = smoothstep(-.065, .01, strand) * (1. - smoothstep(.055, .15, strand));
    field.haze = film * .36 + smoothstep(.32, .74, folds) * .035;
    return field;
  }
`;

/** A bounded, reusable stroke buffer. Pointer events never allocate shader uniforms. */
export class SurfaceSmoke {
  private readonly wake = new SmokeWake();
  readonly uniforms = {
    uSmokePoints: { value: Array.from({ length: capacity }, () => new Vector4()) },
    uSmokeNormals: { value: Array.from({ length: capacity }, () => new Vector4()) },
    uSmokeTime: { value: 0 },
    uSmokeCount: { value: 0 },
    uSmokeActive: { value: 0 },
    uSmokeVolume: { value: this.wake.texture },
    uSmokeMin: { value: this.wake.min },
    uSmokeExtent: { value: this.wake.extent },
  };
  private connected = false;
  private inputTime = -Infinity;
  private readonly start = new Vector3();
  private readonly startNormal = new Vector3();
  private readonly point = new Vector3();
  private readonly normal = new Vector3();
  setBounds(bounds: Box3) {
    this.clear();
    this.wake.setBounds(bounds);
  }

  dispose() {
    this.wake.texture.dispose();
  }

  breakStroke() {
    this.connected = false;
  }

  clear() {
    this.wake.clear();
    this.uniforms.uSmokeCount.value = 0;
    this.uniforms.uSmokeActive.value = 0;
    this.inputTime = -Infinity;
    this.breakStroke();
  }

  sample(point: Vector3, normal: Vector3, now: number, limit = capacity) {
    this.advance(now);
    const count = this.uniforms.uSmokeCount.value;
    const previous = this.uniforms.uSmokePoints.value[0];
    this.start.set(previous.x, previous.y, previous.z);
    const previousNormal = this.uniforms.uSmokeNormals.value[0];
    this.startNormal.set(previousNormal.x, previousNormal.y, previousNormal.z);
    const distance = this.start.distanceTo(point);
    const connect =
      this.connected &&
      count > 0 &&
      now - this.inputTime < 0.18 &&
      distance < 0.55 &&
      this.startNormal.dot(normal) > 0.3;
    this.inputTime = now;
    this.connected = true;
    if (!connect) {
      this.push(point, normal, now, false, limit);
      return;
    }
    // A resting pointer fades out; small jitter cannot keep refreshing a bright dot.
    if (distance < spacing) return;
    const startTime = previous.w;
    this.wake.paint(this.start, this.startNormal, startTime, now);
    const steps = Math.ceil(distance / 0.09);
    for (let step = 1; step <= steps; step++) {
      const t = step / steps;
      this.point.lerpVectors(this.start, point, t);
      this.normal.lerpVectors(this.startNormal, normal, t).normalize();
      const birth = startTime + (now - startTime) * t;
      this.push(this.point, this.normal, birth, true, limit);
      this.wake.paint(this.point, this.normal, birth, now);
    }
  }

  private push(point: Vector3, normal: Vector3, now: number, connected: boolean, limit: number) {
    const { uSmokePoints: points, uSmokeNormals: normals, uSmokeCount: count } = this.uniforms;
    count.value = Math.min(count.value + 1, limit, capacity);
    for (let i = count.value - 1; i > 0; i--) {
      points.value[i].copy(points.value[i - 1]);
      normals.value[i].copy(normals.value[i - 1]);
    }
    points.value[0].set(point.x, point.y, point.z, now);
    normals.value[0].set(normal.x, normal.y, normal.z, connected ? 1 : 0);
  }

  advance(now: number, flowTime = now) {
    const until = this.wake.advance(now);
    this.uniforms.uSmokeActive.value = until ? 1 : 0;
    this.uniforms.uSmokeTime.value = flowTime;
    const count = this.uniforms.uSmokeCount;
    while (count.value && now - this.uniforms.uSmokePoints.value[count.value - 1].w >= smokeLifetime) count.value--;
    return until;
  }
}

// Keep shader code outside the ref-held buffer: Fast Refresh can retain that instance.
// Every compilation must use the current module's code while preserving live uniforms.
export function compileSurfaceSmoke(
  shader: Parameters<MeshPhysicalMaterial["onBeforeCompile"]>[0],
  uniforms: SurfaceSmoke["uniforms"]
) {
  Object.assign(shader.uniforms, uniforms);
  shader.vertexShader = "varying vec3 vSmokePosition; varying vec3 vSmokeNormal;\n" + shader.vertexShader;
  shader.vertexShader = shader.vertexShader.replace(
    "#include <begin_vertex>",
    "#include <begin_vertex>\nvSmokePosition = position; vSmokeNormal = normal;"
  );
  shader.fragmentShader = declarations + shader.fragmentShader;
  shader.fragmentShader = shader.fragmentShader.replace(
    "#include <color_fragment>",
    `#include <color_fragment>
       float smokeDensity = 0.;
       float smokeHighlight = 0.;
       // Uniform branch: idle frames skip the entire effect, including derivatives.
       if (uSmokeActive != 0) {
         // All lanes return from the field function before taking derivatives.
         float smokePixelWidth = max(length(dFdx(vSmokePosition)), length(dFdy(vSmokePosition)));
         SmokeField smokeField = surfaceSmoke();
         vec3 smokeAA = max(vec3(smokePixelWidth), fwidth(smokeField.folds));
         vec3 smokeFolds = vec3(
           smokeFold(smokeField.folds.x, smokeField.widths.x, smokeAA.x),
           smokeFold(smokeField.folds.y, smokeField.widths.y, smokeAA.y),
           smokeFold(smokeField.folds.z, smokeField.widths.z, smokeAA.z)
         );
         smokeDensity = clamp(smokeField.wake * (dot(smokeFolds, vec3(.65, .4, .2)) * smokeField.breakup + smokeField.haze), 0., 1.);
         smokeHighlight = smokeFolds.x * smokeField.breakup * smokeField.wake;
         diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.3, .12, .48), smokeDensity * .4);
       }`
  );
  shader.fragmentShader = shader.fragmentShader.replace(
    "#include <roughnessmap_fragment>",
    "#include <roughnessmap_fragment>\nroughnessFactor += smokeDensity * .065;"
  );
  shader.fragmentShader = shader.fragmentShader.replace(
    "#include <emissivemap_fragment>",
    "#include <emissivemap_fragment>\ntotalEmissiveRadiance += mix(vec3(.09, .024, .19), vec3(.19, .095, .32), smokeHighlight) * smokeDensity;"
  );
}

// Refresh both the GPU program and ref-held CPU buffer after effect edits.
let signature = 2166136261;
for (const character of declarations +
  compileSurfaceSmoke.toString() +
  SurfaceSmoke.toString() +
  SmokeWake.toString() +
  SurfaceActivity.toString()) {
  signature = Math.imul(signature ^ character.charCodeAt(0), 16777619);
}
export const smokeProgramKey = () => `prism-surface-smoke-${signature >>> 0}`;
