import bpy,os,time,json
s=bpy.context.scene
out=os.path.dirname(bpy.data.filepath)
p=bpy.context.preferences.addons['cycles'].preferences
try:
 p.compute_device_type='CUDA'
 devices=p.get_devices_for_type('CUDA')
 for d in devices:d.use=d.type=='CUDA'
 s.cycles.device='GPU'
 print('DEVICE',[(d.name,d.type,d.use) for d in devices],flush=True)
except Exception as e:
 print('GPU fallback',e,flush=True);s.cycles.device='CPU'
s.render.resolution_percentage=55;s.cycles.samples=24;s.cycles.use_denoising=True
obj=bpy.data.objects['Rounded Triangular Prism']
for mod in obj.modifiers:
 if mod.type=='SUBSURF':mod.render_levels=1
mat=bpy.data.materials.new('Diagnostic polished surface');mat.use_nodes=True
pbr=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
pbr.inputs['Base Color'].default_value=(0.97,0.95,1,1)
pbr.inputs['Metallic'].default_value=1
pbr.inputs['Roughness'].default_value=0.04
obj.data.materials.clear();obj.data.materials.append(mat)
def render(name):
 s.render.filepath=os.path.join(out,name+'.png')
 t=time.monotonic();bpy.ops.render.render(write_still=True);print('DONE',name,time.monotonic()-t,flush=True)
render('diag-mirror')
pbr.inputs['Metallic'].default_value=0;pbr.inputs['Transmission Weight'].default_value=1;pbr.inputs['IOR'].default_value=1.46;pbr.inputs['Roughness'].default_value=0.01
render('diag-glass')
for v in obj.data.vertices:
 if abs(v.co.y)>0.4299:v.co.y=0.43 if v.co.y>0 else -0.43
obj.data.update()
render('diag-flat-faces')
