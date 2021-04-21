import { softShadows } from 'drei';
import React, { useCallback } from 'react';
import { Canvas } from 'react-three-fiber';
import refManager from '../../../utils/RefManager';
import SpinningMesh from '../meshes/SpinningMesh';
import { meshTypes } from '../meshes/types';

softShadows();

const ObjectsScene = () => {
  return (
    <Canvas
      colorManagement
      shadowMap
      camera={{ position: [0, 1, 10], fov: 60 }}>
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

      <group>
        <mesh /** floor */
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -3, 0]}
          receiveShadow>
          <planeBufferGeometry attach="geometry" args={[100, 100]} />
          <shadowMaterial attach="material" opacity={0.3} />
        </mesh>
        <SpinningMesh
          position={[-2, 1, -5]}
          args={[1, 1, 1]}
          color="pink"
          speed={6}
        />
        <SpinningMesh
          position={[2, 1, -5]}
          args={[1, 1, 1]}
          color="pink"
          speed={6}
        />
      </group>

      {/* <OrbitControls /> */}
    </Canvas>
  );
};

export default ObjectsScene;
