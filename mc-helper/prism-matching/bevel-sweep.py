import bpy,os,math,time
s=bpy.context.scene;out=os.path.dirname(bpy.data.filepath)
p=bpy.context.preferences.addons['cycles'].preferences;p.compute_device_type='CUDA'
for d in p.get_devices_for_type('CUDA'):d.use=d.type=='CUDA'
s.cycles.device='GPU';s.cycles.samples=32;s.render.resolution_percentage=60
base=open(os.path.join(os.path.dirname(out),'prism-refined','04_geometry_refined.py'),encoding='utf-8-sig').read().replace('dome=0.024*','dome=0.0*').replace('half_depth+0.024','half_depth+0.0')
base=base.replace('path.append(b.lerp(end,j/48));normals.append(n)','path.append(b.lerp(end,j/48)+n*(0.06*math.sin(math.pi*j/48)**2));normals.append(n)').replace('(0.025,2.05)','(0.14,2.0)')
base=base.replace('0.25 if t<0','0.28 if t<0').replace('0.75 if side<0','0.72 if side<0')
for blend,label in [(.65,'bevel-soft'),(.88,'bevel-broad')]:
 code=base.replace('1-math.cos(t)',f'1-((1-{blend})*math.cos(t)+{blend}*math.cos(t)**2)').replace('half_depth*math.sin(t)',f'half_depth*((1-{blend})*math.sin(t)+{blend}*math.copysign(math.sin(t)**2,t))')
 exec(compile(code,'broad-bevel','exec'))
 obj=bpy.data.objects['Rounded Triangular Prism'];mod=obj.modifiers.new('Optical smoothing','SUBSURF');mod.levels=1;mod.render_levels=1
 for i,v in enumerate(obj.data.vertices):
  if i<9840:
   x,y,z=v.co;t=-math.pi/2+math.pi*(i//240)/40
   v.co.y+=.085*math.sin(2.7*x+2*z)*math.sin(t)*math.cos(t)**2
 obj.location.z=-min(v.co.z for v in obj.data.vertices)+.006
 attr=obj.data.attributes.new(name='perimeter_finish',type='FLOAT',domain='POINT')
 for i in range(9840):attr.data[i].value=1
 for start in [9840,14161]:
  for k in range(18):
   for j in range(240):attr.data[start+k*240+j].value=max(0,1-(k+1)/3)
 glass=next(n for n in obj.data.materials[0].node_tree.nodes if n.type=='BSDF_PRINCIPLED' and n.inputs['Transmission Weight'].default_value>.5);glass.inputs['IOR'].default_value=1.46
 s.render.filepath=os.path.join(out,label+'.png');bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out,label+'.blend'),copy=True)
 t=time.monotonic();bpy.ops.render.render(write_still=True);print('DONE',label,time.monotonic()-t,flush=True)
