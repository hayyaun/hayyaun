import bpy,bmesh,os,json,math
from mathutils import Vector
out=r'\\wsl$\Ubuntu\home\garfield\projects\hayyaun\demo\objects\prism'
ob=bpy.data.objects['Reference Prism']
if os.path.normcase(bpy.data.filepath)==os.path.normcase(os.path.join(out,'v016.blend')):mesh=ob.data.copy()
else:
 with bpy.data.libraries.load(os.path.join(out,'v016.blend'),link=False) as (a,b):b.objects=['Reference Prism']
 source=b.objects[0];mesh=source.data.copy();bpy.data.objects.remove(source)
mesh.name='v017';original=[v.co.copy() for v in mesh.vertices];N=160;levels=160
weights={}
def smooth(t):
 t=max(0,min(1,t));return t*t*t*(t*(t*6-15)+10)
for k in range(2,levels-2):
 h=1-(1-k/levels)**2
 if not .06<h<.48:continue
 ring=original[k*N:(k+1)*N]
 cx=(min(v.x for v in ring)+max(v.x for v in ring))/2;cy=(min(v.y for v in ring)+max(v.y for v in ring))/2
 wx=(max(v.x for v in ring)-min(v.x for v in ring))/2;wy=(max(v.y for v in ring)-min(v.y for v in ring))/2
 for j,v in enumerate(ring):
  nx=(v.x-cx)/wx;ny=(v.y-cy)/wy
  # Feather the edit across the curved left corners; do not touch face centers.
  w=smooth((-nx-.72)/.18)*smooth((h-.06)/.10)*smooth((.48-h)/.18)
  if w>0:weights[k*N+j]=w
for iteration in range(18):
 old=[v.co.copy() for v in mesh.vertices]
 for i,w in weights.items():
  mean=(old[i-2*N]+old[i-N]*4+old[i]*6+old[i+N]*4+old[i+2*N])/16
  mesh.vertices[i].co=old[i].lerp(mean,.6*w)
for p in mesh.polygons:p.use_smooth=True
mesh.update();bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh)
report={'locked_region_max_displacement':max((v.co-original[i]).length for i,v in enumerate(mesh.vertices) if i not in weights),'left_max_displacement':max((v.co-original[i]).length for i,v in enumerate(mesh.vertices)),'non_manifold_edges':sum(not e.is_manifold for e in bm.edges)};bm.free()
ob.data=mesh;ob['description']='v017: localized lower front-left fillet smoothing; other geometry locked to v016.'
bpy.context.scene['design_version']='v017';bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out,'v017.blend'))
for o in bpy.context.scene.objects:o.select_set(False)
ob.select_set(True);bpy.context.view_layer.objects.active=ob
bpy.ops.export_scene.gltf(filepath=os.path.join(out,'v017.glb'),export_format='GLB',use_selection=True,export_materials='EXPORT',export_animations=False,export_yup=True)
json.dump(report,open(os.path.join(out,'v017-validation.json'),'w'),indent=2);print(report)

