import bpy,os,time
s=bpy.context.scene;out=os.path.dirname(bpy.data.filepath)
p=bpy.context.preferences.addons['cycles'].preferences;p.compute_device_type='CUDA'
for d in p.get_devices_for_type('CUDA'):d.use=d.type=='CUDA'
s.cycles.device='GPU';s.cycles.samples=32;s.render.resolution_percentage=60
obj=bpy.data.objects['Rounded rectangular pyramid'];ns=obj.data.materials[0].node_tree.nodes;ls=obj.data.materials[0].node_tree.links
mix=next(n for n in ns if n.type=='MIX_SHADER');output=next(n for n in ns if n.type=='OUTPUT_MATERIAL');attr=next(n for n in ns if n.type=='ATTRIBUTE')
geo=ns.new('ShaderNodeNewGeometry')
exterior=ns.new('ShaderNodeMixRGB');exterior.inputs[1].default_value=(1,1,1,1);exterior.inputs[2].default_value=(0,0,0,1);ls.new(geo.outputs['Backfacing'],exterior.inputs[0])
mul=ns.new('ShaderNodeMath');mul.operation='MULTIPLY';ls.new(attr.outputs['Fac'],mul.inputs[0]);ls.new(exterior.outputs[0],mul.inputs[1])
strength=ns.new('ShaderNodeMath');strength.operation='MULTIPLY';ls.new(mul.outputs[0],strength.inputs[0]);ls.new(strength.outputs[0],mix.inputs[0]);ls.new(mix.outputs[0],output.inputs['Surface'])
stage=bpy.data.objects['Seamless lavender stage'];stage.visible_glossy=False
noise=next(n for n in stage.data.materials[0].node_tree.nodes if n.type=='TEX_NOISE');noise.inputs['Scale'].default_value=.55;noise.inputs['Detail'].default_value=.7
for amount,label in [(.65,'pyramid-finish-soft'),(.92,'pyramid-finish-defined')]:
 strength.inputs[1].default_value=amount
 s.render.filepath=os.path.join(out,label+'.png');bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out,label+'.blend'),copy=True)
 t=time.monotonic();bpy.ops.render.render(write_still=True);print('DONE',label,time.monotonic()-t,flush=True)
