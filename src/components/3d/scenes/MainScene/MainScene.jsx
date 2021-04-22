import { OrbitControls, softShadows } from 'drei';
import React, { forwardRef, useEffect } from 'react';
import { Canvas } from 'react-three-fiber';
import CubeMesh from '../../meshes/CubeMesh';
import gui from './gui';

softShadows();

const MainScene = forwardRef(({ fullscreenProps }, ref) => {
  useEffect(() => {
    return () => gui.destroy();
  }, []);

  return (
    <Canvas
      colorManagement
      shadowMap
      itemRef={ref}
      style={{ flex: 1, background: '#222' }}
      camera={{ position: [0, 1, 10], fov: 60 }}>
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
          position={[0, -3, 0]}
          receiveShadow>
          <planeBufferGeometry attach="geometry" args={[100, 100]} />
          <shadowMaterial attach="material" opacity={0.3} />
        </mesh>
        <CubeMesh position={[-2, 1, 0]} args={[1, 1, 1]} speed={6} index={0} />
        <CubeMesh position={[2, 1, 0]} args={[1, 1, 1]} speed={6} index={1} />
      </group>
      <group /** controls */>
        <OrbitControls />
      </group>
    </Canvas>
  );
});

export default MainScene;
