"use client";

import { Canvas, useFrame, useThree, useLoader } from "@react-three/fiber";
import { MeshTransmissionMaterial } from "@react-three/drei/core/MeshTransmissionMaterial";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { OrbitControls } from "@react-three/drei/core/OrbitControls";
import { Environment } from "@react-three/drei/core/Environment";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Mesh, ShaderMaterial, TextureLoader, SRGBColorSpace } from "three";

const vertex = /* glsl */ `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const smokeFragment = /* glsl */ `
  varying vec2 vUv;
  uniform float uTime;
  uniform sampler2D uSmoke;
  void main(){
    vec2 uv=vUv;
    float t=uTime*.1;
    uv.x+=.014*sin(uv.y*9.+t)+.006*sin(uv.y*19.-t*.7);
    uv.y+=.012*sin(uv.x*8.-t*.6);
    vec3 smoke=texture2D(uSmoke,uv).rgb;
    float edge=smoothstep(0.,.13,vUv.x)*smoothstep(0.,.13,1.-vUv.x)*smoothstep(0.,.15,vUv.y)*smoothstep(0.,.15,1.-vUv.y);
    gl_FragColor=vec4(mix(vec3(1.),smoke,edge*.88),1.);
    #include <colorspace_fragment>
  }
`;
const shadowFragment = /* glsl */ `varying vec2 vUv; void main(){vec2 p=(vUv-.5)*2.;float a=exp(-dot(p*vec2(1.5,3.),p*vec2(1.5,3.)))*.13;gl_FragColor=vec4(.42,.34,.56,a);#include <colorspace_fragment>}`.replace(";#include", ";\n#include");

function Study({ reduced, active, solid }: { reduced: boolean; active: boolean; solid: boolean }) {
  const mesh = useRef<Mesh>(null);
  const smoke = useRef<ShaderMaterial>(null);
  const { invalidate, viewport } = useThree();
  const time = useRef(12);
  const gltf = useLoader(GLTFLoader, "/lab/prism/asymmetric-ice-v6.glb");
  const geometry = useMemo(() => {
    const source = gltf.scene.getObjectByName("IceGeometryDraft");
    if (!(source instanceof Mesh)) throw new Error("The supplied ice model is missing its mesh.");
    // Preserve the supplied surface and normals; only normalize its framing.
    source.updateWorldMatrix(true, false);
    const copy = source.geometry.clone();
    copy.applyMatrix4(source.matrixWorld);
    copy.computeBoundingBox();
    const bounds = copy.boundingBox!;
    const height = bounds.max.y - bounds.min.y;
    copy.translate(-(bounds.min.x + bounds.max.x) / 2, -(bounds.min.y + bounds.max.y) / 2, -(bounds.min.z + bounds.max.z) / 2);
    copy.scale(2.8 / height, 2.8 / height, 2.8 / height);
    copy.computeBoundingSphere();
    return copy;
  }, [gltf.scene]);
  const sourceTexture=useLoader(TextureLoader,"/lab/prism/smoke.webp");
  const texture=useMemo(()=>{
    const copy=sourceTexture.clone();
    copy.colorSpace=SRGBColorSpace;
    copy.needsUpdate=true;
    return copy;
  },[sourceTexture]);
  useEffect(()=>()=>texture.dispose(),[texture]);
  const smokeUniforms=useMemo(()=>({uTime:{value:12},uSmoke:{value:texture}}),[texture]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => {
    invalidate();
    if (!active || reduced) return;
    // Demand rendering caps the smoke at 30 fps and stops entirely offscreen.
    const id = window.setInterval(invalidate, 1000 / 30);
    return () => window.clearInterval(id);
  }, [active, reduced, invalidate]);
  useFrame((_, delta) => {
    if (!active) return;
    if (!reduced) time.current += Math.min(delta,.05);
    if (smoke.current) smoke.current.uniforms.uTime.value=time.current;

  }, -1);
  const scale = Math.min(.95, viewport.width / 4.7, viewport.height / 5.5);
  return <>
    <color attach="background" args={["white"]} />
    <ambientLight intensity={.15} />
    <directionalLight position={[3,5,4]} intensity={.5} color="#fffaff" />
    <Environment files="/lab/prism/studio.hdr" environmentRotation={[0,1.7,0]} />
    <group scale={scale}>
      <mesh position={[-.12,.45,-1.35]}>
        <planeGeometry args={[5.7,5.7]} />
        <shaderMaterial ref={smoke} vertexShader={vertex} fragmentShader={smokeFragment} uniforms={smokeUniforms} toneMapped={false} />
      </mesh>
      <mesh position={[0,-1.4,.1]} rotation={[-1.15,0,0]}>
        <planeGeometry args={[4,1.5]} />
        <shaderMaterial vertexShader={vertex} fragmentShader={shadowFragment} transparent depthWrite={false} />
      </mesh>
      <mesh ref={mesh} geometry={geometry} rotation={[0,0,0]}>
        {solid ? <meshStandardMaterial color="#b6afc1" roughness={.4} /> : <MeshTransmissionMaterial toneMapped={false} clearcoat={.12} clearcoatRoughness={.035} resolution={512} samples={4} backside backsideResolution={512} backsideThickness={.75} thickness={.98} ior={1.33} roughness={.065} transmission={1} chromaticAberration={.012} anisotropicBlur={0} distortion={0} distortionScale={.7} temporalDistortion={0} color="#fbfdff" attenuationColor="#f7fbff" attenuationDistance={5.6} envMapIntensity={1.2} />}
      </mesh>
    </group>
  </>;
}

export default function Scene() {
  const host = useRef<HTMLDivElement>(null);
  const [reduced,setReduced]=useState(true);
  const [active,setActive]=useState(true);
  const [lost,setLost]=useState(false);
  const [solid,setSolid]=useState(false);
  const controls = useRef<OrbitControlsImpl>(null);
  useEffect(() => {
    const query=window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotion=()=>setReduced(query.matches);
    syncMotion();query.addEventListener("change",syncMotion);
    let visible=true;
    const syncActive=()=>setActive(visible&&!document.hidden);
    const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;syncActive();});
    if(host.current) observer.observe(host.current);
    document.addEventListener("visibilitychange",syncActive);
    return ()=>{query.removeEventListener("change",syncMotion);observer.disconnect();document.removeEventListener("visibilitychange",syncActive);};
  },[]);
  return <div ref={host} style={{height:"100%",width:"100%"}} role="region" aria-label="A rounded glass prism refracts drifting lavender smoke. Drag to orbit the prism. Scroll or pinch to zoom.">
    <Canvas frameloop="demand" dpr={[1,1.5]} camera={{position:[0,0,7],fov:38}} gl={{antialias:true,alpha:false,powerPreference:"low-power"}} onCreated={({gl})=>{gl.domElement.addEventListener("webglcontextlost",()=>setLost(true),{once:true});}} fallback={<p style={{padding:24,color:"#62586d"}}>WebGL is unavailable on this device.</p>}>
      <OrbitControls ref={controls} makeDefault enablePan={false} minDistance={3.5} maxDistance={12} enableDamping={!reduced} dampingFactor={.08} />
      <Suspense fallback={null}><Study reduced={reduced} active={active&&!lost} solid={solid} /></Suspense>
    </Canvas>
    <div style={{position:"absolute",bottom:24,left:24,display:"flex",flexWrap:"wrap",right:24,gap:12,alignItems:"center",fontSize:12,fontFamily:"var(--font-geist-sans),sans-serif",color:"#51475f"}}>
      <span>Drag to orbit · Scroll to zoom</span>
      <button className="rounded-full border border-gray-300 bg-white px-4 py-3 focus-visible:outline-2 focus-visible:outline-violet-600" aria-pressed={solid} onClick={()=>setSolid(!solid)}>{solid ? "Show glass" : "Inspect solid shape"}</button>
      <button className="rounded-full border border-gray-300 bg-white px-4 py-3 focus-visible:outline-2 focus-visible:outline-violet-600" onClick={()=>{controls.current?.reset();}}>Reset view</button>
    </div>
    {lost&&<p style={{position:"absolute",bottom:92,left:24,pointerEvents:"none",color:"#62586d"}}>The graphics context was interrupted. Reload to restore the scene.</p>}
  </div>;
}
