import { BufferGeometry, Float32BufferAttribute, Shape } from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/** Rounded triangular solid with an offset front face and three broad curved side faces. */
export function createPrismGeometry() {
  const outline = new Shape();
  outline.moveTo(-1.24, -0.92);
  outline.bezierCurveTo(-1.52, -0.87, -1.46, -0.66, -1.3, -0.36);
  outline.bezierCurveTo(-0.91, 0.35, -0.42, 1.19, -0.18, 1.48);
  outline.bezierCurveTo(-0.05, 1.64, 0.09, 1.63, 0.22, 1.42);
  outline.bezierCurveTo(0.57, 0.88, 1.14, -0.12, 1.4, -0.64);
  outline.bezierCurveTo(1.57, -0.98, 1.25, -1.18, 0.91, -1.19);
  outline.bezierCurveTo(0.12, -1.24, -0.85, -1.06, -1.24, -0.92);
  const count = 192;
  const contour = outline.getSpacedPoints(count).slice(0, count);
  // Each layer is a cross-section of the entire solid, not a ridge on a flat plate.
  const profiles: { s: number; z: number; x: number; y: number }[] = [];
  const frontScale = 0.7;
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    profiles.push({ s: frontScale * t, z: 0.12 - 0.015 * t * t, x: 0.16 * t, y: 0.32 * t });
  }
  for (let i = 1; i <= 24; i++) {
    const t = i / 24,
      a = (t * Math.PI) / 2;
    profiles.push({ s: frontScale + (1 - frontScale) * Math.sin(a), z: 0.105 + 0.26 * Math.sin(a * 2) - 0.3 * (1 - Math.cos(a)), x: 0.16 * Math.cos(a), y: 0.32 * Math.cos(a) });
  }
  for (let i = 1; i <= 24; i++) {
    const t = i / 24,
      a = (t * Math.PI) / 2;
    profiles.push({ s: 1 - 0.14 * (1 - Math.cos(a)), z: -0.185 - 0.42 * Math.sin(a), x: -0.06 * Math.sin(a), y: -0.025 * Math.sin(a) });
  }
  for (let i = 1; i <= 24; i++) {
    const t = 1 - i / 24;
    profiles.push({ s: 0.86 * t, z: -0.605 - 0.035 * (1 - t * t), x: -0.06 * t, y: -0.025 * t });
  }
  const positions: number[] = [],
    indices: number[] = [];
  profiles.forEach((layer) => {
    contour.forEach((p) => {
      const x = p.x * layer.s + layer.x,
        y = (p.y - 0.14) * layer.s + layer.y;
      const bow = 0.025 * x * y;
      positions.push(x, y, layer.z + bow);
    });
  });
  for (let k = 0; k < profiles.length - 1; k++)
    for (let j = 0; j < count; j++) {
      const a = k * count + j,
        b = k * count + ((j + 1) % count),
        c = a + count,
        d = b + count;
      indices.push(a, b, c, b, d, c);
    }
  const source = new BufferGeometry();
  source.setAttribute("position", new Float32BufferAttribute(positions, 3));
  source.setIndex(indices);
  // Weld poles and seams before generating normals.
  const geometry = mergeVertices(source, 0.00001);
  const idx = geometry.getIndex()!,
    faces: number[] = [];
  for (let i = 0; i < idx.count; i += 3) {
    const a = idx.getX(i),
      b = idx.getX(i + 1),
      c = idx.getX(i + 2);
    if (a !== b && b !== c && c !== a) faces.push(a, b, c);
  }
  geometry.setIndex(faces);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  source.dispose();
  return geometry;
}
