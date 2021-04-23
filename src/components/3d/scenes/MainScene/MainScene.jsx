import { OrbitControls, softShadows } from '@react-three/drei';
import { Canvas, useLoader } from '@react-three/fiber';
import React, { forwardRef, Suspense, useMemo } from 'react';
import {
  FontLoader,
  MeshMatcapMaterial,
  TextureLoader,
  TorusGeometry,
} from 'three';
import useRefWithCallback from '../../../../hooks/useRefWithCallback';

softShadows();

const onCreate = (node) => node.center();

const MainScene = forwardRef(({ fullscreenProps }, ref) => {
  const _textGeometry0 = useRefWithCallback({ onCreate });

  const poppinsFont = useLoader(
    FontLoader,
    '/assets/fonts/Poppins Black_Regular.json',
  );

  const matcapTexture = useLoader(
    TextureLoader,
    '/assets/matcaps/7877EE_D87FC5_75D9C7_1C78C0-128px.png',
  );

  const donutGeometry = useMemo(() => new TorusGeometry(0.3, 0.2, 20, 45), []);
  const donutMaterial = useMemo(
    () => new MeshMatcapMaterial({ matcap: matcapTexture }),
    [],
  );

  return (
    <Canvas
      colorManagement
      shadowMap
      itemRef={ref}
      style={{ flex: 1, background: '#222222' }}
      camera={{ position: [0, 0, 10], fov: 60 }}>
      <Suspense fallback={null}>
        <group /** lights */>
          <ambientLight intensity={0.3} />
          <directionalLight
            castShadow
            position={[0, 10, 0]}
            intensity={1.5}
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
            shadow-camera-far={50}
            shadow-camera-left={-10}
            shadow-camera-right={10}
            shadow-camera-top={10}
            shadow-camera-bottom={-10}
          />
          <pointLight position={[-10, 0, -20]} intensity={0.5} />
          <pointLight position={[0, -10, 0]} intensity={1.5} />
        </group>
        <group /** meshes */>
          <mesh // floor
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, 0, 0]}
            receiveShadow>
            <planeBufferGeometry attach="geometry" args={[100, 100]} />
            <shadowMaterial attach="material" opacity={0.3} />
          </mesh>

          <mesh>
            <textGeometry
              ref={_textGeometry0}
              args={[
                'HAYYAUN',
                {
                  font: poppinsFont,
                  size: 1,
                  height: 0.2,
                  curveSegments: 12,
                  bevelEnabled: true,
                  bevelThickness: 0.03,
                  bevelSize: 0.02,
                  bevelOffset: 0,
                  bevelSegments: 5,
                },
              ]}
            />
            <meshNormalMaterial />
          </mesh>

          <mesh position={[0, -1, 0]}>
            <textGeometry
              ref={_textGeometry0}
              args={[
                'The Web Developer',
                {
                  font: poppinsFont,
                  size: 0.42,
                  height: 0.2,
                  curveSegments: 12,
                  bevelEnabled: true,
                  bevelThickness: 0.03,
                  bevelSize: 0.02,
                  bevelOffset: 0,
                  bevelSegments: 5,
                },
              ]}
            />
            <meshNormalMaterial />
          </mesh>

          {Array.from({ length: 1000 }).map((_, i) => {
            const scale = Math.random() * 0.25 + 0.5;
            return (
              <mesh
                key={i}
                geometry={donutGeometry}
                material={donutMaterial}
                position={[
                  (Math.random() - 0.5) * 50,
                  (Math.random() - 0.5) * 50,
                  (Math.random() - 1) * 10,
                ]}
                rotation={[Math.random() * Math.PI, Math.random() * Math.PI, 0]}
                scale={[scale, scale, scale]}></mesh>
            );
          })}
        </group>
        <group /** controls */>
          <OrbitControls />
        </group>
      </Suspense>
    </Canvas>
  );
});

export default MainScene;
