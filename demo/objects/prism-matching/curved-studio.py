import bpy,os,time
s=bpy.context.scene;out=os.path.dirname(bpy.data.filepath)
p=bpy.context.preferences.addons['cycles'].preferences;p.compute_device_type='CUDA'
for d in p.get_devices_for_type('CUDA'):d.use=d.type=='CUDA'
s.cycles.device='GPU';s.cycles.samples=32;s.render.resolution_percentage=60
obj=bpy.data.objects['Curved pillow-base prism'];obj.scale.x*=1.06;obj.scale.y*=1.06
ns=s.world.node_tree.nodes;noise=next(n for n in ns if n.type=='TEX_NOISE');ramp=next(n for n in ns if n.type=='VALTORGB')
for scale,detail,lo,hi,label in [(3.2,.5,.42,.60,'curved-studio-a'),(2.2,1,.48,.64,'curved-studio-b')]:
 noise.inputs['Scale'].default_value=scale;noise.inputs['Detail'].default_value=detail;ramp.color_ramp.elements[0].position=lo;ramp.color_ramp.elements[1].position=hi
 s.render.filepath=os.path.join(out,label+'.png');bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out,label+'.blend'),copy=True)
 t=time.monotonic();bpy.ops.render.render(write_still=True);print('DONE',label,time.monotonic()-t,flush=True)
