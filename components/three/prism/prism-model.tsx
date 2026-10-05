"use client";

import { useLoader, useThree } from "@react-three/fiber";
import { Lightformer } from "@react-three/drei/core/Lightformer";
import { Environment } from "@react-three/drei/core/Environment";
import { useEffect, useMemo } from "react";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { BackSide, Mesh, PlaneGeometry, ShaderMaterial } from "three";
import { Reflector } from "three/addons/objects/Reflector.js";
import { graphicsQuality, useGraphicsPerformance } from "@/lib/graphics-performance";
import { qualityPresets } from "./quality-presets";

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

export default function PrismModel({ prismColor }: { prismColor: string }) {
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
        <mesh geometry={geometry}>
          <meshPhysicalMaterial
            color={prismColor}
            metalness={1}
            roughness={0.085}
            clearcoat={0.65}
            clearcoatRoughness={0.05}
            envMapIntensity={1.5}
          />
        </mesh>
      </group>
    </>
  );
}
