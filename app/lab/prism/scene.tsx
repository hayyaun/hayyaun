"use client";

import { MeshTransmissionMaterial } from "@react-three/drei/core/MeshTransmissionMaterial";
import { Canvas, useThree, useLoader } from "@react-three/fiber";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { OrbitControls } from "@react-three/drei/core/OrbitControls";
import { Lightformer } from "@react-three/drei/core/Lightformer";
import { Environment } from "@react-three/drei/core/Environment";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { BackSide, Mesh, PlaneGeometry } from "three";
import { Reflector } from "three/addons/objects/Reflector.js";

const vertex = /* glsl */ `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const shadowFragment = /* glsl */ `varying vec2 vUv; void main(){vec2 p=(vUv-.5)*2.;float a=exp(-dot(p*vec2(1.5,3.),p*vec2(1.5,3.)))*.13;gl_FragColor=vec4(.32,.34,.37,a);#include <colorspace_fragment>}`.replace(";#include", ";\n#include");

// This sphere exists only in the environment capture, never as a scene overlay.
const environmentVertex = /* glsl */ `varying vec3 direction; void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const environmentFragment = /* glsl */ `
varying vec3 direction;
float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){float n=0.,a=.5;for(int i=0;i<5;i++){n+=a*noise(p);p=p*2.03+vec3(3.7,1.8,4.2);a*=.5;}return n;}
void main(){vec3 d=normalize(direction);vec3 p=d*5.;vec3 warp=vec3(fbm(p+2.4),fbm(p-3.1),fbm(p+5.6));float cloud=fbm(p+warp*3.);float wisps=pow(1.-abs(sin(cloud*18.)),3.);float density=smoothstep(.35,.72,cloud)*.5+wisps*.16;vec3 color=mix(vec3(1.),vec3(.58,.66,.9),density*.45);float studio=smoothstep(0.,.4,d.z);color=mix(color,vec3(.23,.3,.46),studio*.95);float softbox=pow(max(0.,dot(d,normalize(vec3(-.6,.5,.6)))),32.)+pow(max(0.,dot(d,normalize(vec3(.8,.2,.4)))),48.);color+=vec3(1.8)*softbox;float longitude=atan(d.x,d.z);float stripe=smoothstep(-.12,.12,sin(longitude*24.));float heightFade=smoothstep(-.85,-.6,d.y)*(1.-smoothstep(.65,.9,d.y));float studioSide=smoothstep(-.1,.25,d.z);vec3 zebra=mix(vec3(.008),vec3(1.4),stripe);color=mix(color,zebra,heightFade*studioSide);float edgeCards=exp(-pow((longitude-1.48)/.3,2.))+exp(-pow((longitude+1.42)/.3,2.));color=mix(color,vec3(.008,.016,.035),min(1.,edgeCards)*heightFade);float upperMask=smoothstep(.35,.65,d.y);float patches=smoothstep(.43,.56,fbm(d*18.+warp*4.));vec3 upperTexture=mix(vec3(.012),vec3(1.4),patches);color=mix(color,upperTexture,upperMask);gl_FragColor=vec4(color,1.);#include <colorspace_fragment>}`.replace(";#include", ";\n#include");
function ReflectiveFloor() {
  const floor = useMemo(() => {
    const reflector = new Reflector(new PlaneGeometry(200, 200), {
      color: 0xeef2fa, clipBias: .003,
      textureWidth: 1440, textureHeight: 1300, multisample: 4,
    });
    reflector.rotation.x = -Math.PI / 2;
    reflector.position.y = -1.405;
    return reflector;
  }, []);
  useEffect(() => () => { floor.geometry.dispose(); floor.dispose(); }, [floor]);
  return <primitive object={floor} />;
}

function Study({ solid, presentation, lightOffset, onReady }: { solid: boolean; presentation: boolean; lightOffset: [number,number]; onReady: () => void }) {
  const mesh = useRef<Mesh>(null);
  const { viewport } = useThree();
  const gltf = useLoader(GLTFLoader, "/lab/prism/v029.glb");
  const { geometry, airGeometry, extraBubbles, sectionGeometry } = useMemo(() => {
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
    const extraBubbles = [0,1,2].map(index => {
      const source = gltf.scene.getObjectByName(`lower-bubble-${index}`);
      if (!(source instanceof Mesh)) throw new Error("A lower bubble is missing.");
      source.updateWorldMatrix(true, false);
      const bubble = source.geometry.clone();
      bubble.applyMatrix4(source.matrixWorld);
      bubble.translate(-center.x, -center.y, -center.z);
      bubble.scale(2.8 / height, 2.8 / height, 2.8 / height);
      return bubble;
    });
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
    return { geometry: copy, airGeometry: airCopy, extraBubbles, sectionGeometry: sectionCopy };
  }, [gltf.scene]);
  useEffect(() => () => { geometry.dispose(); airGeometry?.dispose(); extraBubbles.forEach(bubble => bubble.dispose()); sectionGeometry?.dispose(); }, [geometry, airGeometry, extraBubbles, sectionGeometry]);
  useEffect(() => { onReady(); }, [onReady]);
  // Match the visible bounds of the 720 × 650 loading preview.
  const previewHeight = Math.min(viewport.height, viewport.width * 650 / 720) / (presentation ? 1.12 : 1);
  const scale = presentation ? previewHeight * (472 / 650) / 2.8 : Math.min(.95, viewport.width / 4.7, viewport.height / 5.5);
  return <>
    {!presentation && <color attach="background" args={["white"]} />}
    <ambientLight intensity={.15} />
    <directionalLight position={presentation ? [2,8,-1.5] : [3,5,4]} intensity={.5} color="#ffffff" castShadow={presentation} shadow-mapSize={[1024,1024]} shadow-radius={12} shadow-blurSamples={16} shadow-camera-left={-6} shadow-camera-right={6} shadow-camera-top={6} shadow-camera-bottom={-6} shadow-camera-near={.1} shadow-camera-far={20} shadow-bias={-.0001} shadow-normalBias={.02} />
    <Environment key={presentation ? lightOffset.join(":") : "lab"} background={presentation} frames={1} resolution={512}>
      {presentation ? <><Lightformer form="rect" intensity={4} color="#e3edff" position={[-4 + lightOffset[0] * 2,3 + lightOffset[1] * 1.5,4]} scale={[3,6,1]} target={[0,0,0]} /><Lightformer form="rect" intensity={2} color="#9fb6df" position={[4 + lightOffset[0] * 1.5,1 + lightOffset[1],2]} scale={[1,5,1]} target={[0,0,0]} /><mesh rotation={[lightOffset[1] * .2, lightOffset[0] * .3, 0]}><sphereGeometry args={[10,64,32]} /><shaderMaterial side={BackSide} vertexShader={environmentVertex} fragmentShader={environmentFragment} toneMapped={false} /></mesh></> : <>
      <color attach="background" args={[presentation ? "#51316b" : "#34383e"]} />
      <Lightformer form="rect" color={presentation ? "#dec4ff" : "#edf1f5"} intensity={4} position={[-4 + lightOffset[0] * 2,3 + lightOffset[1] * 1.5,4]} scale={[3,6,1]} target={[0,0,0]} />
      <Lightformer form="rect" color={presentation ? "#a77bd6" : "#bcc4cc"} intensity={2} position={[4 + lightOffset[0] * 1.5,1 + lightOffset[1],2]} scale={[1,5,1]} target={[0,0,0]} />
      <Lightformer form="rect" color="#ffffff" intensity={3} position={[0,5,-2]} scale={[5,2,1]} target={[0,0,0]} />
      <Lightformer form="rect" color={presentation ? "#79529e" : "#707983"} intensity={1} position={[-3,-2,-4]} scale={[4,3,1]} target={[0,0,0]} />
      </>}
    </Environment>
    <group scale={scale} position={presentation ? [-previewHeight * .008, -previewHeight * .025, 0] : [0,0,0]}>
      {presentation ? <>
        <ReflectiveFloor />
        <mesh receiveShadow position={[0,-1.4,0]} rotation={[-Math.PI / 2,0,0]}>
          <planeGeometry args={[200,200]} />
          <shadowMaterial color="#76628f" opacity={.08} transparent depthWrite={false} />
        </mesh>
      </> : <mesh position={[0,-1.4,.1]} rotation={[-1.15,0,0]}>
        <planeGeometry args={[4,1.5]} />
        <shaderMaterial vertexShader={vertex} fragmentShader={shadowFragment} transparent depthWrite={false} />
      </mesh>}
      {!solid && [airGeometry, ...extraBubbles].map((bubble, index) => bubble && <mesh key={index} geometry={bubble}>
        <meshPhysicalMaterial color="#ffffff" roughness={.025} metalness={0} transmission={1} thickness={.38} ior={1.31} clearcoat={.12} clearcoatRoughness={.035} attenuationColor="#f2f9ff" attenuationDistance={12} envMapIntensity={1.2} />
      </mesh>)}
      {!solid && sectionGeometry && <mesh geometry={sectionGeometry}>
        <meshPhysicalMaterial color="#ffffff" transmission={1} roughness={.025} ior={1.31} thickness={.008} envMapIntensity={1.2} />
      </mesh>}
      <mesh ref={mesh} geometry={geometry} rotation={[0,0,0]}>
        {solid ? <meshStandardMaterial color="#b6afc1" roughness={.4} /> : <MeshTransmissionMaterial toneMapped={false} clearcoat={.3} clearcoatRoughness={.012} resolution={1024} samples={6} backside backsideResolution={1024} backsideThickness={.75} thickness={.98} ior={1.46} roughness={.008} transmission={1} chromaticAberration={.003} anisotropicBlur={0} distortion={0} color="#ffffff" attenuationColor="#dce7ff" attenuationDistance={24} envMapIntensity={.65} />}
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

  const [lightOffset,setLightOffset]=useState<[number,number]>([0,0]);

  const development = process.env.NODE_ENV === "development";

  const cameraSettings = useMemo(() => ({ position: (presentation ? [3.9,1.6,6.62] : [0,0,7]) as [number,number,number], fov:38 }), [presentation]);
  const sceneReady = useCallback(() => { controls.current?.update(); setReady(true); }, []);
  useEffect(() => {
    const query=window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotion=()=>setReduced(query.matches);
    syncMotion();query.addEventListener("change",syncMotion);
    return ()=>query.removeEventListener("change",syncMotion);
  },[]);
  useEffect(() => {
    if (!presentation || reduced) return;
    let target: [number, number] = [0, 0];
    let current: [number, number] = [0, 0];
    let frame = 0;
    let lastUpdate = 0;
    const tick = (time: number) => {
      if (time - lastUpdate >= 120) {
        lastUpdate = time;
        current = [current[0] + (target[0] - current[0]) * .2, current[1] + (target[1] - current[1]) * .2];
        setLightOffset([Number(current[0].toFixed(3)), Number(current[1].toFixed(3))]);
      }
      if (Math.abs(target[0] - current[0]) + Math.abs(target[1] - current[1]) > .001) {
        frame = requestAnimationFrame(tick);
      } else {
        frame = 0;
      }
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      target = [
        Math.max(-1, Math.min(1, 1 - event.clientX / window.innerWidth * 2)) * .18,
        Math.max(-1, Math.min(1, 1 - event.clientY / window.innerHeight * 2)) * .18,
      ];
      if (!frame) frame = requestAnimationFrame(tick);
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => {
      window.removeEventListener("pointermove", move);
      cancelAnimationFrame(frame);
    };
  }, [presentation, reduced]);
  return <div ref={host} style={{height:"100%",width:"100%", opacity: presentation && (!ready || lost) ? 0 : 1}} role="region" aria-label={presentation ? (development ? "Interactive glass prism. Drag to explore its reflections." : "Glass prism. Move the pointer to shift its studio lighting.") : "A rounded glass prism reflects a silver studio environment. Drag to orbit the prism. Scroll or pinch to zoom."}>
    <Canvas flat shadows={presentation ? "variance" : false} frameloop="demand" dpr={[1,2]} camera={cameraSettings} gl={{antialias:true,alpha:false,powerPreference:"low-power"}} onCreated={({gl,camera})=>{camera.lookAt(0,0,0);gl.setClearColor("white", 1);gl.domElement.addEventListener("webglcontextlost",()=>setLost(true),{once:true});}} fallback={presentation ? null : <p style={{padding:24,color:"#62586d"}}>WebGL is unavailable on this device.</p>}>
      {development && <OrbitControls ref={controls} makeDefault enablePan={false} enableZoom={!presentation} enableDamping={!reduced} minDistance={3.5} maxDistance={12} dampingFactor={.08} />}
      <Suspense fallback={null}><Study solid={solid} presentation={presentation} lightOffset={lightOffset} onReady={sceneReady} /></Suspense>
    </Canvas>
    {!presentation && <div style={{position:"absolute",bottom:24,left:24,display:"flex",flexWrap:"wrap",right:24,gap:12,alignItems:"center",fontSize:12,fontFamily:"var(--font-geist-sans),sans-serif",color:"#51475f"}}>
      <span>{development ? "v029 · Drag to orbit · Scroll to zoom" : "v029 · Glass prism study"}</span>
      <button className="rounded-full border border-gray-300 bg-white px-4 py-3 focus-visible:outline-2 focus-visible:outline-violet-600" aria-pressed={solid} onClick={()=>setSolid(!solid)}>{solid ? "Show ice" : "Inspect solid shape"}</button>
      <button className="rounded-full border border-gray-300 bg-white px-4 py-3 focus-visible:outline-2 focus-visible:outline-violet-600" onClick={()=>{controls.current?.reset();}}>Reset view</button>
    </div>}
    {lost&&<p style={{position:"absolute",bottom:92,left:24,pointerEvents:"none",color:"#62586d"}}>The graphics context was interrupted. Reload to restore the scene.</p>}
  </div>;
}
