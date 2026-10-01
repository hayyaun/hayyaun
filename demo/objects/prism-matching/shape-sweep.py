import bpy,os,time
s=bpy.context.scene;out=os.path.dirname(bpy.data.filepath)
prefs=bpy.context.preferences.addons['cycles'].preferences;prefs.compute_device_type='CUDA'
for d in prefs.get_devices_for_type('CUDA'):d.use=d.type=='CUDA'
s.cycles.device='GPU';s.cycles.samples=24;s.render.resolution_percentage=55
# Remove accumulated reflection flags from this controlled comparison.
for o in bpy.data.collections['Prism Studio'].objects:
 if o.type=='MESH' and o.name!='Seamless lavender stage':o.hide_render=True
stage=bpy.data.objects['Seamless lavender stage'];stage.visible_glossy=True
# Broad organic studio environment with no surface bump.
world=bpy.data.worlds.new('Controlled soft studio');world.use_nodes=True;s.world=world
ns=world.node_tree.nodes;ls=world.node_tree.links
bg=next(n for n in ns if n.type=='BACKGROUND');bg.inputs['Strength'].default_value=0.7
coord=ns.new('ShaderNodeTexCoord');noise=ns.new('ShaderNodeTexNoise');noise.noise_dimensions='3D';noise.noise_type='FBM';noise.normalize=True;noise.inputs['Scale'].default_value=2.2;noise.inputs['Detail'].default_value=0
ramp=ns.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].position=0.38;ramp.color_ramp.elements[0].color=(0.006,0.004,0.009,1);ramp.color_ramp.elements[1].position=0.60;ramp.color_ramp.elements[1].color=(1.2,1.12,1.4,1)
ls.new(coord.outputs['Normal'],noise.inputs['Vector']);ls.new(noise.outputs['Factor'],ramp.inputs['Factor']);ls.new(ramp.outputs['Color'],bg.inputs['Color'])
# Explicit soft lavender forms behind the glass rather than a nearly blank wall.
mat=bpy.data.materials.new('Lavender cloud stage');mat.use_nodes=True
ns=mat.node_tree.nodes;ls=mat.node_tree.links;bsdf=next(n for n in ns if n.type=='BSDF_PRINCIPLED');bsdf.inputs['Roughness'].default_value=0.35
tex=ns.new('ShaderNodeTexCoord');factor=None
for center,radius in [((-0.7,2.5,1.55),1.25),((-2.1,2.5,3.0),1.3),((1.6,2.5,3.4),1.1),((0.65,2.5,0.8),0.85)]:
 dist=ns.new('ShaderNodeVectorMath');dist.operation='DISTANCE';dist.inputs[1].default_value=center;ls.new(tex.outputs['Object'],dist.inputs[0])
 remap=ns.new('ShaderNodeMapRange');remap.clamp=True;remap.interpolation_type='SMOOTHERSTEP';remap.inputs['From Min'].default_value=0.1;remap.inputs['From Max'].default_value=radius;ls.new(dist.outputs['Value'],remap.inputs['Value'])
 if factor is None:factor=remap.outputs['Result']
 else:
  minimum=ns.new('ShaderNodeMath');minimum.operation='MINIMUM';ls.new(factor,minimum.inputs[0]);ls.new(remap.outputs['Result'],minimum.inputs[1]);factor=minimum.outputs[0]
mix=ns.new('ShaderNodeMixRGB');mix.inputs['Color1'].default_value=(0.23,0.14,0.42,1);mix.inputs['Color2'].default_value=(0.85,0.82,0.95,1)
ls.new(factor,mix.inputs['Factor']);ls.new(mix.outputs['Color'],bsdf.inputs['Base Color']);ls.new(mix.outputs['Color'],bsdf.inputs['Emission Color']);bsdf.inputs['Emission Strength'].default_value=0.22
stage.data.materials.clear();stage.data.materials.append(mat)
for f in stage.data.polygons:f.material_index=0
# A single simple dielectric shader makes this a geometry comparison.
glass=bpy.data.materials['Prism Glass'];glass.node_tree.nodes.clear()
pbr=glass.node_tree.nodes.new('ShaderNodeBsdfPrincipled');output=glass.node_tree.nodes.new('ShaderNodeOutputMaterial');glass.node_tree.links.new(pbr.outputs['BSDF'],output.inputs['Surface'])
base_path=os.path.join(os.path.dirname(out),'prism-refined','04_geometry_refined.py')
base=open(base_path,encoding='utf-8-sig').read()
for dome,label in [(0.0,'flat'),(-0.17,'shallow'),(-0.32,'deep')]:
 code=base.replace('dome=0.024*',f'dome={dome}*').replace('half_depth+0.024',f'half_depth+({dome})')
 exec(compile(code,'shape-candidate','exec'))
 obj=bpy.data.objects['Rounded Triangular Prism']
 mod=obj.modifiers.new('Surface smoothing','SUBSURF');mod.levels=1;mod.render_levels=1
 pbr.inputs['Base Color'].default_value=(0.99,0.98,1,1);pbr.inputs['IOR'].default_value=1.52;pbr.inputs['Roughness'].default_value=0.015
 s.camera.data.shift_x=-0.012
 s.render.filepath=os.path.join(out,'shape-'+label+'.png')
 bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out,'shape-'+label+'.blend'),copy=True)
 t=time.monotonic();bpy.ops.render.render(write_still=True);print('DONE',label,time.monotonic()-t,flush=True)
