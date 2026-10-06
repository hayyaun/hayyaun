"use client";

import { useLoader, useThree } from "@react-three/fiber";
import { Lightformer } from "@react-three/drei/core/Lightformer";
import { Environment } from "@react-three/drei/core/Environment";
import { Bvh } from "@react-three/drei/core/Bvh";
import { useEffect, useMemo, useRef } from "react";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { BackSide, Mesh, PlaneGeometry, ShaderMaterial } from "three";
import { Reflector } from "three/addons/objects/Reflector.js";
import { graphicsQuality, useGraphicsPerformance } from "@/lib/graphics-performance";
import { qualityPresets } from "./quality-presets";
import { smokeProgramKey, type SurfaceActivity } from "./surface-smoke";
import { useSurfaceSmoke } from "./use-surface-smoke";

const environmentVertex = /* glsl */ `
  varying vec3 direction;
  void main() {
    direction = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
  }
`;
const environmentFragment = /* glsl */ `
  varying vec3 direction;
  void main() {
    vec3 d = normalize(direction);
    // Broad, softly curled patches on a black base; captured once in the cubemap.
    vec3 warped = d + .12 * vec3(
      sin(d.y * 6. + d.z * 3.),
      sin(d.z * 5. - d.x * 4.),
      sin(d.x * 6. + d.y * 3.)
    );
    float shadeA = exp(-dot(warped - vec3(-.6, -.25, .7), warped - vec3(-.6, -.25, .7)) * 7.);
    float shadeB = exp(-dot(warped - vec3(.65, .3, -.55), warped - vec3(.65, .3, -.55)) * 9.);
    float wisps = .65 + .35 * sin(warped.y * 8. + warped.x * 4. + sin(warped.z * 5.));
    float smoke = smoothstep(.04, .75, max(shadeA, shadeB * .7)) * wisps;
    gl_FragColor = vec4(vec3(.045, .018, .075) * smoke, 1.);
    #include <colorspace_fragment>
  }
`;

// Drei recaptures the cubemap and resets rotation when children identity changes.
// Keep this static lighting content stable across resize and parent updates.
const environmentContent = (
  <>
    <Lightformer form="rect" intensity={4} color="#ffffff" position={[-4, 3, 4]} scale={[3, 6, 1]} target={[0, 0, 0]} />
    <Lightformer form="rect" intensity={2} color="#ffffff" position={[4, 1, 2]} scale={[1, 5, 1]} target={[0, 0, 0]} />
    <mesh>
      <sphereGeometry args={[10, 64, 32]} />
      <shaderMaterial
        side={BackSide}
        vertexShader={environmentVertex}
        fragmentShader={environmentFragment}
        toneMapped={false}
      />
    </mesh>
  </>
);

function ReflectiveFloor() {
  const quality = useGraphicsPerformance(graphicsQuality);
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
    reflector.material.fragmentShader = reflector.material.fragmentShader.replace(
      "blendOverlay( base.rgb, color )",
      "mix( vec3( 1.0 ), blendOverlay( base.rgb, color ), 0.35 )"
    );
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

export default function PrismModel({
  prismColor,
  active,
  debug,
  activity,
}: {
  prismColor: string;
  active: boolean;
  debug: boolean;
  activity: SurfaceActivity;
}) {
  const body = useRef<Mesh>(null);
  const compileSmoke = useSurfaceSmoke(body, activity, active, debug);
  const quality = useGraphicsPerformance(graphicsQuality);
  const preset = qualityPresets[quality];
  const viewportWidth = useThree((state) => state.viewport.width);
  const viewportHeight = useThree((state) => state.viewport.height);
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
  // Match the visible bounds of the 720 × 650 loading preview.
  const previewHeight = Math.min(viewportHeight, (viewportWidth * 650) / 720) / 1.12;
  const scale = (previewHeight * (472 / 650)) / 2.8;
  return (
    <>
      <color attach="background" args={["white"]} />
      <ambientLight intensity={0.15} />
      <directionalLight position={[2, 8, -1.5]} intensity={0.5} color="#ffffff" />
      <Environment key={quality} background={false} frames={1} resolution={preset.environment}>
        {environmentContent}
      </Environment>
      <group scale={scale} position={[-previewHeight * 0.008, -previewHeight * 0.025, 0]}>
        <ReflectiveFloor />
        <Bvh firstHitOnly indirect>
          <mesh ref={body} geometry={geometry}>
            <meshPhysicalMaterial
              key={smokeProgramKey()}
              color={prismColor}
              metalness={1}
              roughness={0.085}
              clearcoat={0.65}
              clearcoatRoughness={0.05}
              envMapIntensity={1.5}
              onBeforeCompile={compileSmoke}
              customProgramCacheKey={smokeProgramKey}
            />
          </mesh>
        </Bvh>
      </group>
    </>
  );
}
