from pathlib import Path
p=Path('demo/objects/prism/v006.py')
s=p.read_text().replace('v006','v007')
a=s.index(' if h>.23:');b=s.index(' rx=w*r;ry=d*r',a)
s=s[:a]+''' if h>.15:
  # A monotone tangent shoulder joins the existing rounded base to each plane.
  def profile(h, intercept):
   slope=1.12; end=.34; start=.15
   if h<end:
    u=(h-start)/(end-start); target=slope*(1-end)+intercept
    return (2*u**3-3*u*u+1)+(-2*u**3+3*u*u)*target+(u**3-u*u)*(end-start)*(-slope)
   crown=1-intercept/slope
   return slope*(1-h)+intercept if h<=crown else math.sqrt(4*slope*intercept*(1-h))
  w=profile(h,.0956);d=profile(h,.084)
  u=max(0,min(1,(h-.15)/.19));blend=u*u*(3-2*u)
  r=.30*(1-blend)+.065*blend
 if h>.88:
  u=min(1,(h-.88)/.12);r=.065+.935*u*u*(3-2*u)
''' +s[b:]
s=s.replace('range(160*20)','range(160*12)')
s=s.replace("material=ob.data.materials[0];mesh.materials.append(material)",'''material=bpy.data.materials.new('v007');material.use_nodes=True
nodes=material.node_tree.nodes;nodes.clear()
shader=nodes.new('ShaderNodeBsdfPrincipled');output=nodes.new('ShaderNodeOutputMaterial')
shader.inputs['Base Color'].default_value=(.86,.95,1,1)
shader.inputs['Metallic'].default_value=0
shader.inputs['Roughness'].default_value=.19
shader.inputs['IOR'].default_value=1.31
shader.inputs['Transmission Weight'].default_value=.94
material.node_tree.links.new(shader.outputs['BSDF'],output.inputs['Surface'])
mesh.materials.append(material)''')
p.with_name('v007.py').write_text(s)
p=Path('app/lab/prism/scene.tsx');s=p.read_text().replace('v006','v007').replace('Show glass','Show ice').replace('rounded glass prism','rounded ice prism').replace('roughness={.065}','roughness={.19}').replace('ior={1.33}','ior={1.31}').replace('transmission={1}','transmission={.94}').replace('chromaticAberration={.012}','chromaticAberration={.003}').replace('color="#fbfdff" attenuationColor="#f7fbff" attenuationDistance={5.6}','color="#eef8ff" attenuationColor="#b9e1ef" attenuationDistance={3.5}')
p.write_text(s)
