from pathlib import Path
p=Path('app/lab/prism/scene.tsx');s=p.read_text().replace('v019','v020')
s=s.replace('const geometry = useMemo', 'const { geometry, airGeometry } = useMemo')
s=s.replace('    copy.translate(-(bounds.min.x + bounds.max.x) / 2, -(bounds.min.y + bounds.max.y) / 2, -(bounds.min.z + bounds.max.z) / 2);','''    const center = bounds.getCenter(copy.boundingSphere?.center.clone() ?? source.position.clone());
    const air = gltf.scene.getObjectByName("v020-air");
    const airCopy = air instanceof Mesh ? air.geometry.clone() : null;
    if (air instanceof Mesh && airCopy) {
      air.updateWorldMatrix(true, false);
      airCopy.applyMatrix4(air.matrixWorld);
      airCopy.translate(-center.x, -center.y, -center.z);
      airCopy.scale(2.8 / height, 2.8 / height, 2.8 / height);
    }
    copy.translate(-center.x, -center.y, -center.z);''')
s=s.replace('return copy;\n  }, [gltf.scene]);','return { geometry: copy, airGeometry: airCopy };\n  }, [gltf.scene]);')
s=s.replace('useEffect(() => () => geometry.dispose(), [geometry]);','useEffect(() => () => { geometry.dispose(); airGeometry?.dispose(); }, [geometry, airGeometry]);')
s=s.replace('      <mesh ref={mesh}', '''      {!solid && airGeometry && <mesh geometry={airGeometry}>
        <meshPhysicalMaterial color="white" roughness={.025} metalness={0} transmission={1} thickness={.06} ior={1.31} envMapIntensity={1.2} />
      </mesh>}
      <mesh ref={mesh}''')
p.write_text(s)
