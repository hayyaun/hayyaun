from pathlib import Path
p=Path('app/lab/prism/scene.tsx');s=p.read_text().replace('/v022.glb','/v023.glb').replace('v022 ·','v023 ·')
s=s.replace('geometry, airGeometry','geometry, airGeometry, innerGeometry')
s=s.replace('    copy.translate(-center.x, -center.y, -center.z);','''    const inner = gltf.scene.getObjectByName("v023-inner");
    const innerCopy = inner instanceof Mesh ? inner.geometry.clone() : null;
    if (inner instanceof Mesh && innerCopy) {
      inner.updateWorldMatrix(true, false);
      innerCopy.applyMatrix4(inner.matrixWorld);
      innerCopy.translate(-center.x, -center.y, -center.z);
      innerCopy.scale(2.8 / height, 2.8 / height, 2.8 / height);
    }
    copy.translate(-center.x, -center.y, -center.z);''')
s=s.replace('airGeometry: airCopy }','airGeometry: airCopy, innerGeometry: innerCopy }')
s=s.replace('airGeometry?.dispose();','airGeometry?.dispose(); innerGeometry?.dispose();')
s=s.replace('      <mesh ref={mesh}', '''      {!solid && innerGeometry && <mesh geometry={innerGeometry}>
        <meshPhysicalMaterial color="#ffffff" roughness={.025} transmission={1} thickness={.8} ior={1.31} clearcoat={.12} attenuationColor="#f2f9ff" attenuationDistance={12} envMapIntensity={1.2} />
      </mesh>}
      <mesh ref={mesh}''')
p.write_text(s)
