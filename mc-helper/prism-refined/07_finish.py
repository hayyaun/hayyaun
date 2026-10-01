import bpy,os,subprocess
scene=bpy.context.scene
obj=bpy.data.objects['Rounded Triangular Prism']
types=[i.identifier for i in bpy.types.Modifier.bl_rna.properties['type'].enum_items]
if 'SUBSURF' in types:
 mod=obj.modifiers.new('Optical surface smoothing','SUBSURF');mod.levels=1;mod.render_levels=2
mat=bpy.data.materials['Prism Glass'];edge=next(n for n in mat.node_tree.nodes if n.type=='MAP_RANGE')
edge.inputs['To Min'].default_value=0.95
edge.inputs['From Min'].default_value=0.95
# Coarser background pattern gives the center readable, large lavender shapes.
bg=bpy.data.materials['Soft lavender background'];noise=next(n for n in bg.node_tree.nodes if n.type=='TEX_NOISE');noise.inputs['Scale'].default_value=0.6
ramp=next(n for n in bg.node_tree.nodes if n.type=='VALTORGB')
ramp.color_ramp.elements[0].position=0.38;ramp.color_ramp.elements[0].color=(0.16,0.08,0.36,1)
ramp.color_ramp.elements[1].position=0.67
out=r'\\wsl$\Ubuntu\home\garfield\projects\hayyaun\mc-helper\prism-refined'
scene.render.filepath=os.path.join(out,'preview-12.png')
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out,'prism-studio.blend'))
cmd=[bpy.app.binary_path,'-b',bpy.data.filepath,'-t','8','--python-expr','import bpy; bpy.ops.render.render(write_still=True)']
p=subprocess.Popen(cmd,stdout=open(os.path.join(out,'render-12.log'),'w'),stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW)
print('Smooth optical surface and large background patterns render',p.pid)
