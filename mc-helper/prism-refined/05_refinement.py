import bpy,os,subprocess
out=r'\\wsl$\Ubuntu\home\garfield\projects\hayyaun\mc-helper\prism-refined'
exec(compile(open(os.path.join(out,'04_geometry_refined.py'),encoding='utf-8-sig').read(),'04_geometry_refined.py','exec'))
mat=bpy.data.materials['Prism Glass']
edge=next(n for n in mat.node_tree.nodes if n.type=='MAP_RANGE')
edge.inputs['From Min'].default_value=0.93
edge.inputs['From Max'].default_value=0.998
edge.inputs['To Min'].default_value=0.65
bump=next(n for n in mat.node_tree.nodes if n.type=='BUMP');bump.inputs['Distance'].default_value=0.004
obj=bpy.data.objects['Rounded Triangular Prism']
# Local triangular profile is upright; give its crown a small rightward drift.
for v in obj.data.vertices:v.co.x+=0.065*(v.co.z/3.45)
obj.data.update()
scene=bpy.context.scene
scene.render.filepath=os.path.join(out,'preview-09.png')
scene.cycles.samples=32
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out,'prism-studio.blend'))
cmd=[bpy.app.binary_path,'-b',bpy.data.filepath,'-t','8','--python-expr','import bpy; bpy.ops.render.render(write_still=True)']
p=subprocess.Popen(cmd,stdout=open(os.path.join(out,'render-09.log'),'w'),stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW)
print('Refined base and shoulders, preview PID',p.pid)
