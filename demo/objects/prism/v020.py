import bpy,bmesh,os,json,math
out=r'\\wsl$\Ubuntu\home\garfield\projects\hayyaun\demo\objects\prism'
ob=bpy.data.objects['Reference Prism'];mesh=ob.data.copy();mesh.name='v020';old=[v.co.copy() for v in mesh.vertices]
# Small symmetric surface relaxation, keeping crown and sole locked.
for iteration in range(4):
 coords=[v.co.copy() for v in mesh.vertices]
 for k in range(3,92):
  h=1-(1-k/160)**2;weight=min(1,(h-.03)/.10,(.82-h)/.12);weight=max(0,weight)
  for j in range(160):
   i=k*160+j
   mean=(coords[i-160]+coords[i+160]+coords[k*160+(j-1)%160]+coords[k*160+(j+1)%160])/4
   mesh.vertices[i].co=coords[i].lerp(mean,.18*weight)
mesh.update();ob.data=mesh
mat=bpy.data.materials.new('v020-air');mat.use_nodes=True
p=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED');p.inputs['Base Color'].default_value=(1,1,1,1);p.inputs['Roughness'].default_value=.025;p.inputs['Transmission Weight'].default_value=1;p.inputs['IOR'].default_value=1.31
bubbles=[]
for i,(pos,scale) in enumerate([((1.22,-.58,.43),(.12,.08,.14)),((1.45,-.44,.35),(.067,.055,.08)),((1.02,-.62,.29),(.05,.045,.06)),((1.36,-.38,.62),(.04,.035,.05)),((.91,-.48,.42),(.027,.025,.03))]):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=16,radius=1,location=pos)
 o=bpy.context.object;o.name='v020-air-'+str(i+1);o.scale=scale
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.reverse_faces(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free()
 for f in o.data.polygons:f.use_smooth=True
 o.data.materials.append(mat);bubbles.append(o)
for o in bpy.context.scene.objects:o.select_set(False)
for o in bubbles:o.select_set(True)
bpy.context.view_layer.objects.active=bubbles[0];bpy.ops.object.join();air=bpy.context.object;air.name='v020-air'
report={'surface_max_adjustment':max((v.co-old[i]).length for i,v in enumerate(mesh.vertices)),'bubble_count':5,'crown_displacement':max((v.co-old[i]).length for i,v in enumerate(mesh.vertices) if i>=92*160)}
bpy.context.scene['design_version']='v020';bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out,'v020.blend'))
for o in bpy.context.scene.objects:o.select_set(False)
ob.select_set(True);air.select_set(True);bpy.context.view_layer.objects.active=ob
bpy.ops.export_scene.gltf(filepath=os.path.join(out,'v020.glb'),export_format='GLB',use_selection=True,export_materials='EXPORT',export_animations=False,export_yup=True)
json.dump(report,open(os.path.join(out,'v020-validation.json'),'w'),indent=2);print(report)
