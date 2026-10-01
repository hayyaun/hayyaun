import bpy,os
from mathutils import Vector
s=bpy.context.scene;out=os.path.dirname(bpy.data.filepath);s.render.engine='BLENDER_WORKBENCH'
s.display.shading.light='STUDIO';s.display.shading.color_type='SINGLE';s.display.shading.single_color=(.53,.53,.56);s.display.shading.background_type='WORLD';s.world.color=(.8,.8,.8)
for o in s.objects:
 if o.type=='MESH' and o.name!='Reference Prism':o.hide_render=True
s.render.resolution_x=720;s.render.resolution_y=640;s.render.resolution_percentage=100
s.camera.data.type='ORTHO';s.camera.data.ortho_scale=5.6;s.camera.data.shift_x=0;s.camera.data.shift_y=0
for label,pos in [('front',(0,-12,1.84)),('right',(12,0,1.84)),('left',(-12,0,1.84)),('back',(0,12,1.84)),('bottom',(0,0,-12)),('top',(0,0,14)),('angle',(5,-12,5))]:
 s.camera.location=pos;s.camera.rotation_euler=(Vector((0,0,1.84))-s.camera.location).to_track_quat('-Z','Y').to_euler();s.render.filepath=os.path.join(out,'v010-'+label+'.png');bpy.ops.render.render(write_still=True);print(label,flush=True)




