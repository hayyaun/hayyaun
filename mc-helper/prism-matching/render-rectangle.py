import bpy,os
s=bpy.context.scene;p=bpy.context.preferences.addons['cycles'].preferences;p.compute_device_type='CUDA'
for d in p.get_devices_for_type('CUDA'):d.use=d.type=='CUDA'
s.cycles.device='GPU';s.cycles.samples=64;s.render.resolution_percentage=85
bpy.ops.render.render(write_still=True)
print('RENDER_COMPLETE',flush=True)
