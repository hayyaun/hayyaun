from pathlib import Path
s=Path('demo/objects/prism/v005.py').read_text().replace('v005','v010')
s=s.replace("s=bpy.context.scene;ob=bpy.data.objects['Reference Prism'];target=tuple(ob.dimensions)","s=bpy.context.scene;ob=bpy.data.objects['Reference Prism'];target=(4.228592395782471,2.6428701877593994,3.669999599456787)")
a=s.index(' if h>.50:');b=s.index(' rx=w*r;ry=d*r',a)
s=s[:a]+''' if h>.23:
  # Four affine face planes, with a tangent rounded tip confined to the apex.
  def planar_profile(h,slope,offset):
   join=1-offset/slope
   return slope*(1-h)+offset if h<=join else math.sqrt(4*slope*offset*(1-h))
  u=max(0,min(1,(h-.23)/.13));blend=u*u*u*(u*(u*6-15)+10)
  w=w*(1-blend)+planar_profile(h,1.20,.034)*blend
  d=d*(1-blend)+planar_profile(h,1.19,.0337)*blend
  r=r*(1-blend)+.12*blend
 if h>.87:
  u=min(1,(h-.87)/.10);r=.12+.88*u*u*(3-2*u)
''' +s[b:]
s=s.replace('x*=1-.055*(y/max(d,.001)+1)/2','''t=max(0,min(1,(h-.23)/.13));flat=t*t*t*(t*(t*6-15)+10)
  x=.9725*x-.0275*y*((w/max(d,.001))*(1-flat)+(1.20/1.19)*flat)''')
s=s.replace('  verts.append((x+.055*h,y+.045*h,z))','''  z=h+(z-h)*(1-flat)
  verts.append((x+.055*h,y+.045*h,z))''')
s=s.replace("material=ob.data.materials[0];mesh.materials.append(material)",'''# Lock every original lower vertex, without refitting or smoothing it.
with bpy.data.libraries.load(os.path.join(out,'v005.blend'),link=False) as (src,dst):dst.objects=['Reference Prism']
source=dst.objects[0];bottom=[]
for k in range(levels):
 if 1-(1-k/levels)**2<=.23:
  for j in range(N):
   i=k*N+j;mesh.vertices[i].co=source.data.vertices[i].co;bottom.append(i)
report['bottom_max_displacement']=max((mesh.vertices[i].co-source.data.vertices[i].co).length for i in bottom)
bpy.data.objects.remove(source)
material=ob.data.materials[0];mesh.materials.append(material)''')
s=s.replace("ob['description']=", "ob['description']=")
s=s.replace('rounded analytic crown, smoother side transitions, opposed front/back faces and preserved right-rising base shoulder.','single planar face regions with rounded outlines; tangent apex; original lower vertices preserved.')
s=s.replace("s['design_version']='v010'", "bpy.context.view_layer.update()\ns['design_version']='v010'")
Path('demo/objects/prism/v010.py').write_text(s)
p=Path('demo/objects/prism/v006-preview.py');Path('demo/objects/prism/v010-preview.py').write_text(p.read_text().replace('v006','v010'))
