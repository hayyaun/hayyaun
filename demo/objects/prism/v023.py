import bpy,bmesh,os,json
from mathutils import Vector
out=r'\\wsl$\Ubuntu\home\garfield\projects\hayyaun\demo\objects\prism'
outer=bpy.data.objects['Reference Prism'];mesh=outer.data.copy();mesh.name='v023-inner'
# Inset the approved outer surface, then terminate it at the top of the rounded base.
center=Vector((.04,0,1.8))
for v in mesh.vertices:
 v.co.x=center.x+(v.co.x-center.x)*.88
 v.co.y*=.84
 v.co.z=center.z+(v.co.z-center.z)*.92
bm=bmesh.new();bm.from_mesh(mesh)
result=bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),dist=.00001,plane_co=(0,0,.94),plane_no=(0,0,1),clear_inner=True,clear_outer=False)
boundary=[e for e in bm.edges if e.is_boundary]
bmesh.ops.holes_fill(bm,edges=boundary,sides=0)
bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
report={'non_manifold_edges':sum(not e.is_manifold for e in bm.edges),'inner_floor_z':.94,'outer_modified':False}
bm.to_mesh(mesh);bm.free()
for p in mesh.polygons:p.use_smooth=abs(p.normal.z)<.999
inner=bpy.data.objects.new('v023-inner',mesh);bpy.context.collection.objects.link(inner);inner.matrix_world=outer.matrix_world.copy()
bpy.context.scene['design_version']='v023';bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out,'v023.blend'))
for o in bpy.context.scene.objects:o.select_set(False)
for o in [outer,inner,bpy.data.objects['v022-inclusion']]:o.select_set(True)
bpy.context.view_layer.objects.active=outer
bpy.ops.export_scene.gltf(filepath=os.path.join(out,'v023.glb'),export_format='GLB',use_selection=True,export_materials='EXPORT',export_animations=False,export_yup=True)
json.dump(report,open(os.path.join(out,'v023-validation.json'),'w'),indent=2);print(report)
