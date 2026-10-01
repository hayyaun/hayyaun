import bpy, numpy as np, json, os, bmesh
out=r'\\wsl$\Ubuntu\home\garfield\projects\hayyaun\demo\objects\prism'
ob=bpy.data.objects['Reference Prism'];mesh=ob.data
ice=mesh.materials[0]
with bpy.data.libraries.load(os.path.join(out,'v005.blend'),link=False) as (src,dst):dst.objects=['Reference Prism']
restored=dst.objects[0];ob.data=restored.data.copy();ob.matrix_world=restored.matrix_world.copy();bpy.data.objects.remove(restored)
mesh=ob.data;mesh.name='v009';mesh.materials.clear();mesh.materials.append(ice)
original=[v.co.copy() for v in mesh.vertices]
mask=mesh.attributes.get('perimeter_finish')
groups=[[],[],[],[]]
for k in range(160):
 h=1-(1-k/160)**2
 if not .30<h<.86:continue
 ring=original[k*160:(k+1)*160]
 center=[(min(v[a] for v in ring)+max(v[a] for v in ring))/2 for a in (0,1)]
 extent=[(max(v[a] for v in ring)-min(v[a] for v in ring))/2 for a in (0,1)]
 for j,v in enumerate(ring):
  i=k*160+j
  if mask and mask.data[i].value>.5:continue
  nx=(v.x-center[0])/extent[0];ny=(v.y-center[1])/extent[1]
  if abs(nx)<.70:groups[0 if ny<0 else 1].append((i,h,abs(nx)))
  elif abs(ny)<.70:groups[2 if nx<0 else 3].append((i,h,abs(ny)))
def smooth(x):
 x=max(0,min(1,x));return x*x*x*(x*(x*6-15)+10)
for g,items in enumerate(groups):
 axis=1 if g<2 else 0;other=1-axis
 A=np.array([[original[i].z,original[i][other],1] for i,h,t in items]);b=np.array([original[i][axis] for i,h,t in items])
 coefficients=np.linalg.lstsq(A,b,rcond=None)[0]
 for (i,h,t),row in zip(items,A):
  delta=float(row@coefficients)-original[i][axis]
  weight=smooth((h-.30)/.15)*smooth((.86-h)/.08)*smooth((.70-t)/.25)
  mesh.vertices[i].co[axis]+=float(.008*np.tanh(delta/.04))*weight
mesh.update()
for p in mesh.polygons:p.use_smooth=True
bm=bmesh.new();bm.from_mesh(mesh)
report={'base_max_displacement':max((mesh.vertices[i].co-original[i]).length for i in range(160*27)), 'all_max_displacement':max((v.co-original[i]).length for i,v in enumerate(mesh.vertices)), 'non_manifold_edges':sum(not e.is_manifold for e in bm.edges),'modified_vertices':sum((v.co-original[i]).length>1e-9 for i,v in enumerate(mesh.vertices))};bm.free()
assert report['base_max_displacement']==0
ob['description']='v009: v005 shape restored; only upper face interiors adjusted, bottom and edge vertices locked.'
bpy.context.scene['design_version']='v009'
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out,'v009.blend'))
for obj in bpy.context.scene.objects:obj.select_set(False)
ob.select_set(True);bpy.context.view_layer.objects.active=ob
bpy.ops.export_scene.gltf(filepath=os.path.join(out,'v009.glb'),export_format='GLB',use_selection=True,export_materials='EXPORT',export_animations=False,export_yup=True)
open(os.path.join(out,'v009-validation.json'),'w').write(json.dumps(report,indent=2));print(report)

