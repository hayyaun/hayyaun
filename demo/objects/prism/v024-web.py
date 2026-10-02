from pathlib import Path
p=Path('app/lab/prism/scene.tsx');s=p.read_text().replace('/v023.glb','/v024.glb').replace('v023 ·','v024 ·').replace('v022-inclusion','v024-inclusion')
s=s.replace('geometry, airGeometry, innerGeometry','geometry, airGeometry')
a=s.index('    const inner =');b=s.index('    copy.translate',a);s=s[:a]+s[b:]
s=s.replace(', innerGeometry: innerCopy','').replace(' innerGeometry?.dispose();','')
a=s.index('      {!solid && innerGeometry');b=s.index('      <mesh ref={mesh}',a);s=s[:a]+s[b:]
p.write_text(s)
