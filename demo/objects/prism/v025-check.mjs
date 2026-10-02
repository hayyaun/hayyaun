import fs from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
const file=fs.readFileSync('public/lab/prism/v025.glb');
const gltf=await new GLTFLoader().parseAsync(file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength),'');
gltf.scene.traverse(o=>{if(o.isMesh) console.log(JSON.stringify({name:o.name,vertices:o.geometry.attributes.position.count,triangles:o.geometry.index.count/3}));});
















