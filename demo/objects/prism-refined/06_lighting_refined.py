import bpy,os,subprocess
from mathutils import Vector
scene=bpy.context.scene
mat=bpy.data.materials['Studio negative fill']
bsdf=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
bsdf.inputs['Base Color'].default_value=(0.0003,0.0003,0.0005,1)
bsdf.inputs['Roughness'].default_value=1
bsdf.inputs['Specular IOR Level'].default_value=0
# Low photographic flag gives the heavy curved foot a dark reflected shape.
mesh=bpy.data.meshes.new('Low front flag Mesh')
mesh.from_pydata([(-2.2,-1.25,-0.05),(1.45,-1.25,-0.05),(1.45,-1.25,0.9),(-2.2,-1.25,0.9)],[],[(0,1,2,3)])
mesh.materials.append(mat);mesh.update()
obj=bpy.data.objects.new('Low front reflection flag',mesh);bpy.data.collections['Prism Studio'].objects.link(obj)
obj.visible_camera=False;obj.visible_shadow=False
obj.display_type=next(i.identifier for i in obj.bl_rna.properties['display_type'].enum_items if i.identifier=='WIRE')
edge=next(n for n in bpy.data.materials['Prism Glass'].node_tree.nodes if n.type=='MAP_RANGE')
edge.inputs['To Min'].default_value=0.78
bpy.data.objects['Key tall softbox'].data.energy=450
bpy.data.objects['Right rim strip'].data.energy=1100
out=r'\\wsl$\Ubuntu\home\garfield\projects\hayyaun\mc-helper\prism-refined'
scene.render.filepath=os.path.join(out,'preview-10.png')
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out,'prism-studio.blend'))
cmd=[bpy.app.binary_path,'-b',bpy.data.filepath,'-t','8','--python-expr','import bpy; bpy.ops.render.render(write_still=True)']
p=subprocess.Popen(cmd,stdout=open(os.path.join(out,'render-10.log'),'w'),stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW)
print('Adjusted contrast on thick base. Render PID',p.pid)
