import bpy,os,subprocess
from mathutils import Vector
scene=bpy.context.scene
mat=bpy.data.materials['Prism Glass']
edge=next(n for n in mat.node_tree.nodes if n.type=='MAP_RANGE');edge.inputs['To Min'].default_value=0.78;edge.inputs['From Min'].default_value=0.93
white=bpy.data.materials.new('White studio reflection cards');white.use_nodes=True
p=next(n for n in white.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
p.inputs['Base Color'].default_value=(0.92,0.92,1,1);p.inputs['Roughness'].default_value=1;p.inputs['Emission Color'].default_value=(0.92,0.92,1,1);p.inputs['Emission Strength'].default_value=1.4
collection=bpy.data.collections['Prism Studio']
def flag(name,location,width,height,target):
 mesh=bpy.data.meshes.new(name+' Mesh');mesh.from_pydata([(-width/2,-height/2,0),(width/2,-height/2,0),(width/2,height/2,0),(-width/2,height/2,0)],[],[(0,1,2,3)]);mesh.update();mesh.materials.append(white)
 ob=bpy.data.objects.new(name,mesh);collection.objects.link(ob);ob.location=location;ob.rotation_euler=(Vector(target)-ob.location).to_track_quat('Z','Y').to_euler();ob.visible_camera=False;ob.visible_shadow=False
 ob.display_type=next(i.identifier for i in ob.bl_rna.properties['display_type'].enum_items if i.identifier=='WIRE')
 return ob
flag('Broad left highlight',(-2.0,-2.8,3.0),1.8,4.5,(0,0,1.5))
flag('Upper silver highlight',(1.2,-2.3,4.4),2.0,1.8,(0,0,2.5))
flag('Base silver reflection',(0,-0.7,-0.06),1.8,2.0,(0,-0.7,1))
obj=bpy.data.objects['Rounded Triangular Prism'];obj['material_note']='Clear central glass with art-directed reflective shoulders; stage hidden from glossy rays for controlled studio reflections.'
scene.render.resolution_percentage=100
scene.cycles.samples=96
scene.cycles.use_denoising=True
scene.render.filepath=r'\\wsl$\Ubuntu\home\garfield\projects\hayyaun\mc-helper\prism-refined\prism-final.png'
out=os.path.dirname(scene.render.filepath)
for screen in bpy.data.screens:
 for area in screen.areas:
  if area.type=='VIEW_3D':
   space=area.spaces.active;space.overlay.show_overlays=False
   space.region_3d.view_camera_zoom=0
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out,'prism-studio.blend'))
cmd=[bpy.app.binary_path,'-b',bpy.data.filepath,'-t','8','--python-expr','import bpy; bpy.ops.render.render(write_still=True)']
p=subprocess.Popen(cmd,stdout=open(os.path.join(out,'render-final.log'),'w'),stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW)
print('Saved final scene. Full-size 981 x 793 render PID',p.pid)
print('Render command:',subprocess.list2cmdline(cmd))
