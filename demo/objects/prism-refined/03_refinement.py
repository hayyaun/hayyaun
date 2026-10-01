
import bpy, os, subprocess, math
from mathutils import Vector
scene=bpy.context.scene
out=r'\\wsl$\Ubuntu\home\garfield\projects\hayyaun\mc-helper\prism-refined'
obj=bpy.data.objects['Rounded Triangular Prism']
obj.scale.x=1.14;obj.scale.y=1.43
cam=scene.camera
cam.location=(2.38,-9.05,3.42)
target=Vector((0.02,0,1.63))
cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
cam.data.lens=68
collection=bpy.data.collections['Prism Studio']
mesh=bpy.data.meshes.new('Front reflection screen mesh')
mesh.from_pydata([(-8,-5,-2),(8,-5,-2),(8,-5,10),(-8,-5,10)],[],[(0,1,2,3)]);mesh.update()
panel=bpy.data.objects.new('Broad dark front reflection',mesh);collection.objects.link(panel)
mesh.materials.append(bpy.data.materials['Studio negative fill'])
panel.visible_camera=False;panel.visible_shadow=False
for name in ['Left dark reflection','Right dark reflection']:
    ob=bpy.data.objects[name];ob.scale.x=2.2;ob.visible_shadow=False
world_bsdf=next(n for n in scene.world.node_tree.nodes if n.type=='BACKGROUND')
world_bsdf.inputs['Strength'].default_value=0.18
stage_bsdf=next(n for n in bpy.data.materials['Lavender porcelain stage'].node_tree.nodes if n.type=='BSDF_PRINCIPLED')
stage_bsdf.inputs['Base Color'].default_value=(0.85,0.81,0.94,1)
stage_bsdf.inputs['Roughness'].default_value=0.31
scene.render.filepath=os.path.join(out,'preview-02.png')
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out,'prism-studio.blend'))
cmd=[bpy.app.binary_path,'-b',bpy.data.filepath,'-t','8','--python-expr','import bpy; bpy.ops.render.render(write_still=True)']
p=subprocess.Popen(cmd,stdout=open(os.path.join(out,'render-02.log'),'w'),stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW)
print('Adjusted proportions, camera and contrast. Render PID',p.pid)
