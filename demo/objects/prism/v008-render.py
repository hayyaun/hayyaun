import bpy,os
s=bpy.context.scene
s.render.resolution_x=800;s.render.resolution_y=800;s.render.resolution_percentage=100
s.cycles.samples=32;s.cycles.use_denoising=True
s.render.filepath=os.path.join(os.path.dirname(bpy.data.filepath),'v008-render.png')
bpy.ops.render.render(write_still=True)
