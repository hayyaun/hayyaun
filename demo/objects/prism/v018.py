import bpy,bmesh,os,json,math
out=r'\\wsl$\Ubuntu\home\garfield\projects\hayyaun\demo\objects\prism'
ob=bpy.data.objects['Reference Prism']
if os.path.normcase(bpy.data.filepath)==os.path.normcase(os.path.join(out,'v017.blend')):mesh=ob.data.copy()
else:
 with bpy.data.libraries.load(os.path.join(out,'v017.blend'),link=False) as (a,b):b.objects=['Reference Prism']
 source=b.objects[0];mesh=source.data.copy();bpy.data.objects.remove(source)
mesh.name='v018';original=[v.co.copy() for v in mesh.vertices];N=160
for k in range(160):
 h=1-(1-k/160)**2
 if h>=.52:continue
 ring=original[k*N:(k+1)*N];lo=min(v.x for v in ring);hi=max(v.x for v in ring);center=(lo+hi)/2
 # Translate the left side inward, fading smoothly across width and up the face.
 t=max(0,min(1,(h-.14)/.38));fade=1-t*t*t*(t*(t*6-15)+10)
 for j,v in enumerate(ring):
  u=max(0,min(1,(center-v.x)/(center-lo)));weight=u*u*(3-2*u)
  mesh.vertices[k*N+j].co.x+=.18*fade*weight
mesh.update();bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh)
report={'max_inward_shift':max(v.co.x-original[i].x for i,v in enumerate(mesh.vertices)),'non_manifold_edges':sum(not e.is_manifold for e in bm.edges),'top_displacement':max((v.co-original[i]).length for i,v in enumerate(mesh.vertices) if i>=50*N)};bm.free()
ob.data=mesh;ob['description']='v018: lower left base inset 0.18 units, smoothly faded into left face; right and crown unchanged.'
bpy.context.scene['design_version']='v018';bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out,'v018.blend'))
for o in bpy.context.scene.objects:o.select_set(False)
ob.select_set(True);bpy.context.view_layer.objects.active=ob
bpy.ops.export_scene.gltf(filepath=os.path.join(out,'v018.glb'),export_format='GLB',use_selection=True,export_materials='EXPORT',export_animations=False,export_yup=True)
json.dump(report,open(os.path.join(out,'v018-validation.json'),'w'),indent=2);print(report)
