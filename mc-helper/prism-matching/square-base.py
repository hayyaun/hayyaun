import bpy,os,math,bmesh,json
from mathutils import Vector
s=bpy.context.scene
out=r'\\wsl$\Ubuntu\home\garfield\projects\hayyaun\mc-helper\prism-matching'
previous_width=bpy.data.objects['Reference Prism'].dimensions.x
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out,'before-square-base.blend'),copy=True)
obj=bpy.data.objects['Reference Prism'];obj.name='Rounded Triangular Prism'
base=open(os.path.join(os.path.dirname(out),'prism-refined','04_geometry_refined.py'),encoding='utf-8-sig').read().replace('dome=0.024*','dome=0.0*').replace('half_depth+0.024','half_depth+0.0').replace('0.40,0.43,0.255','0.55,0.58,0.28')
base=base.replace('path.append(b.lerp(end,j/48));normals.append(n)','path.append(b.lerp(end,j/48)+n*(0.035*math.sin(math.pi*j/48)**2));normals.append(n)')
base=base.replace('0.25 if t<0 else 0.30','0.28 if t<0 else 0.34').replace('0.75 if side<0 else 0.70','0.72 if side<0 else 0.66')
exec(compile(base,'curved-pillow-pyramid','exec'))
obj=bpy.data.objects['Rounded Triangular Prism'];obj.name='Reference Prism'
for v in obj.data.vertices:v.co.y*=max(.015,1-v.co.z/3.82)**.9
obj.scale.x=previous_width/(max(v.co.x for v in obj.data.vertices)-min(v.co.x for v in obj.data.vertices))
width=(max(v.co.x for v in obj.data.vertices)-min(v.co.x for v in obj.data.vertices))*obj.scale.x
depth=(max(v.co.y for v in obj.data.vertices)-min(v.co.y for v in obj.data.vertices))*obj.scale.y
for v in obj.data.vertices:v.co.y*=width/(1.2*depth)
obj.location.z=-min(v.co.z for v in obj.data.vertices)+.006
mod=obj.modifiers.new('Continuous curved surfaces','SUBSURF');mod.levels=1;mod.render_levels=1
attr=obj.data.attributes.new(name='perimeter_finish',type='FLOAT',domain='POINT')
for i in range(9840):attr.data[i].value=1
for start in [9840,14161]:
 for k in range(18):
  for j in range(240):attr.data[start+k*240+j].value=max(0,1-(k+1)/3)
obj['description']='Pillow-like rounded rectangular base, 1.2:1 width/depth, bowed rolling edges and depth taper to generously rounded crown. Front face larger than rear.'
mat=obj.data.materials[0];pbr=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED' and n.inputs['Transmission Weight'].default_value>.5);pbr.inputs['IOR'].default_value=1.52

bpy.context.view_layer.update()
obj.select_set(True);bpy.context.view_layer.objects.active=obj
for screen in bpy.data.screens:
 for area in screen.areas:
  if area.type=='VIEW_3D':
   view=area.spaces.active.region_3d
   view.view_rotation=(Vector((5,-8,5))-Vector((0,0,1.6))).to_track_quat('Z','Y')
   view.view_location=(0,0,1.6);view.view_distance=9;view.view_perspective='PERSP'
s.cycles.device='CPU'
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out,'prism-square-base.blend'))
bm=bmesh.new();bm.from_mesh(obj.data)
print(json.dumps({'dimensions':list(obj.dimensions),'width_depth_ratio':obj.dimensions.x/obj.dimensions.y,'non_manifold_edges':sum(not e.is_manifold for e in bm.edges),'signed_volume':bm.calc_volume(signed=True)}));bm.free()
