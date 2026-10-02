import {readFileSync,writeFileSync} from "node:fs"; import {GLTFLoader} from "three/examples/jsm/loaders/GLTFLoader.js"; import {GLTFExporter} from "three/examples/jsm/exporters/GLTFExporter.js"; import {DoubleSide,Group,Mesh,MeshBasicMaterial,MeshPhysicalMaterial,Raycaster,SphereGeometry,Vector3} from "three"; globalThis.FileReader=class {readAsArrayBuffer(blob){blob.arrayBuffer().then(b=>{this.result=b;this.onloadend?.();});} readAsDataURL(blob){blob.arrayBuffer().then(b=>{this.result="data:application/octet-stream;base64,"+Buffer.from(b).toString("base64");this.onloadend?.();});}}; const data=readFileSync("public/lab/prism/v028.glb"); const gltf=await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),"");
    const source = gltf.scene.getObjectByName("Reference_Prism");
    if (!(source instanceof Mesh)) throw new Error("The prism model is missing its mesh.");
    // Preserve the supplied surface and normals; only normalize its framing.
    source.updateWorldMatrix(true, false);
    const copy = source.geometry.clone();
    copy.applyMatrix4(source.matrixWorld);
    copy.computeBoundingBox();
    const bounds = copy.boundingBox;
    const height = bounds.max.y - bounds.min.y;
    const center = bounds.getCenter(source.position.clone());
    const air = gltf.scene.getObjectByName("v025-inclusion");
    const airCopy = air instanceof Mesh ? air.geometry.clone() : null;
    if (air instanceof Mesh && airCopy) {
      air.updateWorldMatrix(true, false);
      airCopy.applyMatrix4(air.matrixWorld);
      airCopy.computeBoundingBox();
      const bubbleBounds = airCopy.boundingBox;
      const positions = airCopy.getAttribute("position");
      // Compress the original pocket below the sloping inner section.
      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i), z = positions.getZ(i);
        const ceiling = .66 + .045 * x - .06 * z - .035;
        const fraction = (positions.getY(i) - bubbleBounds.min.y) / (bubbleBounds.max.y - bubbleBounds.min.y);
        positions.setY(i, bubbleBounds.min.y + fraction * (ceiling - bubbleBounds.min.y));
      }
      airCopy.computeVertexNormals();
      airCopy.translate(-center.x, -center.y, -center.z);
      airCopy.scale(2.8 / height, 2.8 / height, 2.8 / height);
    }
    // Fit three broad air pockets to the actual interior, below the section.
    const shellMaterial = new MeshBasicMaterial({ side: DoubleSide });
    const shell = new Mesh(copy, shellMaterial);
    shell.updateMatrixWorld(true);
    const ray = new Raycaster();
    const point = new Vector3();
    const direction = new Vector3();
    const extraBubbles = [
      { center: [-.95,.32,.57], radii: [.83,.26,.64] },
      { center: [-.88,.32,-.69], radii: [.91,.26,.61] },
      { center: [.94,.35,-.66], radii: [.94,.28,.63] },
    ].map(({ center: location, radii }) => {
      const origin = new Vector3(...location);
      const bubble = new SphereGeometry(1, 24, 12);
      bubble.scale(radii[0], radii[1], radii[2]);
      bubble.translate(...location);
      const positions = bubble.getAttribute("position");
      for (let i = 0; i < positions.count; i++) {
        point.fromBufferAttribute(positions, i);
        direction.copy(point).sub(origin);
        const distance = direction.length();
        ray.set(origin, direction.normalize());
        const hit = ray.intersectObject(shell, false)[0];
        if (hit && distance > hit.distance - .035) point.copy(origin).addScaledVector(direction, Math.max(0, hit.distance - .035));
        point.y = Math.min(point.y, .66 + .045 * point.x - .06 * point.z - .035);
        positions.setXYZ(i, point.x, point.y, point.z);
      }
      // The surface faces into the air cavity, as with the original inclusion.
      const index = bubble.index;
      for (let i = 0; i < index.count; i += 3) {
        const first = index.getX(i);
        index.setX(i, index.getX(i + 2));
        index.setX(i + 2, first);
      }
      bubble.computeVertexNormals();
      bubble.translate(-center.x, -center.y, -center.z);
      bubble.scale(2.8 / height, 2.8 / height, 2.8 / height);
      return bubble;
    });
    shellMaterial.dispose();
    const section = gltf.scene.getObjectByName("v028-section");
    const sectionCopy = section instanceof Mesh ? section.geometry.clone() : null;
    if (section instanceof Mesh && sectionCopy) {
      section.updateWorldMatrix(true, false);
      sectionCopy.applyMatrix4(section.matrixWorld);
      sectionCopy.translate(-center.x, -center.y, -center.z);
      sectionCopy.scale(2.8 / height, 2.8 / height, 2.8 / height);
    }
    copy.translate(-center.x, -center.y, -center.z);
    copy.scale(2.8 / height, 2.8 / height, 2.8 / height);
    copy.computeBoundingSphere();

const group=new Group(); const material=new MeshPhysicalMaterial({transmission:1,roughness:.025,ior:1.31}); for(const [name,geometry] of [["Reference_Prism",copy],["v025-inclusion",airCopy],["v028-section",sectionCopy],...extraBubbles.map((g,i)=>["lower-bubble-"+i,g])]){const mesh=new Mesh(geometry,material);mesh.name=name;group.add(mesh);} const output=await new GLTFExporter().parseAsync(group,{binary:true}); writeFileSync("public/lab/prism/v029.glb",Buffer.from(output)); console.log("Saved four fitted bubbles in v029.glb");