import bpy,os
from mathutils import Vector
s=bpy.context.scene;out=os.path.dirname(bpy.data.filepath)
p=bpy.context.preferences.addons['cycles'].preferences;p.compute_device_type='CUDA'
for d in p.get_devices_for_type('CUDA'):d.use=d.type=='CUDA'
s.cycles.device='GPU';s.cycles.samples=24;s.render.resolution_percentage=55
ob=bpy.data.objects['Reference Prism'];mat=bpy.data.materials.new('v002 inspection');mat.use_nodes=True
bs=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED');bs.inputs['Base Color'].default_value=(.3,.24,.4,1);bs.inputs['Roughness'].default_value=.42
ob.data.materials[0]=mat
for label,position in [('front',(0,-11,2.8)),('side',(11,0,2.8)),('three-quarter',(6,-10,5))]:
 s.camera.location=position;s.camera.rotation_euler=(Vector((0,0,1.8))-s.camera.location).to_track_quat('-Z','Y').to_euler();s.camera.data.lens=60;s.camera.data.shift_x=0;s.camera.data.shift_y=0
 s.render.filepath=os.path.join(out,'v002-'+label+'.png');bpy.ops.render.render(write_still=True);print(label,flush=True)
