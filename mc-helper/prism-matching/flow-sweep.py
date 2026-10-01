import bpy,os,math,time
from mathutils import Vector
s=bpy.context.scene;out=os.path.dirname(bpy.data.filepath)
p=bpy.context.preferences.addons['cycles'].preferences;p.compute_device_type='CUDA'
for d in p.get_devices_for_type('CUDA'):d.use=d.type=='CUDA'
s.cycles.device='GPU';s.cycles.samples=32;s.render.resolution_percentage=60
s.camera.location.z+=.045
s.camera.rotation_euler=(Vector((.02,0,1.675))-s.camera.location).to_track_quat('-Z','Y').to_euler();s.camera.data.lens=67.6
ns=s.world.node_tree.nodes
noise=next(n for n in ns if n.type=='TEX_NOISE');noise.inputs['Scale'].default_value=2.2;noise.inputs['Detail'].default_value=1.0
ramp=next(n for n in ns if n.type=='VALTORGB')
ramp.color_ramp.elements[0].position=.36;ramp.color_ramp.elements[0].color=(.025,.02,.035,1)
ramp.color_ramp.elements[1].position=.61;ramp.color_ramp.elements[1].color=(1.1,.96,1.2,1)
obj=bpy.data.objects['Rounded Triangular Prism'];original=[v.co.copy() for v in obj.data.vertices]
metal=next(n for n in obj.data.materials[0].node_tree.nodes if n.type=='BSDF_PRINCIPLED' and n.inputs['Metallic'].default_value>.5)
metal.inputs['Roughness'].default_value=.025;metal.inputs['Base Color'].default_value=(.92,.87,.95,1)
for amount,label in [(.16,'flow-soft'),(.30,'flow-strong')]:
 for i,v in enumerate(obj.data.vertices):
  v.co=original[i];x,y,z=v.co
  if i<9840:
   t=-math.pi/2+math.pi*(i//240)/40
   v.co.y+=amount*math.sin(2.7*x+2.0*z)*math.sin(t)*math.cos(t)**2
 s.render.filepath=os.path.join(out,label+'.png');bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out,label+'.blend'),copy=True)
 t=time.monotonic();bpy.ops.render.render(write_still=True);print('DONE',label,time.monotonic()-t,flush=True)
