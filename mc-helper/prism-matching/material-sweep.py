import bpy,os,time
s=bpy.context.scene;out=os.path.dirname(bpy.data.filepath)
p=bpy.context.preferences.addons['cycles'].preferences;p.compute_device_type='CUDA'
for d in p.get_devices_for_type('CUDA'):d.use=d.type=='CUDA'
s.cycles.device='GPU';s.cycles.samples=24;s.render.resolution_percentage=55
obj=bpy.data.objects['Rounded Triangular Prism'];mat=obj.data.materials[0];ns=mat.node_tree.nodes;ls=mat.node_tree.links
pbr=next(n for n in ns if n.type=='BSDF_PRINCIPLED');output=next(n for n in ns if n.type=='OUTPUT_MATERIAL')
pbr.inputs['IOR'].default_value=1.7
absorb=ns.new('ShaderNodeVolumeAbsorption');absorb.inputs['Color'].default_value=(0.55,0.42,0.68,1);absorb.inputs['Density'].default_value=0.65;ls.new(absorb.outputs['Volume'],output.inputs['Volume'])
def render(name):
 s.render.filepath=os.path.join(out,name+'.png');bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out,name+'.blend'),copy=True)
 t=time.monotonic();bpy.ops.render.render(write_still=True);print('DONE',name,time.monotonic()-t,flush=True)
render('material-absorption')
# A consistent geometric mask avoids the old normal-dependent shader feedback.
for link in list(output.inputs['Volume'].links):ls.remove(link)
pbr.inputs['IOR'].default_value=1.46
attr=obj.data.attributes.new(name='perimeter_finish',type='FLOAT',domain='POINT')
for i in range(41*240):attr.data[i].value=1
for start in [41*240,41*240+18*240+1]:
 for k in range(18):
  value=max(0,1-(k+1)/3)
  for j in range(240):attr.data[start+k*240+j].value=value
metal=ns.new('ShaderNodeBsdfPrincipled');metal.label='Polished reflective perimeter';metal.inputs['Base Color'].default_value=(0.82,0.78,0.94,1);metal.inputs['Metallic'].default_value=1;metal.inputs['Roughness'].default_value=0.035
mask=ns.new('ShaderNodeAttribute');mask.attribute_name='perimeter_finish'
mix=ns.new('ShaderNodeMixShader');ls.new(mask.outputs['Fac'],mix.inputs[0]);ls.new(pbr.outputs['BSDF'],mix.inputs[1]);ls.new(metal.outputs['BSDF'],mix.inputs[2]);ls.new(mix.outputs[0],output.inputs['Surface'])
bpy.data.objects['Seamless lavender stage'].visible_glossy=False
render('material-polished-rim')
# A less reflective mix for comparison, without changing geometry or lighting.
strength=ns.new('ShaderNodeMath');strength.operation='MULTIPLY';strength.inputs[1].default_value=0.65;ls.new(mask.outputs['Fac'],strength.inputs[0]);ls.new(strength.outputs[0],mix.inputs[0])
render('material-blended-rim')
