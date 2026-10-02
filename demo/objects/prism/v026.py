import bpy, math, os, json
from mathutils import Vector
out = r'\\wsl$\Ubuntu\home\garfield\projects\hayyaun\demo\objects\prism'
outer = bpy.data.objects['Reference Prism']
z = .66
points = {}
for edge in outer.data.edges:
    a, b = (outer.matrix_world @ outer.data.vertices[i].co for i in edge.vertices)
    if (a.z-z)*(b.z-z) < 0:
        p = a + (b-a)*((z-a.z)/(b.z-a.z))
        points[(round(p.x,5),round(p.y,5))] = p
ring = sorted(points.values(),key=lambda p:math.atan2(p.y,p.x))
# The insert fits just inside the section, with flat parallel glass surfaces.
ring = [Vector((p.x*.997,p.y*.997,z)) for p in ring]
n = len(ring)
vertices = [(p.x,p.y,p.z+offset) for offset in (-.004,.004) for p in ring]
faces = [tuple(reversed(range(n))), tuple(range(n,2*n))]
faces += [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
mesh = bpy.data.meshes.new('v026-section'); mesh.from_pydata(vertices,[],faces); mesh.update()
section = bpy.data.objects.new('v026-section',mesh); bpy.context.collection.objects.link(section)
mesh.materials.append(outer.data.materials[0])
assert not any('inner' in o.name.lower() for o in bpy.context.scene.objects)
bpy.context.scene['design_version'] = 'v026'
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out,'v026.blend'))
for o in bpy.context.scene.objects: o.select_set(False)
for o in [outer,bpy.data.objects['v025-inclusion'],section]: o.select_set(True)
bpy.context.view_layer.objects.active = outer
bpy.ops.export_scene.gltf(filepath=os.path.join(out,'v026.glb'),export_format='GLB',use_selection=True,export_materials='EXPORT',export_animations=False,export_yup=True)
print(json.dumps({'version':'v026','section_height':z,'section_points':n,'objects':[outer.name,'v025-inclusion',section.name]}))
