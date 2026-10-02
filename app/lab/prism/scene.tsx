"use client";

import { Canvas, useThree, useLoader } from "@react-three/fiber";
import { MeshTransmissionMaterial } from "@react-three/drei/core/MeshTransmissionMaterial";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { OrbitControls } from "@react-three/drei/core/OrbitControls";
import { Lightformer } from "@react-three/drei/core/Lightformer";
import { Environment } from "@react-three/drei/core/Environment";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Mesh, TextureLoader } from "three";

const vertex = /* glsl */ `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const shadowFragment = /* glsl */ `varying vec2 vUv; void main(){vec2 p=(vUv-.5)*2.;float a=exp(-dot(p*vec2(1.5,2.),p*vec2(1.5,2.)))*.22;gl_FragColor=vec4(.42,.36,.53,a);#include <colorspace_fragment>}`.replace(";#include", ";\n#include");

function Smoke() {
  const texture = useLoader(TextureLoader, "/lab/prism/smoke.webp");
  return <mesh position={[0, .25, -1.5]}><planeGeometry args={[6, 5]} /><meshBasicMaterial map={texture} toneMapped={false} transparent opacity={.45} depthWrite={false} /></mesh>;
}

function Study({ solid, presentation, onReady }: { solid: boolean; presentation: boolean; onReady: () => void }) {
  const mesh = useRef<Mesh>(null);
  const { viewport } = useThree();
  const gltf = useLoader(GLTFLoader, "/lab/prism/v028.glb");
  const { geometry, airGeometry, sectionGeometry } = useMemo(() => {
    const source = gltf.scene.getObjectByName("Reference_Prism");
    if (!(source instanceof Mesh)) throw new Error("The prism model is missing its mesh.");
    // Preserve the supplied surface and normals; only normalize its framing.
    source.updateWorldMatrix(true, false);
    const copy = source.geometry.clone();
    copy.applyMatrix4(source.matrixWorld);
    copy.computeBoundingBox();
    const bounds = copy.boundingBox!;
    const height = bounds.max.y - bounds.min.y;
    const center = bounds.getCenter(source.position.clone());
    const air = gltf.scene.getObjectByName("v025-inclusion");
    const airCopy = air instanceof Mesh ? air.geometry.clone() : null;
    if (air instanceof Mesh && airCopy) {
      air.updateWorldMatrix(true, false);
      airCopy.applyMatrix4(air.matrixWorld);
      airCopy.translate(-center.x, -center.y, -center.z);
      airCopy.scale(2.8 / height, 2.8 / height, 2.8 / height);
    }
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
    return { geometry: copy, airGeometry: airCopy, sectionGeometry: sectionCopy };
  }, [gltf.scene]);
  useEffect(() => () => { geometry.dispose(); airGeometry?.dispose(); sectionGeometry?.dispose(); }, [geometry, airGeometry, sectionGeometry]);
  useEffect(() => { onReady(); }, [onReady]);
  const scale = Math.min(.95, viewport.width / 4.7, viewport.height / 5.5);
  return <>
    <color attach="background" args={["white"]} />
    {presentation && <Smoke />}
    <ambientLight intensity={.15} />
    <directionalLight position={[3,5,4]} intensity={.5} color="#ffffff" />
    <Environment background={false} frames={1} resolution={256}>
      <color attach="background" args={["#34383e"]} />
      <Lightformer form="rect" color="#edf1f5" intensity={4} position={[-4,3,4]} scale={[3,6,1]} target={[0,0,0]} />
      <Lightformer form="rect" color="#bcc4cc" intensity={2} position={[4,1,2]} scale={[1,5,1]} target={[0,0,0]} />
      <Lightformer form="rect" color="#ffffff" intensity={3} position={[0,5,-2]} scale={[5,2,1]} target={[0,0,0]} />
      <Lightformer form="rect" color="#707983" intensity={1} position={[-3,-2,-4]} scale={[4,3,1]} target={[0,0,0]} />
    </Environment>
    <group scale={scale}>
      <mesh position={presentation ? [-.55,-1.43,1.15] : [0,-1.4,.1]} rotation={presentation ? [-Math.PI / 2,0,-.28] : [-1.15,0,0]}>
        <planeGeometry args={presentation ? [5.5,3.8] : [4,1.5]} />
        <shaderMaterial vertexShader={vertex} fragmentShader={shadowFragment} transparent depthWrite={false} />
      </mesh>
      {!solid && airGeometry && <mesh geometry={airGeometry}>
        <meshPhysicalMaterial color="#ffffff" roughness={.025} metalness={0} transmission={1} thickness={.38} ior={1.31} clearcoat={.12} clearcoatRoughness={.035} attenuationColor="#f2f9ff" attenuationDistance={12} envMapIntensity={1.2} />
      </mesh>}
      {!solid && sectionGeometry && <mesh geometry={sectionGeometry}>
        <meshPhysicalMaterial color="#ffffff" transmission={1} roughness={.025} ior={1.31} thickness={.008} envMapIntensity={1.2} />
      </mesh>}
      <mesh ref={mesh} geometry={geometry} rotation={[0,0,0]}>
        {solid ? <meshStandardMaterial color="#b6afc1" roughness={.4} /> : <MeshTransmissionMaterial toneMapped={false} clearcoat={.12} clearcoatRoughness={.035} resolution={512} samples={4} backside backsideResolution={512} backsideThickness={.75} thickness={.98} ior={1.31} roughness={.025} transmission={1} chromaticAberration={.003} anisotropicBlur={0} distortion={0} distortionScale={.7} temporalDistortion={0} color="#ffffff" attenuationColor="#f2f9ff" attenuationDistance={12} envMapIntensity={1.2} />}
      </mesh>
    </group>
  </>;
}

export default function Scene({ presentation = false }: { presentation?: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const [reduced,setReduced]=useState(true);
  const [lost,setLost]=useState(false);
  const [solid,setSolid]=useState(false);
  const [ready,setReady]=useState(false);
  const controls = useRef<OrbitControlsImpl>(null);
  useEffect(() => {
    const query=window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotion=()=>setReduced(query.matches);
    syncMotion();query.addEventListener("change",syncMotion);
    return ()=>query.removeEventListener("change",syncMotion);
  },[]);
  return <div ref={host} style={{height:"100%",width:"100%", opacity: presentation && (!ready || lost) ? 0 : 1}} role="region" aria-label={presentation ? "Interactive glass prism. Drag to explore its reflections." : "A rounded glass prism reflects a silver studio environment. Drag to orbit the prism. Scroll or pinch to zoom."}>
    <Canvas frameloop="demand" dpr={[1,1.5]} camera={{position:presentation ? [1.6,.7,7] : [0,0,7],fov:38}} gl={{antialias:true,alpha:false,powerPreference:"low-power"}} onCreated={({gl})=>{gl.setClearColor("white", 1);gl.domElement.addEventListener("webglcontextlost",()=>setLost(true),{once:true});}} fallback={presentation ? null : <p style={{padding:24,color:"#62586d"}}>WebGL is unavailable on this device.</p>}>
      <OrbitControls ref={controls} makeDefault enablePan={false} enableZoom={!presentation} enableDamping={!reduced} minDistance={3.5} maxDistance={12} dampingFactor={.08} />
      <Suspense fallback={null}><Study solid={solid} presentation={presentation} onReady={() => setReady(true)} /></Suspense>
    </Canvas>
    {!presentation && <div style={{position:"absolute",bottom:24,left:24,display:"flex",flexWrap:"wrap",right:24,gap:12,alignItems:"center",fontSize:12,fontFamily:"var(--font-geist-sans),sans-serif",color:"#51475f"}}>
      <span>v028 · Drag to orbit · Scroll to zoom</span>
      <button className="rounded-full border border-gray-300 bg-white px-4 py-3 focus-visible:outline-2 focus-visible:outline-violet-600" aria-pressed={solid} onClick={()=>setSolid(!solid)}>{solid ? "Show ice" : "Inspect solid shape"}</button>
      <button className="rounded-full border border-gray-300 bg-white px-4 py-3 focus-visible:outline-2 focus-visible:outline-violet-600" onClick={()=>{controls.current?.reset();}}>Reset view</button>
    </div>}
    {lost&&<p style={{position:"absolute",bottom:92,left:24,pointerEvents:"none",color:"#62586d"}}>The graphics context was interrupted. Reload to restore the scene.</p>}
  </div>;
}


















