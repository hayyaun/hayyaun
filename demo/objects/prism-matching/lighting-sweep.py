import bpy,os,time,math
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
s=bpy.context.scene;out=os.path.dirname(bpy.data.filepath)
p=bpy.context.preferences.addons['cycles'].preferences;p.compute_device_type='CUDA'
for d in p.get_devices_for_type('CUDA'):d.use=d.type=='CUDA'
s.cycles.device='GPU';s.cycles.samples=32;s.render.resolution_percentage=60
# Correct framing after the slight bow enlarged the silhouette.
s.camera.location.z+=0.045
s.camera.rotation_euler=(Vector((0.02,0,1.675))-s.camera.location).to_track_quat('-Z','Y').to_euler()
s.camera.data.lens=67.6
# Quiet bright environment, with only a few finite dark shapes to reflect.
ns=s.world.node_tree.nodes
noise=next(n for n in ns if n.type=='TEX_NOISE');noise.inputs['Scale'].default_value=1.2
ramp=next(n for n in ns if n.type=='VALTORGB');ramp.color_ramp.elements[0].color=(0.28,0.22,0.4,1);ramp.color_ramp.elements[1].color=(1.0,0.96,1.1,1)
mat=bpy.data.materials.new('Soft charcoal reflector');mat.use_nodes=True
b=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED');b.inputs['Base Color'].default_value=(0.005,0.004,0.008,1);b.inputs['Roughness'].default_value=1;b.inputs['Specular IOR Level'].default_value=0
collection=bpy.data.collections['Prism Studio']
def oval(name,loc,width,height,target):
 vs=[(math.cos(2*math.pi*i/64)*width/2,math.sin(2*math.pi*i/64)*height/2,0) for i in range(64)]
 me=bpy.data.meshes.new(name+' mesh');me.from_pydata(vs,[],[tuple(range(64))]);me.materials.append(mat);me.update()
 ob=bpy.data.objects.new(name,me);collection.objects.link(ob);ob.location=loc;ob.rotation_euler=(Vector(target)-ob.location).to_track_quat('Z','Y').to_euler();ob.visible_camera=False;ob.visible_shadow=False;return ob
cards=[oval('Left broad reflection',(-2.8,-0.2,1.5),1.5,2.1,(-1,0,1.5)),oval('Right shoulder reflection',(3,0.4,2.4),1.5,2.2,(1,0,2)),oval('Left foot reflection',(-1.25,-0.15,-0.5),1.25,1.65,(-1.25,-0.15,1)),oval('Right foot reflection',(1.1,0.3,-0.5),1.05,1.4,(1.1,0.3,1)),oval('Crown reflection',(0.3,-0.2,4.8),1.7,1.5,(0,0,3))]
def render(label):
 s.render.filepath=os.path.join(out,label+'.png');bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out,label+'.blend'),copy=True)
 t=time.monotonic();bpy.ops.render.render(write_still=True);print('DONE',label,time.monotonic()-t,flush=True)
render('lighting-broad-patches')
for ob in cards:ob.scale*=1.45
cards[0].location.z=1.0;cards[1].location.z=2.8
render('lighting-large-patches')
