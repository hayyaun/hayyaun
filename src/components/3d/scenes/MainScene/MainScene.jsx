import { OrbitControls, softShadows } from '@react-three/drei';
import { Canvas, useLoader } from '@react-three/fiber';
import React, {
  forwardRef,
  Suspense,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import { FontLoader } from 'three';
import useRefWithCallback from '../../../../hooks/useRefWithCallback';
import CubeMesh from '../../meshes/CubeMesh';

softShadows();

const MainScene = forwardRef(({ fullscreenProps }, ref) => {
  const _textGeometry0 = useRefWithCallback({
    onCreate: (node) => node.center(),
  });

  const font = useLoader(
    FontLoader,
    '/assets/fonts/Poppins Black_Regular.json',
  );

  return (
    <Canvas
      colorManagement
      shadowMap
      itemRef={ref}
      style={{ flex: 1, background: '#222222' }}
      camera={{ position: [0, 1, 10], fov: 60 }}>
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
                  font,
                  size: 0.5,
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
        </group>
        <group /** controls */>
          <OrbitControls />
        </group>
      </Suspense>
    </Canvas>
  );
});

export default MainScene;
