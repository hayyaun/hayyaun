import bpy,bmesh,os,json,time
from mathutils import Vector
s=bpy.context.scene;out=os.path.dirname(bpy.data.filepath)
p=bpy.context.preferences.addons['cycles'].preferences;p.compute_device_type='CUDA'
for d in p.get_devices_for_type('CUDA'):d.use=d.type=='CUDA'
s.cycles.device='GPU';s.cycles.samples=96;s.render.resolution_percentage=100
obj=bpy.data.objects['Rounded rectangular pyramid']
s.camera.data.lens=69;s.camera.data.shift_y=.033
bpy.data.objects['Right rim strip'].data.size=.35
stage=bpy.data.objects['Seamless lavender stage'];noise=next(n for n in stage.data.materials[0].node_tree.nodes if n.type=='TEX_NOISE');noise.inputs['Scale'].default_value=.85;noise.inputs['Detail'].default_value=.9
bpy.context.view_layer.update()
report={'dimensions_xyz':list(obj.dimensions),'width_depth_ratio':obj.dimensions.x/obj.dimensions.y,'description':obj['description']}
for label,mesh in [('base',obj.data),('evaluated',obj.evaluated_get(bpy.context.evaluated_depsgraph_get()).to_mesh())]:
 bm=bmesh.new();bm.from_mesh(mesh);report[label]={'vertices':len(bm.verts),'faces':len(bm.faces),'non_manifold_edges':sum(not e.is_manifold for e in bm.edges),'boundary_edges':sum(e.is_boundary for e in bm.edges),'signed_volume':bm.calc_volume(signed=True)};bm.free()
 if label=='evaluated':obj.evaluated_get(bpy.context.evaluated_depsgraph_get()).to_mesh_clear()
open(os.path.join(out,'validation.json'),'w').write(json.dumps(report,indent=2));print('VALIDATION',report,flush=True)
for o in s.objects:o.select_set(False)
obj.select_set(True);bpy.context.view_layer.objects.active=obj
for screen in bpy.data.screens:
 for area in screen.areas:
  if area.type=='VIEW_3D':area.spaces.active.region_3d.view_perspective='CAMERA'
s.render.filepath=os.path.join(out,'prism-best-match.png')
s.cycles.device='CPU';bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out,'prism-best-match.blend'));s.cycles.device='GPU'
t=time.monotonic();bpy.ops.render.render(write_still=True);print('BEAUTY_DONE',time.monotonic()-t,flush=True)
# An additional neutral surface view makes the base depth and taper inspectable.
original_mat=obj.data.materials[0];clay=bpy.data.materials.new('Shape inspection');clay.use_nodes=True
bs=next(n for n in clay.node_tree.nodes if n.type=='BSDF_PRINCIPLED');bs.inputs['Base Color'].default_value=(.34,.26,.48,1);bs.inputs['Roughness'].default_value=.3;bs.inputs['Metallic'].default_value=.15
obj.data.materials[0]=clay;s.camera.location=(5,-8,4.8);s.camera.rotation_euler=(Vector((0,0,1.6))-s.camera.location).to_track_quat('-Z','Y').to_euler();s.camera.data.lens=58;s.camera.data.shift_y=0
s.render.resolution_percentage=70;s.cycles.samples=32;s.render.filepath=os.path.join(out,'pyramid-shape-check.png');bpy.ops.render.render(write_still=True);print('SHAPE_DONE',flush=True)
