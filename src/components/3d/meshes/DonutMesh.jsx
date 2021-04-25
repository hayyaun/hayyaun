import { useFrame } from '@react-three/fiber';
import React, { memo, useMemo, useRef } from 'react';
import { donutGeometry } from '../geometries';

const rMin = 12;
const rMax = 100;

const DonutMesh = () => {
  const _ref = useRef();
  const { scale, rxs, rys, r, t, f, px, py, pz, dts, dfs } = useMemo(() => {
    const scale = Math.random() * 0.25 + 0.5;

    const rxs = (Math.random() - 0.5) * 5;
    const rys = (Math.random() - 0.5) * 5;
    const dts = (Math.random() - 0.5) * 0.01;
    const dfs = (Math.random() - 0.5) * 0.01;

    const r = Math.random() * (rMax - rMin) + rMin;
    const t = Math.random() * Math.PI;
    const f = Math.random() * Math.PI * 2;

    const px = r * Math.cos(f) * Math.sin(t);
    const pz = r * Math.sin(f) * Math.sin(t);
    const py = r * Math.cos(t);

    return { scale, rxs, rys, r, t, f, px, py, pz, dts, dfs };
  }, []);

  useFrame(({ clock }) => {
    _ref.current.rotation.x = rxs * clock.elapsedTime;
    _ref.current.rotation.y = rys * clock.elapsedTime;
    const dt = clock.elapsedTime * Math.PI * dts;
    const df = clock.elapsedTime * Math.PI * 2 * dfs;
    _ref.current.position.x = r * Math.cos(f + df) * Math.sin(t + dt);
    _ref.current.position.z = r * Math.sin(f + df) * Math.sin(t + dt);
    _ref.current.position.y = r * Math.cos(t + dt);
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

export default memo(DonutMesh);
