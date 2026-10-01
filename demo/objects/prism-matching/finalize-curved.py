import bpy,bmesh,os,json,time
from mathutils import Vector
s=bpy.context.scene;out=os.path.dirname(bpy.data.filepath)
p=bpy.context.preferences.addons['cycles'].preferences;p.compute_device_type='CUDA'
for d in p.get_devices_for_type('CUDA'):d.use=d.type=='CUDA'
obj=bpy.data.objects['Curved pillow-base prism'];obj.name='Reference Prism'
obj['description']='Solid tapered prism with a rounded 2:1 rectangular base, larger front face, smaller rear face, flowing edge curvature and tightened corners.'
bpy.context.view_layer.update();report={'dimensions_xyz':list(obj.dimensions),'width_depth_ratio':obj.dimensions.x/obj.dimensions.y}
evalobj=obj.evaluated_get(bpy.context.evaluated_depsgraph_get());evalmesh=evalobj.to_mesh()
for label,mesh in [('base',obj.data),('evaluated',evalmesh)]:
 bm=bmesh.new();bm.from_mesh(mesh);report[label]={'vertices':len(bm.verts),'faces':len(bm.faces),'non_manifold_edges':sum(not e.is_manifold for e in bm.edges),'boundary_edges':sum(e.is_boundary for e in bm.edges),'signed_volume':bm.calc_volume(signed=True)};bm.free()
evalobj.to_mesh_clear()
open(os.path.join(out,'validation.json'),'w').write(json.dumps(report,indent=2));print('VALIDATION',report,flush=True)
for o in s.objects:o.select_set(False)
obj.select_set(True);bpy.context.view_layer.objects.active=obj
for screen in bpy.data.screens:
 for area in screen.areas:
  if area.type=='VIEW_3D':area.spaces.active.region_3d.view_perspective='CAMERA'
s.render.resolution_percentage=100;s.cycles.samples=96;s.render.filepath=os.path.join(out,'prism-best-match.png');s.cycles.device='CPU'
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out,'prism-best-match.blend'));s.cycles.device='GPU'
t=time.monotonic();bpy.ops.render.render(write_still=True);print('BEAUTY_DONE',time.monotonic()-t,flush=True)
clay=bpy.data.materials.new('Neutral geometry check');clay.use_nodes=True
bs=next(n for n in clay.node_tree.nodes if n.type=='BSDF_PRINCIPLED');bs.inputs['Base Color'].default_value=(.28,.22,.4,1);bs.inputs['Roughness'].default_value=.32;bs.inputs['Metallic'].default_value=.12
obj.data.materials[0]=clay;s.camera.location=(5.3,-8,4.7);s.camera.rotation_euler=(Vector((0,0,1.6))-s.camera.location).to_track_quat('-Z','Y').to_euler();s.camera.data.lens=58;s.camera.data.shift_y=0
s.render.resolution_percentage=70;s.cycles.samples=32;s.render.filepath=os.path.join(out,'prism-shape-check.png');bpy.ops.render.render(write_still=True);print('SHAPE_DONE',flush=True)
