import { MeshWobbleMaterial } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import gsap, { Power1 } from 'gsap';
import React, { useCallback, useEffect, useRef } from 'react';
import { Color } from 'three';
import refManager from '../../../utils/refManager';
import gui from '../scenes/MainScene/gui';
import { meshTypes } from './types';

const cubesFolder = gui && (gui.__folders.cubes || gui.addFolder('cubes'));

const CubeMesh = ({
  position = [0, 0, 0],
  scale = [1, 1, 1],
  color = 0xffffff,
  speed,
  args,
  index,
}) => {
  const _mesh = useRef();
  const _material = useRef();

  // --- Initialize ---

  useEffect(() => {
    refManager.add(_mesh, meshTypes.cube);
    return () => refManager.remove(meshTypes.cube);
  }, []);

  // --- Actions ---

  useFrame(() => (_mesh.current.rotation.x = _mesh.current.rotation.y += 0.01));

  const jump = useCallback(async () => {
    await gsap.to(_mesh.current.position, {
      duration: 0.42,
      y: _mesh.current.position.y + 1,
      ease: Power1.easeOut,
    });
    await gsap.to(_mesh.current.position, {
      duration: 0.42,
      y: _mesh.current.position.y - 1,
      ease: Power1.easeIn,
    });
  }, []);

  // --- Debug ---

  useEffect(() => {
    const cubeFolder = cubesFolder.addFolder(index);
    const meshFolder = cubeFolder.addFolder('mesh');
    const materialFolder = cubeFolder.addFolder('material');
    const actionsFolder = cubeFolder.addFolder('actions');

    if (_mesh.current && _material.current) {
      // mash
      meshFolder.add(_mesh.current, 'visible');
      meshFolder
        .add(_mesh.current.position, 'x')
        .name('position')
        .min(-10)
        .max(10)
        .step(0.1);
      // material
      materialFolder.add(_material.current, 'wireframe');
      materialFolder
        .addColor({ color: new Color(color).getHex() }, 'color')
        .onChange((color) => _material.current.color.set(color));
      //actions
      actionsFolder.add({ jump }, 'jump');
    }

    return () => {
      cubesFolder.removeFolder(cubeFolder);
    };
  }, [index, color, jump]);

  return (
    <mesh ref={_mesh} position={position} scale={scale} castShadow>
      <boxBufferGeometry attach="geometry" args={args} />
      <MeshWobbleMaterial
        ref={_material}
        color={color}
        speed={speed}
        attach="material"
        factor={0.6}
      />
    </mesh>
  );
};

export default CubeMesh;
