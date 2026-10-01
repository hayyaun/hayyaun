import bpy,os,json
s=bpy.context.scene;o=bpy.data.objects['Reference Prism'];out=r'\\wsl$\Ubuntu\home\garfield\projects\hayyaun\mc-helper\prism-matching'
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out,'before-rectangle-correction.blend'),copy=True)
bpy.context.view_layer.update()
o.scale.y*=o.dimensions.x/(1.6*o.dimensions.y)
o.scale.z*=3.67/o.dimensions.z
bottom=min(v.co.z for v in o.data.vertices)*o.scale.z;o.location.z=.006-bottom
bpy.context.view_layer.update()
o['description']='Rounded rectangular base, width/depth 1.6:1, curved edges and rounded vertices, front face larger than rear.'
for screen in bpy.data.screens:
 for area in screen.areas:
  if area.type=='VIEW_3D':area.spaces.active.region_3d.view_perspective='CAMERA'
s.render.resolution_percentage=100;s.cycles.samples=96;s.render.filepath=os.path.join(out,'prism-rectangle.png')
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out,'prism-rectangle.blend'))
print(json.dumps({'dimensions':list(o.dimensions),'ratio':o.dimensions.x/o.dimensions.y}))
