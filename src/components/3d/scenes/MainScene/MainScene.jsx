import { OrbitControls, softShadows, useHelper } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import React, {
  forwardRef,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { DirectionalLightHelper, PointLightHelper } from 'three';
import useRefWithCallback from '../../../../hooks/useRefWithCallback';
import useWindowSize from '../../../../hooks/useWindowSize';
import DonutMesh from '../../meshes/DonutMesh';
import TextMesh from '../../meshes/TextMesh';
import gui, { lightsFolder } from './gui';

softShadows();

const Lights = () => {
  const isDev = useMemo(() => process.env.NODE_ENV === 'development', []);

  // --- debug ---
  const onAmbientLightCreate = useCallback((node) => {
    const ambientLightFolder = lightsFolder.addFolder('ambient light');
    ambientLightFolder.add(node, 'intensity').min(0).max(1).step(0.1);
    return () => lightsFolder.removeFolder(ambientLightFolder);
  }, []);
  const onDirectionalLightCreate = useCallback((node) => {
    const directionalLightFolder = lightsFolder.addFolder('directional light');
    directionalLightFolder.add(node, 'castShadow');
    return () => lightsFolder.removeFolder(directionalLightFolder);
  }, []);

  // --- refs ---
  const _ambientLight = useRefWithCallback({ onCreate: onAmbientLightCreate });
  const _directionalLight = useRefWithCallback({
    onCreate: onDirectionalLightCreate,
  });
  const _pointLight0 = useRef();
  const _pointLight1 = useRef();

  // -- helpers ---
  useHelper(isDev && _directionalLight, DirectionalLightHelper);
  useHelper(isDev && _pointLight0, PointLightHelper);
  useHelper(isDev && _pointLight1, PointLightHelper);

  return (
    <group>
      <ambientLight intensity={0.3} ref={_ambientLight} />
      <directionalLight
        ref={_directionalLight}
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
      <pointLight ref={_pointLight0} position={[-10, 0, -20]} intensity={0.5} />
      <pointLight ref={_pointLight1} position={[0, -10, 0]} intensity={1.5} />
    </group>
  );
};

const Meshes = () => {
  return (
    <group>
      <Suspense fallback={null}>
        <TextMesh text="HAYYAUN" />
        <TextMesh text="THE WEB DEVELOPER" position={[0, -1, 0]} size={0.42} />
      </Suspense>
      {Array.from({ length: 5000 }).map((_, i) => (
        <DonutMesh key={i} />
      ))}
    </group>
  );
};

const Controls = () => {
  const isDev = process.env.NODE_ENV === 'development';
  return (
    <group>
      <OrbitControls maxDistance={!isDev ? 16 : undefined} minDistance={2} />
    </group>
  );
};

const MainScene = forwardRef(({ fullscreenProps }, _canvas) => {
  const { width } = useWindowSize();
  useEffect(() => {
    return () => gui.destroy();
  }, []);

  return (
    <Canvas
      colorManagement
      shadowMap
      itemRef={_canvas}
      style={{ flex: 1, background: '#222' }}
      camera={{
        position: [0, -1, width > 780 ? 6 : 14],
        fov: 60,
      }}>
      <Lights />
      <Meshes />
      <Controls />
    </Canvas>
  );
});

export default MainScene;
