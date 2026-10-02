from pathlib import Path
import re
root = Path(__file__).resolve().parents[3]
p = root/'app/lab/prism/scene.tsx'
s = p.read_text(encoding='utf-8-sig')
s = s.replace('Canvas, useFrame, useThree, useLoader','Canvas, useThree, useLoader')
s = s.replace('import { Environment }', 'import { Lightformer } from "@react-three/drei/core/Lightformer";\nimport { Environment }')
s = s.replace('Mesh, ShaderMaterial, TextureLoader, SRGBColorSpace','Mesh')
s = re.sub(r'const smokeFragment =.*?const shadowFragment', 'const shadowFragment', s, flags=re.S)
s = s.replace('function Study({ reduced, active, solid }: { reduced: boolean; active: boolean; solid: boolean })','function Study({ solid }: { solid: boolean })')
s = s.replace('  const smoke = useRef<ShaderMaterial>(null);\n','').replace('  const time = useRef(12);\n','').replace('const { invalidate, viewport }','const { viewport }')
s = re.sub(r'  const sourceTexture=.*?  useEffect\(\(\) => \(\) =>', '  useEffect(() => () =>', s, flags=re.S)
s = re.sub(r'  useEffect\(\(\) => \{\n    invalidate\(\);.*?  const scale', '  const scale', s, flags=re.S)
s = s.replace('color="#fffaff"','color="#ffffff"')
s = s.replace('<Environment files="/lab/prism/studio.hdr" environmentRotation={[0,1.7,0]} />','''<Environment background={false} frames={1} resolution={256}>
      <color attach="background" args={["#34383e"]} />
      <Lightformer form="rect" color="#edf1f5" intensity={4} position={[-4,3,4]} scale={[3,6,1]} target={[0,0,0]} />
      <Lightformer form="rect" color="#bcc4cc" intensity={2} position={[4,1,2]} scale={[1,5,1]} target={[0,0,0]} />
      <Lightformer form="rect" color="#ffffff" intensity={3} position={[0,5,-2]} scale={[5,2,1]} target={[0,0,0]} />
      <Lightformer form="rect" color="#707983" intensity={1} position={[-3,-2,-4]} scale={[4,3,1]} target={[0,0,0]} />
    </Environment>''')
s = re.sub(r'      <mesh position=\{\[-\.12,\.45,-1\.35\]\}>.*?</mesh>\n', '', s, flags=re.S)
s = s.replace('vec4(.42,.34,.56,a)','vec4(.32,.34,.37,a)')
s = s.replace('  const [active,setActive]=useState(true);\n','')
s = re.sub(r'    let visible=true;.*?  },\[\]\);','    return ()=>query.removeEventListener("change",syncMotion);\n  },[]);',s,flags=re.S)
s = s.replace('<Study reduced={reduced} active={active&&!lost} solid={solid} />','<Study solid={solid} />')
s = s.replace('A rounded ice prism refracts drifting lavender smoke.','A rounded glass prism reflects a silver studio environment.')
p.write_text(s,encoding='utf-8')
p=root/'app/lab/prism/page.tsx'; s=p.read_text().replace('An ice prism refracting a procedural lavender smoke field.','A glass prism reflecting a hidden silver studio environment.').replace('Ice prism and lavender smoke study','Glass prism studio study'); p.write_text(s)
p=root/'app/lab/prism/prism-lab.tsx'; s=p.read_text().replace('Ice prism with lavender smoke','Glass prism').replace('<div className={styles.smoke} />',''); p.write_text(s)
