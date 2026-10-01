import bpy,os,math,time
from mathutils import Vector
s=bpy.context.scene;out=os.path.dirname(bpy.data.filepath)
p=bpy.context.preferences.addons['cycles'].preferences;p.compute_device_type='CUDA'
for d in p.get_devices_for_type('CUDA'):d.use=d.type=='CUDA'
s.cycles.device='GPU';s.cycles.samples=32;s.render.resolution_percentage=60
base=open(os.path.join(os.path.dirname(out),'prism-refined','04_geometry_refined.py'),encoding='utf-8-sig').read().replace('dome=0.024*','dome=0.0*').replace('half_depth+0.024','half_depth+0.0').replace('0.40,0.43,0.255','0.34,0.37,0.14')
base=base.replace('path.append(b.lerp(end,j/48));normals.append(n)','path.append(b.lerp(end,j/48)+n*(0.025*math.sin(math.pi*j/48)**2));normals.append(n)')
base=base.replace('1-math.cos(t)','1-(0.45*math.cos(t)+0.55*math.cos(t)**2)').replace('half_depth*math.sin(t)','half_depth*(0.45*math.sin(t)+0.55*math.copysign(math.sin(t)**2,t))')
exec(compile(base,'pyramid-profile','exec'))
obj=bpy.data.objects['Rounded Triangular Prism'];obj.name='Rounded rectangular pyramid'
for v in obj.data.vertices:v.co.y*=max(.025,1-v.co.z/3.78)
width=(max(v.co.x for v in obj.data.vertices)-min(v.co.x for v in obj.data.vertices))*obj.scale.x
depth=(max(v.co.y for v in obj.data.vertices)-min(v.co.y for v in obj.data.vertices))*obj.scale.y
for v in obj.data.vertices:v.co.y*=width/(2*depth)
obj.location.z=-min(v.co.z for v in obj.data.vertices)+.006
mod=obj.modifiers.new('Optical surface smoothing','SUBSURF');mod.levels=1;mod.render_levels=1
attr=obj.data.attributes.new(name='perimeter_finish',type='FLOAT',domain='POINT')
for i in range(9840):attr.data[i].value=1
for start in [9840,14161]:
 for k in range(18):
  for j in range(240):attr.data[start+k*240+j].value=max(0,1-(k+1)/3)
mat=obj.data.materials[0];ns=mat.node_tree.nodes;ls=mat.node_tree.links
pbr=next(n for n in ns if n.type=='BSDF_PRINCIPLED' and n.inputs['Transmission Weight'].default_value>.5);pbr.inputs['IOR'].default_value=1.46
output=next(n for n in ns if n.type=='OUTPUT_MATERIAL');mix=next(n for n in ns if n.type=='MIX_SHADER')
s.camera.data.lens=64.5
stage=bpy.data.objects['Seamless lavender stage'];bs=next(n for n in stage.data.materials[0].node_tree.nodes if n.type=='BSDF_PRINCIPLED');bs.inputs['Roughness'].default_value=.22
obj['description']='Soft rectangular pyramid, base width:depth 2:1, depth tapering to a sharper rounded apex.'
for label,shader in [('pyramid-polished',mix.outputs[0]),('pyramid-glass',pbr.outputs['BSDF'])]:
 ls.new(shader,output.inputs['Surface'])
 s.render.filepath=os.path.join(out,label+'.png');bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out,label+'.blend'),copy=True)
 t=time.monotonic();bpy.ops.render.render(write_still=True);print('DONE',label,time.monotonic()-t,flush=True)
