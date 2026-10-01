import bpy,os,time
s=bpy.context.scene;out=os.path.dirname(bpy.data.filepath)
p=bpy.context.preferences.addons['cycles'].preferences;p.compute_device_type='CUDA'
for d in p.get_devices_for_type('CUDA'):d.use=d.type=='CUDA'
s.cycles.device='GPU';s.cycles.samples=32;s.render.resolution_percentage=60
obj=bpy.data.objects['Rounded rectangular pyramid'];mat=obj.data.materials[0];ns=mat.node_tree.nodes;ls=mat.node_tree.links
pbr=next(n for n in ns if n.type=='BSDF_PRINCIPLED' and n.inputs['Transmission Weight'].default_value>.5);output=next(n for n in ns if n.type=='OUTPUT_MATERIAL')
pbr.inputs['Roughness'].default_value=.008
absorb=ns.new('ShaderNodeVolumeAbsorption');absorb.inputs['Color'].default_value=(.65,.48,.8,1);absorb.inputs['Density'].default_value=.15;ls.new(absorb.outputs['Volume'],output.inputs['Volume'])
stage=bpy.data.objects['Seamless lavender stage'];stage.visible_glossy=True
ns=stage.data.materials[0].node_tree.nodes;ls=stage.data.materials[0].node_tree.links
coord=next(n for n in ns if n.type=='TEX_COORD');noise=ns.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=1.35;noise.inputs['Detail'].default_value=1.8
ramp=ns.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].position=.28;ramp.color_ramp.elements[0].color=(.16,.08,.34,1);ramp.color_ramp.elements[1].position=.66;ramp.color_ramp.elements[1].color=(.95,.9,1,1)
bs=next(n for n in ns if n.type=='BSDF_PRINCIPLED');ls.new(coord.outputs['Object'],noise.inputs['Vector']);ls.new(noise.outputs['Factor'],ramp.inputs[0]);ls.new(ramp.outputs[0],bs.inputs['Base Color']);ls.new(ramp.outputs[0],bs.inputs['Emission Color']);bs.inputs['Roughness'].default_value=.2
for ob in bpy.data.collections['Prism Studio'].objects:
 if ob.type=='LIGHT':ob.data.energy*=.6
for ior,label in [(1.65,'pyramid-crystal'),(1.95,'pyramid-dense-glass')]:
 pbr.inputs['IOR'].default_value=ior
 s.render.filepath=os.path.join(out,label+'.png');bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out,label+'.blend'),copy=True)
 t=time.monotonic();bpy.ops.render.render(write_still=True);print('DONE',label,time.monotonic()-t,flush=True)
