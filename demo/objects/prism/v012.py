import bpy,bmesh,os,json,math
from mathutils import Vector
out=r'\\wsl$\Ubuntu\home\garfield\projects\hayyaun\demo\objects\prism'
ob=bpy.data.objects['Reference Prism'];ice=ob.data.materials[0]
with bpy.data.libraries.load(os.path.join(out,'v011.blend'),link=False) as (a,b):b.objects=['Reference Prism']
source=b.objects[0];mesh=source.data.copy();mesh.name='v012';original=[v.co.copy() for v in mesh.vertices];bpy.data.objects.remove(source)
N=160;levels=160;start=92
ring=original[start*N:(start+1)*N];prev=original[(start-1)*N:start*N]
center=sum(ring,Vector())/N
wx=(max(v.x for v in ring)-min(v.x for v in ring))/2;wy=(max(v.y for v in ring)-min(v.y for v in ring))/2
apex=original[-1].copy();apex.z=3.54
for j,p0 in enumerate(ring):
 height=apex.z-p0.z
 tangent=(p0-prev[j])/(p0.z-prev[j].z)*(height*.30)
 angle=math.atan2((p0.y-center.y)/wy,(p0.x-center.x)/wx)
 radial=Vector((wx*math.cos(angle),wy*math.sin(angle),0))
 p1=p0+tangent;p2=p0+2*tangent
 p3=apex+radial*.46-Vector((0,0,.12*height));p4=apex+radial*.22
 controls=[p0,p1,p2,p3,p4,apex]
 for k in range(start+1,levels):
  t=(k-start)/(levels-start)
  mesh.vertices[k*N+j].co=sum((controls[i]*(math.comb(5,i)*(1-t)**(5-i)*t**i) for i in range(6)),Vector())
mesh.vertices[-1].co=apex
for p in mesh.polygons:p.use_smooth=True
mesh.update();bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh)
report={'locked_region_max_displacement':max((mesh.vertices[i].co-original[i]).length for i in range((start+1)*N)),'non_manifold_edges':sum(not e.is_manifold for e in bm.edges),'volume':bm.calc_volume()};bm.free()
mesh.materials.clear();mesh.materials.append(ice);ob.data=mesh;ob.modifiers.clear();bpy.context.view_layer.update()
report['dimensions']=list(ob.dimensions)
ob['description']='v012: continuous quintic crown loft, v011 geometry locked below crown.'
bpy.context.scene['design_version']='v012'
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out,'v012.blend'))
for o in bpy.context.scene.objects:o.select_set(False)
ob.select_set(True);bpy.context.view_layer.objects.active=ob
bpy.ops.export_scene.gltf(filepath=os.path.join(out,'v012.glb'),export_format='GLB',use_selection=True,export_materials='EXPORT',export_animations=False,export_yup=True)
json.dump(report,open(os.path.join(out,'v012-validation.json'),'w'),indent=2);print(report)
