import { MeshWobbleMaterial } from 'drei';
import React, { useEffect, useRef, useState } from 'react';
import { a, config, useSpring } from 'react-spring/three';
import { useFrame } from 'react-three-fiber';
import refManager from '../../../utils/RefManager';
import { meshTypes } from './types';

const SpinningMesh = ({
  position: initPosition = [0, 0, 0],
  scale: initScale = [1, 1, 1],
  color,
  speed,
  args,
}) => {
  const _mesh = useRef();
  refManager.add(_mesh, meshTypes.cube);

  useFrame(() => (_mesh.current.rotation.x = _mesh.current.rotation.y += 0.01));

  const [expand, setExpand] = useState(false);
  const [hover, setHover] = useState(false);
  const [styles, animate] = useSpring(() => ({
    position: initPosition,
    scale: initScale,
  }));

  const [pointerMovement, setPointerMovement] = useState([0, 0]);
  const _prevPosition = useRef(initPosition);
  // update position
  useEffect(() => {
    const currPostition = [
      _prevPosition.current[0] + pointerMovement[0] * 0.01,
      _prevPosition.current[1] - pointerMovement[1] * 0.01,
      _prevPosition.current[2],
    ];

    const updatePosition = async () => {
      await animate({
        position: currPostition,
        config: config.slow,
      });

      _prevPosition.current = currPostition;
    };

    updatePosition();
  }, [pointerMovement]);

  // update scale
  useEffect(() => {
    const updateScale = async () => {
      await animate({
        scale: expand ? [1.4, 1.4, 1.4] : [1, 1, 1],
      });
    };

    updateScale();
  }, [expand]);

  return (
    <a.mesh
      ref={_mesh}
      onClick={() => setExpand(!expand)}
      onPointerOver={(e) => setHover(true)}
      onPointerOut={(e) => setHover(false)}
      onPointerMove={(e) => setPointerMovement([e.movementX, e.movementY])}
      // layout props
      position={styles.position}
      scale={styles.scale}
      castShadow>
      <boxBufferGeometry attach="geometry" args={args} />
      <MeshWobbleMaterial
        color={hover ? 'lightblue' : color}
        speed={speed}
        attach="material"
        factor={0.6}
      />
    </a.mesh>
  );
};

export default SpinningMesh;
