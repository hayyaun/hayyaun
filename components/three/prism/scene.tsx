"use client";

import { Canvas, useThree, useLoader } from "@react-three/fiber";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { OrbitControls } from "@react-three/drei/core/OrbitControls";
import { Lightformer } from "@react-three/drei/core/Lightformer";
import { Environment } from "@react-three/drei/core/Environment";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { BackSide, Mesh, PlaneGeometry, ShaderMaterial } from "three";
import { Reflector } from "three/addons/objects/Reflector.js";
import { useGraphicsPerformance } from "@/lib/graphics-performance";

const qualityPresets = {
  low: { dpr: 1, reflectionWidth: 480, reflectionHeight: 434, multisample: 0, shadow: 512, environment: 128 },
  medium: { dpr: 1.5, reflectionWidth: 720, reflectionHeight: 650, multisample: 0, shadow: 1024, environment: 256 },
  high: { dpr: 2, reflectionWidth: 1440, reflectionHeight: 1300, multisample: 4, shadow: 1024, environment: 512 },
};


const vertex = /* glsl */ `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const shadowFragment = /* glsl */ `varying vec2 vUv; void main(){vec2 p=(vUv-.5)*2.;float a=exp(-dot(p*vec2(1.5,3.),p*vec2(1.5,3.)))*.13;gl_FragColor=vec4(.32,.34,.37,a);#include <colorspace_fragment>}`.replace(";#include", ";\n#include");

// This sphere exists only in the environment capture, never as a scene overlay.
const environmentVertex = /* glsl */ `varying vec3 direction; void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const environmentFragment = /* glsl */ `
varying vec3 direction;
void main() {
  vec3 d = normalize(direction);
  float longitude = atan(d.x, d.z);
  float hue = fract(longitude / 2.4 + d.y * .4 + .52);
  // Dark cyan, blue, violet, pink, gray, and black; smoothly blended.
  vec3 palette[6];
  palette[0] = vec3(8., 145., 178.) / 255.;
  palette[1] = vec3(37., 99., 180.) / 255.;
  palette[2] = vec3(117., 112., 179.) / 255.;
  palette[3] = vec3(231., 41., 138.) / 255.;
  palette[4] = vec3(102.) / 255.;
  palette[5] = vec3(12.) / 255.;
  float segment = hue * 6.;
  int index = int(floor(segment));
  vec3 srgb = mix(palette[index], palette[(index + 1) % 6], smoothstep(0., 1., fract(segment)));
  vec3 color = mix(srgb / 12.92, pow((srgb + .055) / 1.055, vec3(2.4)), step(vec3(.04045), srgb));
  float edgeCards = exp(-pow((longitude - 1.48) / .3, 2.)) + exp(-pow((longitude + 1.42) / .3, 2.));
  float cardHeight = smoothstep(-.85, -.6, d.y) * (1. - smoothstep(.65, .9, d.y));
  color = mix(color, vec3(.006), min(1., edgeCards) * cardHeight);
  gl_FragColor = vec4(color, 1.);
  #include <colorspace_fragment>
}`;

function ContextLifecycle({ onLost }: { onLost: (lost: boolean) => void }) {
  const { gl, invalidate } = useThree();
  useEffect(() => {
    const canvas = gl.domElement;
    const lost = (event: Event) => {
      event.preventDefault();
      onLost(true);
    };
    const restored = () => {
      onLost(false);
      invalidate();
    };
    canvas.addEventListener("webglcontextlost", lost);
    canvas.addEventListener("webglcontextrestored", restored);
    return () => {
      canvas.removeEventListener("webglcontextlost", lost);
      canvas.removeEventListener("webglcontextrestored", restored);
    };
  }, [gl, invalidate, onLost]);
  return null;
}
function ReflectiveFloor() {
  const quality = useGraphicsPerformance((state) => state.quality);
  const preset = qualityPresets[quality];
  const floor = useMemo(() => {
    const reflector = new Reflector(new PlaneGeometry(200, 200), {
      color: 0xeef2fa,
      clipBias: 0.003,
      textureWidth: preset.reflectionWidth,
      textureHeight: preset.reflectionHeight,
      multisample: preset.multisample,
    });
    // Fade Three.js's floor reflection toward the white ground.
    if (!(reflector.material instanceof ShaderMaterial)) throw new Error("The reflector shader is unavailable.");
    reflector.material.fragmentShader = reflector.material.fragmentShader.replace("blendOverlay( base.rgb, color )", "mix( vec3( 1.0 ), blendOverlay( base.rgb, color ), 0.35 )");
    reflector.rotation.x = -Math.PI / 2;
    reflector.position.y = -1.405;
    return reflector;
  }, [preset]);
  useEffect(
    () => () => {
      floor.geometry.dispose();
      floor.dispose();
    },
    [floor]
  );
  return <primitive object={floor} />;
}

function EnvironmentMotion({ reduced, autoRotate, rotation, pointer }: { reduced: boolean; autoRotate: boolean; rotation: readonly [number, number, number]; pointer: boolean }) {
  const { scene, invalidate, gl } = useThree();
  const [x, y, z] = rotation;
  useEffect(() => {
    const base = [x, y, z].map((value) => (value * Math.PI) / 180);
    let angle = 0;
    let targetX = 0,
      targetY = 0,
      currentX = 0,
      currentY = 0;
    let lastPointerMove = -Infinity;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let last = performance.now();
    let visible = true;
    let contextLost = false;
    const apply = () => {
      scene.environmentRotation.set(base[0] + currentY * 0.2, base[1] + angle + currentX * 0.3, base[2]);
      invalidate();
    };
    const tick = () => {
      timer = undefined;
      if (document.hidden || !visible || contextLost || reduced) return;
      const now = performance.now();
      if (now - lastPointerMove > 700) {
        targetX = 0;
        targetY = 0;
      }
      const delta = Math.min((now - last) / 1000, 0.1);
      last = now;
      if (autoRotate) angle = (angle + (delta * Math.PI * 2) / 180) % (Math.PI * 2);
      const blend = 1 - Math.exp(-delta * 2);
      currentX += (targetX - currentX) * blend;
      currentY += (targetY - currentY) * blend;
      apply();
      if (autoRotate || now - lastPointerMove <= 700 || Math.abs(targetX - currentX) + Math.abs(targetY - currentY) > 0.001) {
        timer = setTimeout(tick, 1000 / 30);
      }
    };
    const resume = () => {
      clearTimeout(timer);
      timer = undefined;
      last = performance.now();
      if (!document.hidden && visible && !contextLost && !reduced) timer = setTimeout(tick, 1000 / 30);
    };
    const move = (event: PointerEvent) => {
      if (!pointer || reduced || event.pointerType === "touch") return;
      lastPointerMove = performance.now();
      targetX = Math.max(-1, Math.min(1, 1 - (event.clientX / window.innerWidth) * 2)) * 0.18;
      targetY = Math.max(-1, Math.min(1, 1 - (event.clientY / window.innerHeight) * 2)) * 0.18;
      if (timer === undefined) resume();
    };
    const lost = () => {
      contextLost = true;
      resume();
    };
    const restored = () => {
      contextLost = false;
      resume();
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      resume();
    });
    observer.observe(gl.domElement);
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("pointermove", move, { passive: true });
    gl.domElement.addEventListener("webglcontextlost", lost);
    gl.domElement.addEventListener("webglcontextrestored", restored);
    apply();
    resume();
    return () => {
      clearTimeout(timer);
      observer.disconnect();
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("pointermove", move);
      gl.domElement.removeEventListener("webglcontextlost", lost);
      gl.domElement.removeEventListener("webglcontextrestored", restored);
    };
  }, [reduced, autoRotate, pointer, x, y, z, scene, invalidate, gl]);
  return null;
}
function Study({ solid, presentation, onReady, prismColor }: { solid: boolean; presentation: boolean; onReady: () => void; prismColor: string }) {
  const quality = useGraphicsPerformance((state) => state.quality);
  const preset = qualityPresets[quality];
  const mesh = useRef<Mesh>(null);
  const { viewport } = useThree();
  const gltf = useLoader(GLTFLoader, "/lab/prism/v030.glb");
  const geometry = useMemo(() => {
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
    copy.translate(-center.x, -center.y, -center.z);
    copy.scale(2.8 / height, 2.8 / height, 2.8 / height);
    copy.computeBoundingSphere();
    return copy;
  }, [gltf.scene]);
  useEffect(
    () => () => {
      geometry.dispose();
    },
    [geometry]
  );
  useEffect(() => {
    onReady();
  }, [onReady]);
  // Match the visible bounds of the 720 × 650 loading preview.
  const previewHeight = Math.min(viewport.height, (viewport.width * 650) / 720) / (presentation ? 1.12 : 1);
  const scale = presentation ? (previewHeight * (472 / 650)) / 2.8 : Math.min(0.95, viewport.width / 4.7, viewport.height / 5.5);
  return (
    <>
      <color attach="background" args={["white"]} />
      <ambientLight intensity={0.15} />
      <directionalLight
        position={presentation ? [2, 8, -1.5] : [3, 5, 4]}
        intensity={0.5}
        color="#ffffff"
        castShadow={presentation}
        shadow-mapSize={[preset.shadow, preset.shadow]}
        shadow-radius={12}
        shadow-blurSamples={16}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-camera-near={0.1}
        shadow-camera-far={20}
        shadow-bias={-0.0001}
        shadow-normalBias={0.02}
      />
      <Environment key={quality} background={false} frames={1} resolution={preset.environment}>
        {presentation ? (
          <>
            <Lightformer form="rect" intensity={4} color="#ffffff" position={[-4, 3, 4]} scale={[3, 6, 1]} target={[0, 0, 0]} />
            <Lightformer form="rect" intensity={2} color="#ffffff" position={[4, 1, 2]} scale={[1, 5, 1]} target={[0, 0, 0]} />
            <mesh>
              <sphereGeometry args={[10, 64, 32]} />
              <shaderMaterial side={BackSide} vertexShader={environmentVertex} fragmentShader={environmentFragment} toneMapped={false} />
            </mesh>
          </>
        ) : (
          <>
            <color attach="background" args={[presentation ? "#51316b" : "#343434"]} />
            <Lightformer form="rect" color={presentation ? "#dec4ff" : "#f5f5f5"} intensity={4} position={[-4, 3, 4]} scale={[3, 6, 1]} target={[0, 0, 0]} />
            <Lightformer form="rect" color={presentation ? "#a77bd6" : "#cccccc"} intensity={2} position={[4, 1, 2]} scale={[1, 5, 1]} target={[0, 0, 0]} />
            <Lightformer form="rect" color="#ffffff" intensity={3} position={[0, 5, -2]} scale={[5, 2, 1]} target={[0, 0, 0]} />
            <Lightformer form="rect" color={presentation ? "#79529e" : "#777777"} intensity={1} position={[-3, -2, -4]} scale={[4, 3, 1]} target={[0, 0, 0]} />
          </>
        )}
      </Environment>
      <group scale={scale} position={presentation ? [-previewHeight * 0.008, -previewHeight * 0.025, 0] : [0, 0, 0]}>
        {presentation ? (
          <>
            <ReflectiveFloor />
            <mesh receiveShadow position={[0, -1.4, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[200, 200]} />
              <shadowMaterial color="#76628f" opacity={0.045} transparent depthWrite={false} />
            </mesh>
          </>
        ) : (
          <mesh position={[0, -1.4, 0.1]} rotation={[-1.15, 0, 0]}>
            <planeGeometry args={[4, 1.5]} />
            <shaderMaterial vertexShader={vertex} fragmentShader={shadowFragment} transparent depthWrite={false} />
          </mesh>
        )}
        <mesh ref={mesh} geometry={geometry} rotation={[0, 0, 0]}>
          {solid ? <meshStandardMaterial color="#b6afc1" roughness={0.4} /> : <meshPhysicalMaterial color={prismColor} metalness={1} roughness={0.085} clearcoat={0.65} clearcoatRoughness={0.05} envMapIntensity={1.5} />}
        </mesh>
      </group>
    </>
  );
}

export default function Scene({
  debug = false,
  presentation = false,
  tuning = false,
  pointerMotion = !tuning,
  autoRotate = true,
  environmentRotation = [0, 0, 0],
  prismColor = "#8b82aa",
}: {
  debug?: boolean;
  presentation?: boolean;
  tuning?: boolean;
  pointerMotion?: boolean;
  autoRotate?: boolean;
  environmentRotation?: readonly [number, number, number];
  prismColor?: string;
}) {
  const quality = useGraphicsPerformance((state) => state.quality);
  const host = useRef<HTMLDivElement>(null);
  const [reduced, setReduced] = useState(true);
  const [lost, setLost] = useState(false);
  const [solid, setSolid] = useState(false);
  const [ready, setReady] = useState(false);
  const controls = useRef<OrbitControlsImpl>(null);


  const cameraSettings = useMemo(() => ({ position: (presentation ? [3.9, 1.6, 6.62] : [0, 0, 7]) as [number, number, number], fov: 38 }), [presentation]);
  const sceneReady = useCallback(() => {
    controls.current?.update();
    setReady(true);
  }, []);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotion = () => setReduced(query.matches);
    syncMotion();
    query.addEventListener("change", syncMotion);
    return () => query.removeEventListener("change", syncMotion);
  }, []);
  return (
    <div
      ref={host}
      style={{ height: "100%", width: "100%", opacity: presentation && !tuning && (!ready || lost) ? 0 : 1 }}
      role="region"
      aria-label={debug ? "Interactive carbon-metal prism. Drag to orbit or pan." : "Carbon-metal prism. Move the pointer to shift its environment reflections."}
    >
      <Canvas
        flat
        style={{ visibility: lost ? "hidden" : "visible" }}
        shadows={presentation ? "variance" : false}
        frameloop="demand"
        dpr={[1, qualityPresets[quality].dpr]}
        camera={cameraSettings}
        gl={{ antialias: true, alpha: false, powerPreference: "low-power" }}
        onCreated={({ gl, camera }) => {
          camera.lookAt(0, 0, 0);
          gl.setClearColor("white", 1);
        }}
        fallback={presentation ? null : <p style={{ padding: 24, color: "#62586d" }}>WebGL is unavailable on this device.</p>}
      >
        <ContextLifecycle onLost={setLost} />
        {debug && <OrbitControls ref={controls} makeDefault enablePan enableZoom={false} enableDamping={!reduced} minDistance={3.5} maxDistance={12} dampingFactor={0.08} />}

        <Suspense fallback={null}>
          <Study solid={solid} presentation={presentation} onReady={sceneReady} prismColor={prismColor} />
          {presentation && <EnvironmentMotion reduced={reduced} autoRotate={autoRotate} rotation={environmentRotation} pointer={pointerMotion} />}
        </Suspense>
      </Canvas>
      {debug && !presentation && (
        <div style={{ position: "absolute", bottom: 24, left: 24, display: "flex", flexWrap: "wrap", right: 24, gap: 12, alignItems: "center", fontSize: 12, fontFamily: "var(--font-geist-sans),sans-serif", color: "#51475f" }}>
          <span>v030 · Drag to orbit or pan</span>
          <button className="rounded-full border border-gray-300 bg-white px-4 py-3 focus-visible:outline-2 focus-visible:outline-violet-600" aria-pressed={solid} onClick={() => setSolid(!solid)}>
            {solid ? "Show carbon metal" : "Inspect solid shape"}
          </button>
          <button
            className="rounded-full border border-gray-300 bg-white px-4 py-3 focus-visible:outline-2 focus-visible:outline-violet-600"
            onClick={() => {
              controls.current?.reset();
            }}
          >
            Reset view
          </button>
        </div>
      )}
      {lost && <p style={{ position: "absolute", bottom: 92, left: 24, pointerEvents: "none", color: "#62586d" }}>The graphics context was interrupted. Reload to restore the scene.</p>}
    </div>
  );
}
