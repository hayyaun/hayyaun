import bpy,os,math,time,bmesh,json
from mathutils import Vector
s=bpy.context.scene;out=os.path.dirname(bpy.data.filepath)
p=bpy.context.preferences.addons['cycles'].preferences;p.compute_device_type='CUDA'
for d in p.get_devices_for_type('CUDA'):d.use=d.type=='CUDA'
s.cycles.device='GPU';s.cycles.samples=32;s.render.resolution_percentage=60
obj=bpy.data.objects['Curved pillow-base prism'];obj.name='Rounded Triangular Prism'
base=open(os.path.join(os.path.dirname(out),'prism-refined','04_geometry_refined.py'),encoding='utf-8-sig').read().replace('dome=0.024*','dome=0.0*').replace('half_depth+0.024','half_depth+0.0').replace('0.40,0.43,0.255','0.30,0.32,0.10')
base=base.replace('path.append(b.lerp(end,j/48));normals.append(n)','path.append(b.lerp(end,j/48)+n*(0.035*math.sin(math.pi*j/48)**2));normals.append(n)')
base=base.replace('0.25 if t<0 else 0.30','0.28 if t<0 else 0.34').replace('0.75 if side<0 else 0.70','0.72 if side<0 else 0.66')
exec(compile(base,'curved-pillow-pyramid','exec'))
obj=bpy.data.objects['Rounded Triangular Prism'];obj.name='Curved pillow-base prism'
for v in obj.data.vertices:v.co.y*=max(.015,1-v.co.z/3.82)**.9*(1-.18*(abs(v.co.x)/1.95)**4)
width=(max(v.co.x for v in obj.data.vertices)-min(v.co.x for v in obj.data.vertices))*obj.scale.x
depth=(max(v.co.y for v in obj.data.vertices)-min(v.co.y for v in obj.data.vertices))*obj.scale.y
for v in obj.data.vertices:v.co.y*=width/(2*depth)
obj.location.z=-min(v.co.z for v in obj.data.vertices)+.006
mod=obj.modifiers.new('Continuous curved surfaces','SUBSURF');mod.levels=1;mod.render_levels=1
attr=obj.data.attributes.new(name='perimeter_finish',type='FLOAT',domain='POINT')
for i in range(9840):attr.data[i].value=1
for start in [9840,14161]:
 for k in range(18):
  for j in range(240):attr.data[start+k*240+j].value=max(0,1-(k+1)/3)
obj['description']='Pillow-like rounded rectangular base, 2:1 width/depth, bowed rolling edges and depth taper to rounded sharp crown. Front face larger than rear.'
mat=obj.data.materials[0];pbr=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED' and n.inputs['Transmission Weight'].default_value>.5);pbr.inputs['IOR'].default_value=1.52
s.camera.data.lens=66;s.camera.data.shift_y=.025
bpy.data.objects['Right rim strip'].data.size=.45
noise=next(n for n in bpy.data.objects['Seamless lavender stage'].data.materials[0].node_tree.nodes if n.type=='TEX_NOISE');noise.inputs['Scale'].default_value=.85;noise.inputs['Detail'].default_value=.9
s.render.filepath=os.path.join(out,'lean-curved-glass.png');bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out,'lean-curved.blend'),copy=True)
clay=bpy.data.materials.new('Neutral shape inspection');clay.use_nodes=True
bs=next(n for n in clay.node_tree.nodes if n.type=='BSDF_PRINCIPLED');bs.inputs['Base Color'].default_value=(.28,.22,.4,1);bs.inputs['Roughness'].default_value=.32;bs.inputs['Metallic'].default_value=.12
obj.data.materials[0]=clay
s.render.filepath=os.path.join(out,'lean-curved-shape.png');bpy.ops.render.render(write_still=True);print('CLAY_DONE',flush=True)
obj.data.materials[0]=mat;s.render.filepath=os.path.join(out,'lean-curved-glass.png');bpy.ops.render.render(write_still=True);print('GLASS_DONE',flush=True)

