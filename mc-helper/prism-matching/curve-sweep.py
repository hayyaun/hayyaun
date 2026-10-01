import bpy,os,time,math
s=bpy.context.scene;out=os.path.dirname(bpy.data.filepath)
p=bpy.context.preferences.addons['cycles'].preferences;p.compute_device_type='CUDA'
for d in p.get_devices_for_type('CUDA'):d.use=d.type=='CUDA'
s.cycles.device='GPU';s.cycles.samples=24;s.render.resolution_percentage=55
# Smooth, large reflection shapes rather than busy HDRI details.
ns=s.world.node_tree.nodes
noise=next(n for n in ns if n.type=='TEX_NOISE');noise.inputs['Scale'].default_value=4.0
ramp=next(n for n in ns if n.type=='VALTORGB');ramp.color_ramp.elements[0].position=0.40;ramp.color_ramp.elements[1].position=0.57
ramp.color_ramp.elements[0].color=(0.01,0.007,0.018,1)
bpy.data.objects['Right rim strip'].data.energy=320;bpy.data.objects['Right rim strip'].data.size=2.0
bpy.data.objects['Key tall softbox'].data.energy=300
base_path=os.path.join(os.path.dirname(out),'prism-refined','04_geometry_refined.py')
base=open(base_path,encoding='utf-8-sig').read().replace('dome=0.024*','dome=0.0*').replace('half_depth+0.024','half_depth+0.0')
for bow,label in [(0.08,'subtle'),(0.15,'medium'),(0.23,'full')]:
 code=base.replace('path.append(b.lerp(end,j/48));normals.append(n)',f'path.append(b.lerp(end,j/48)+n*({bow}*math.sin(math.pi*j/48)**2));normals.append(n)')
 exec(compile(code,'curvature-candidate','exec'))
 obj=bpy.data.objects['Rounded Triangular Prism']
 mod=obj.modifiers.new('Optical surface smoothing','SUBSURF');mod.levels=1;mod.render_levels=1
 # Slight continuous depth shaping on the shoulder; central faces stay almost flat.
 for v in obj.data.vertices:
  x,y,z=v.co
  v.co.y*=1+0.055*math.sin(1.7*x+0.7*z)+0.035*math.cos(2.1*z-0.8*x)
 # Rest the curved base on the stage.
 bottom=min(v.co.z for v in obj.data.vertices)
 obj.location.z=-bottom+0.006
 attr=obj.data.attributes.new(name='perimeter_finish',type='FLOAT',domain='POINT')
 for i in range(41*240):attr.data[i].value=1
 for start in [41*240,41*240+18*240+1]:
  for k in range(18):
   for j in range(240):attr.data[start+k*240+j].value=max(0,1-(k+1)/3)
 mat=obj.data.materials[0]
 for n in mat.node_tree.nodes:
  if n.type=='BSDF_PRINCIPLED' and n.inputs['Transmission Weight'].default_value>0.5:n.inputs['IOR'].default_value=1.46
 s.render.filepath=os.path.join(out,'curve-'+label+'.png')
 bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out,'curve-'+label+'.blend'),copy=True)
 t=time.monotonic();bpy.ops.render.render(write_still=True);print('DONE',label,time.monotonic()-t,flush=True)
