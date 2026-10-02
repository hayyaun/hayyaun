import { readFileSync, writeFileSync } from "node:fs";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Mesh, MeshStandardMaterial } from "three";
globalThis.FileReader = class { readAsArrayBuffer(blob) { blob.arrayBuffer().then(buffer => { this.result = buffer; this.onloadend?.(); }); } };
const bytes = readFileSync("public/lab/prism/v029.glb");
const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), "");
const source = gltf.scene.getObjectByName("Reference_Prism");
source.updateWorldMatrix(true, false);
const copy = source.geometry.clone().applyMatrix4(source.matrixWorld);
copy.deleteAttribute("normal"); copy.deleteAttribute("uv");
const geometry = mergeVertices(copy, .00001);
geometry.computeBoundingBox();
const bounds = geometry.boundingBox;
const positions = geometry.attributes.position;
const height = bounds.max.y - bounds.min.y;
const cx = (bounds.max.x + bounds.min.x) / 2;
const cz = (bounds.max.z + bounds.min.z) / 2;
for (let i = 0; i < positions.count; i++) {
  const t = Math.max(0, Math.min(1, ((positions.getY(i) - bounds.min.y) / height - .25) / .75));
  const taper = 1 - .065 * t * t * (3 - 2 * t);
  positions.setX(i, cx + (positions.getX(i) - cx) * taper);
  positions.setZ(i, cz + (positions.getZ(i) - cz) * taper);
}
// Relax tiny edge ripples while preserving the broad planar faces.
const neighbors = Array.from({ length: positions.count }, () => new Set());
const index = geometry.index;
for (let i = 0; i < index.count; i += 3) {
  const a = index.getX(i), b = index.getX(i + 1), c = index.getX(i + 2);
  neighbors[a].add(b).add(c); neighbors[b].add(a).add(c); neighbors[c].add(a).add(b);
}
for (let pass = 0; pass < 4; pass++) {
  const previous = Float32Array.from(positions.array);
  for (let i = 0; i < positions.count; i++) {
    let x = 0, y = 0, z = 0;
    for (const j of neighbors[i]) { x += previous[j * 3]; y += previous[j * 3 + 1]; z += previous[j * 3 + 2]; }
    const n = neighbors[i].size;
    if (n) positions.setXYZ(i, previous[i * 3] * .75 + x / n * .25, previous[i * 3 + 1] * .75 + y / n * .25, previous[i * 3 + 2] * .75 + z / n * .25);
  }
}
geometry.computeVertexNormals(); geometry.computeBoundingBox(); geometry.computeBoundingSphere();
const mesh = new Mesh(geometry, new MeshStandardMaterial({ metalness: 1, roughness: .12 }));
mesh.name = "Reference_Prism";
const output = await new GLTFExporter().parseAsync(mesh, { binary: true });
writeFileSync("public/lab/prism/v030.glb", Buffer.from(output));
console.log(JSON.stringify({ vertices: positions.count, triangles: geometry.index.count / 3, bytes: output.byteLength, outerMeshes: 1 }));