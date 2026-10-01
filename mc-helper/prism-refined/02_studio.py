import bpy, math, os
from mathutils import Vector
scene=bpy.context.scene
out=r'\\wsl$\Ubuntu\home\garfield\projects\hayyaun\mc-helper\prism-refined'
studio=bpy.data.collections.new('Prism Studio')
scene.collection.children.link(studio)
def mesh_object(name,verts,faces,material=None):
    mesh=bpy.data.meshes.new(name+' Mesh');mesh.from_pydata(verts,[],faces);mesh.update()
    obj=bpy.data.objects.new(name,mesh);studio.objects.link(obj)
    if material:mesh.materials.append(material)
    return obj
def material(name,color,roughness):
    mat=bpy.data.materials.new(name);mat.use_nodes=True
    bsdf=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    bsdf.inputs['Base Color'].default_value=(*color,1)
    bsdf.inputs['Roughness'].default_value=roughness
    return mat,bsdf
floor,bsdf=material('Lavender porcelain stage',(0.73,0.70,0.84),0.23)
profile=[(-18,-0.008),(3,-0.008)]
for i in range(1,41):
    angle=(math.pi/2)*i/40
    profile.append((3+3*math.sin(angle),3-3*math.cos(angle)-0.008))
profile.append((6,15))
verts=[(x,y,z) for y,z in profile for x in (-20,20)]
faces=[(2*i,2*i+1,2*i+3,2*i+2) for i in range(len(profile)-1)]
cyc=mesh_object('Seamless lavender stage',verts,faces,floor)
for p in cyc.data.polygons:p.use_smooth=True
# A soft patterned backdrop visible through the solid glass.
backdrop,back_bsdf=material('Soft lavender background',(0.80,0.77,0.92),0.75)
nodes=backdrop.node_tree.nodes;links=backdrop.node_tree.links
tex=nodes.new('ShaderNodeTexCoord')
noise=nodes.new('ShaderNodeTexNoise');noise.noise_dimensions='3D';noise.noise_type='FBM';noise.normalize=True
noise.inputs['Scale'].default_value=0.65;noise.inputs['Detail'].default_value=1.3;noise.inputs['Roughness'].default_value=0.4
ramp=nodes.new('ShaderNodeValToRGB')
ramp.color_ramp.elements[0].position=0.25;ramp.color_ramp.elements[0].color=(0.27,0.18,0.50,1)
ramp.color_ramp.elements[1].position=0.70;ramp.color_ramp.elements[1].color=(0.91,0.89,0.98,1)
links.new(tex.outputs['Object'],noise.inputs['Vector'])
links.new(noise.outputs['Factor'],ramp.inputs['Factor'])
links.new(ramp.outputs['Color'],back_bsdf.inputs['Base Color'])
links.new(ramp.outputs['Color'],back_bsdf.inputs['Emission Color'])
back_bsdf.inputs['Emission Strength'].default_value=0.25
cyc.data.materials.append(backdrop)
for p in cyc.data.polygons:
    if p.index>12:p.material_index=1
def aim(obj,point):
    obj.rotation_euler=(Vector(point)-obj.location).to_track_quat('-Z','Y').to_euler()
def light(name,location,target,power,color,width,height):
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.color=color;data.shape='RECTANGLE';data.size=width;data.size_y=height
    ob=bpy.data.objects.new(name,data);studio.objects.link(ob);ob.location=location;aim(ob,target);return ob
light('Key tall softbox',(-3.5,-4.0,5.4),(0,0,1.3),750,(1.0,0.96,0.99),2.5,4.5)
light('Right rim strip',(3.7,0.8,3.2),(0,0,1.5),900,(0.85,0.80,1.0),1.25,4.0)
light('Top softbox',(0,0.2,6.3),(0,0,0),650,(1.0,1.0,1.0),3.8,2.0)
light('Backdrop wash',(-1.0,2.2,4.5),(0,5,2),450,(0.85,0.80,1.0),4.0,3.0)
light('Base glint',(2.5,-1.4,1.0),(0,0,0.1),90,(0.75,0.64,1.0),0.5,1.4)
dark,_=material('Studio negative fill',(0.008,0.007,0.013),0.4)
def card(name,loc,width,height):
    ob=mesh_object(name,[(-width/2,-height/2,0),(width/2,-height/2,0),(width/2,height/2,0),(-width/2,height/2,0)],[(0,1,2,3)],dark)
    ob.location=loc;aim(ob,(0,0,1.65));ob.visible_camera=False;return ob
card('Left dark reflection',(-2.8,-1.0,2.4),1.0,5.0)
card('Right dark reflection',(2.7,1.8,2.4),1.2,4.0)
world=bpy.data.worlds.new('Prism studio world');world.use_nodes=True;scene.world=world
background=next(n for n in world.node_tree.nodes if n.type=='BACKGROUND')
background.inputs['Color'].default_value=(0.72,0.69,0.82,1);background.inputs['Strength'].default_value=0.45
cam_data=bpy.data.cameras.new('Prism Portrait Camera')
cam=bpy.data.objects.new('Prism Portrait Camera',cam_data);studio.objects.link(cam)
cam.location=(2.25,-8.6,2.95);aim(cam,(0,0,1.64));cam_data.type='PERSP';cam_data.lens=70
scene.camera=cam
# Keep the original scene camera/light available; exclude the old light from this studio render.
old_light=bpy.data.objects.get('Light')
if old_light:old_light.hide_render=True
try:scene.render.engine='CYCLES'
except TypeError as e:print(e)
scene.cycles.samples=48;scene.cycles.use_denoising=True
scene.cycles.max_bounces=16;scene.cycles.transmission_bounces=12;scene.cycles.glossy_bounces=8
scene.cycles.diffuse_bounces=4;scene.cycles.transparent_max_bounces=12
scene.render.resolution_x=981;scene.render.resolution_y=793;scene.render.resolution_percentage=70
scene.render.image_settings.file_format='PNG'
scene.render.filepath=os.path.join(out,'preview-01.png')
scene.render.film_transparent=False
scene.view_settings.exposure=0.15
for selected in bpy.context.selected_objects:selected.select_set(False)
obj=bpy.data.objects['Rounded Triangular Prism'];obj.select_set(True);bpy.context.view_layer.objects.active=obj
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':
            region=area.spaces.active.region_3d
            region.view_perspective=next(i.identifier for i in region.bl_rna.properties['view_perspective'].enum_items if i.identifier=='CAMERA')
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out,'prism-studio.blend'))
print('Created studio, camera, Cycles settings, and saved prism-studio.blend')
