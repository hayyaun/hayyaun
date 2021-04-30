import { OrbitControls, softShadows, useHelper } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
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
import { folderTypes } from '../../gui';
import gui, { lightsFolder } from '../../gui/gui';
import DonutMesh from '../../meshes/DonutMesh';
import TextMesh from '../../meshes/TextMesh';

softShadows();

const Lights = () => {
  const isDev = useMemo(() => process.env.NODE_ENV === 'development', []);

  // --- debug ---
  const onAmbientLightCreate = useCallback((node) => {
    const ambientLightFolder =
      lightsFolder.__folders[folderTypes.ambientLight] ||
      lightsFolder.addFolder(folderTypes.ambientLight);
    ambientLightFolder.add(node, 'intensity').min(0).max(1).step(0.1);
    return () => lightsFolder.removeFolder(ambientLightFolder);
  }, []);
  const onDirectionalLightCreate = useCallback((node) => {
    const directionalLightFolder =
      lightsFolder.__folders[folderTypes.directionalLight] ||
      lightsFolder.addFolder(folderTypes.directionalLight);
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

const CameraHandler = () => {
  useFrame(({ clock, camera }) => {
    camera.position.x = Math.sin(clock.elapsedTime * 0.25) * 5;
    camera.position.y = Math.cos(clock.elapsedTime * 0.75) * 1.5;
  });
  return null;
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
      <CameraHandler />
      <Lights />
      <Meshes />
      <Controls />
    </Canvas>
  );
});

export default MainScene;
