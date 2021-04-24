import { OrbitControls, softShadows } from '@react-three/drei';
import { Canvas, useLoader } from '@react-three/fiber';
import React, { forwardRef, Fragment, Suspense, useMemo } from 'react';
import {
  FontLoader,
  MeshMatcapMaterial,
  TextureLoader,
  TorusGeometry,
} from 'three';
import useRefWithCallback from '../../../../hooks/useRefWithCallback';
import useWindowSize from '../../../../hooks/useWindowSize';

softShadows();

const fontLoader = new FontLoader();
const textureLoader = new TextureLoader();

const onCreate = (node) => node.center();
const TextMesh = ({ text = 'Text', size = 1, ...props }) => {
  const _textGeometry0 = useRefWithCallback({ onCreate });
  const poppinsFont = useLoader(
    FontLoader,
    '/assets/fonts/Poppins Black_Regular.json',
  );

  return (
    <mesh {...props}>
      <textGeometry
        ref={_textGeometry0}
        args={[
          text,
          {
            font: poppinsFont,
            size,
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
  );
};

const MainScene = forwardRef(({ fullscreenProps }, ref) => {
  const matcapTexture = useLoader(
    TextureLoader,
    '/assets/matcaps/8A6565_2E214D_D48A5F_ADA59C.jpg',
  );
  const donutGeometry = useMemo(() => new TorusGeometry(0.3, 0.2, 20, 45), []);
  const donutMaterial = useMemo(
    () => matcapTexture && new MeshMatcapMaterial({ matcap: matcapTexture }),
    [matcapTexture],
  );

  const isSSR = typeof window === 'undefined';
  const { width } = useWindowSize();
  return (
    <Canvas
      colorManagement
      shadowMap
      itemRef={ref}
      style={{ flex: 1, background: '#222' }}
      camera={{ position: [0, 0, width > 780 ? 8 : 16], fov: 60 }}>
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

        {!isSSR && (
          <Suspense fallback={null}>
            <Fragment>
              <TextMesh text="HAYYAUN" />
              <TextMesh
                text="THE WEB DEVELOPER"
                position={[0, -1, 0]}
                size={0.42}
              />
            </Fragment>
          </Suspense>
        )}

        {Array.from({ length: 1000 }).map((_, i) => {
          const scale = Math.random() * 0.25 + 0.5;
          return (
            <mesh
              key={i}
              geometry={donutGeometry}
              position={[
                (Math.random() - 0.5) * 50,
                (Math.random() - 0.5) * 50,
                (Math.random() - 1) * 10,
              ]}
              rotation={[Math.random() * Math.PI, Math.random() * Math.PI, 0]}
              scale={[scale, scale, scale]}>
              <meshNormalMaterial />
            </mesh>
          );
        })}
      </group>
      <group /** controls */>
        <OrbitControls />
      </group>
    </Canvas>
  );
});

export default MainScene;
