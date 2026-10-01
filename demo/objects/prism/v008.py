import bpy,bmesh,os,json
from mathutils import Vector
s=bpy.context.scene;ob=bpy.data.objects['Reference Prism']
out=r'\\wsl$\Ubuntu\home\garfield\projects\hayyaun\demo\objects\prism'
target=(4.2285923958,2.6428701878,3.67)
# Four actual planar faces. Fillets are confined to their shared boundaries.
verts=[(-2.32,-1.43,0),(2.32,-1.43,0),(2.23,1.43,0),(-2.23,1.43,0),(.13,.10,4.12)]
faces=[(3,2,1,0),(0,1,4),(1,2,4),(2,3,4),(3,0,4)]
mesh=bpy.data.meshes.new('v008');mesh.from_pydata(verts,[],faces);mesh.update()
ob.data=mesh;ob.modifiers.clear();ob.scale=(1,1,1)
for obj in s.objects:obj.select_set(False)
ob.select_set(True);bpy.context.view_layer.objects.active=ob
weights=mesh.attributes.new('bevel_weight_edge','FLOAT','EDGE')
for e in mesh.edges:
 base=all(mesh.vertices[v].co.z==0 for v in e.vertices)
 weights.data[e.index].value=1 if base else .60
bevel=ob.modifiers.new('v008','BEVEL');bevel.limit_method='WEIGHT';bevel.width=.65;bevel.segments=16;bevel.profile=.5;bevel.use_clamp_overlap=True
bpy.ops.object.modifier_apply(modifier=bevel.name)
mesh=ob.data
for axis in range(3):
 lo=min(v.co[axis] for v in mesh.vertices);hi=max(v.co[axis] for v in mesh.vertices)
 for v in mesh.vertices:v.co[axis]=(v.co[axis]-lo)/(hi-lo)*target[axis]-(target[axis]/2 if axis<2 else 0)
# Keep planar faces flat shaded. Only fillet patches interpolate normals.
for p in mesh.polygons:p.use_smooth=True
mesh.update()
normals=[tuple(v.normal) for v in mesh.vertices]
for p in mesh.polygons:
 if p.area>1:
  for index in p.vertices:normals[index]=tuple(p.normal)
mesh.normals_split_custom_set_from_vertices(normals)
mat=bpy.data.materials.new('v008');mat.use_nodes=True
nodes=mat.node_tree.nodes;nodes.clear();shader=nodes.new('ShaderNodeBsdfPrincipled');output=nodes.new('ShaderNodeOutputMaterial')
shader.inputs['Base Color'].default_value=(.985,.995,1,1)
shader.inputs['Metallic'].default_value=0;shader.inputs['Roughness'].default_value=.025
shader.inputs['IOR'].default_value=1.31;shader.inputs['Transmission Weight'].default_value=1
mat.node_tree.links.new(shader.outputs['BSDF'],output.inputs['Surface']);mesh.materials.append(mat)
ob.location=(0,0,.006);ob['description']='v008: four planar pyramid faces with continuous rounded boundary fillets; clear ice.'
bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh)
bpy.context.view_layer.update()
report={'dimensions':list(ob.dimensions),'vertices':len(mesh.vertices),'non_manifold_edges':sum(not e.is_manifold for e in bm.edges),'volume':bm.calc_volume()};bm.free()
s['design_version']='v008';bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out,'v008.blend'))
open(os.path.join(out,'v008-validation.json'),'w').write(json.dumps(report,indent=2));print(report)


