from pathlib import Path
import shutil
root = Path(__file__).resolve().parents[3]
path = root / 'app/lab/prism/scene.tsx'
s = path.read_text()
s = s.replace('/lab/prism/v025.glb','/lab/prism/v026.glb').replace('v025 ·','v026 ·')
s = s.replace('const { geometry, airGeometry }', 'const { geometry, airGeometry, sectionGeometry }')
s = s.replace('    copy.translate(-center.x', '''    const section = gltf.scene.getObjectByName("v026-section");
    const sectionCopy = section instanceof Mesh ? section.geometry.clone() : null;
    if (section instanceof Mesh && sectionCopy) {
      section.updateWorldMatrix(true, false);
      sectionCopy.applyMatrix4(section.matrixWorld);
      sectionCopy.translate(-center.x, -center.y, -center.z);
      sectionCopy.scale(2.8 / height, 2.8 / height, 2.8 / height);
    }
    copy.translate(-center.x''')
s = s.replace('airGeometry: airCopy }', 'airGeometry: airCopy, sectionGeometry: sectionCopy }')
s = s.replace('airGeometry?.dispose(); }, [geometry, airGeometry]', 'airGeometry?.dispose(); sectionGeometry?.dispose(); }, [geometry, airGeometry, sectionGeometry]')
s = s.replace('      <mesh ref={mesh}', '''      {!solid && sectionGeometry && <mesh geometry={sectionGeometry}>
        <meshPhysicalMaterial color="#ffffff" transmission={1} roughness={.025} ior={1.31} thickness={.008} envMapIntensity={1.2} />
      </mesh>}
      <mesh ref={mesh}''')
path.write_text(s)
shutil.copyfile(root/'demo/objects/prism/v026.glb',root/'public/lab/prism/v026.glb')
check = root/'demo/objects/prism/v025-check.mjs'
(check.parent/'v026-check.mjs').write_text(check.read_text().replace('v025.glb','v026.glb'))
for f in ('demo/objects/prism/README.md','public/lab/prism/ASSET-NOTES.md'):
    with (root/f).open('a') as stream:
        stream.write('\n\nv026: Added a thin glass section at height 0.66 fitted inside the outer outline. Preserves v025 bubble and outer body; upper inner prism remains removed.\n')
