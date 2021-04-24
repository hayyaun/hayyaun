import { useFrame } from '@react-three/fiber';
import React, { useRef } from 'react';
import { donutGeometry } from '../geometries';

const rMin = 6;
const rMax = 100;

const DonutMesh = () => {
  const _ref = useRef();
  const scale = Math.random() * 0.25 + 0.5;
  const rxs = (Math.random() - 0.5) * 5;
  const rys = (Math.random() - 0.5) * 5;

  const r = Math.random() * (rMax - rMin) + rMin;
  const zMax = Math.sqrt(Math.pow(rMax, 2) - Math.pow(r, 2));
  const t = Math.random() * Math.PI * 2;
  const px = Math.cos(t) * r;
  const py = Math.sin(t) * r;
  const pz0 = (Math.random() - 0.5) * 2 * zMax;
  const pz = pz0 > 0 ? pz0 + 1 : pz0 - 1;

  const pxs = (Math.random() - 0.5) * 0.01;
  const pys = (Math.random() - 0.5) * 0.01;

  useFrame(({ clock }) => {
    _ref.current.rotation.x = rxs * clock.elapsedTime;
    _ref.current.rotation.y = rys * clock.elapsedTime;
    _ref.current.rotation.y = rys * clock.elapsedTime;

    const dtx = clock.elapsedTime * Math.PI * 2 * pxs;
    const dty = clock.elapsedTime * Math.PI * 2 * pys;
    _ref.current.position.x = Math.cos(t + dtx) * r;
    _ref.current.position.y = Math.sin(t + dty) * r;
  });

  return (
    <mesh
      ref={_ref}
      geometry={donutGeometry}
      position={[px, py, pz]}
      rotation={[Math.random() * Math.PI, Math.random() * Math.PI, 0]}
      scale={[scale, scale, scale]}>
      <meshNormalMaterial />
    </mesh>
  );
};

export default DonutMesh;
