import bpy, math, os, json
from mathutils import Vector
out = r'\\wsl$\Ubuntu\home\garfield\projects\hayyaun\demo\objects\prism'
outer = bpy.data.objects['Reference Prism']
z = .66
normal = Vector((-.045,-.06,1)).normalized()
for old in list(bpy.data.objects):
    if old.name in ('v026-section','v027-section','v028-section'): bpy.data.objects.remove(old,do_unlink=True)
points = {}
for edge in outer.data.edges:
    a, b = (outer.matrix_world @ outer.data.vertices[i].co for i in edge.vertices)
    da = a.z-z-.045*a.x-.06*a.y
    db = b.z-z-.045*b.x-.06*b.y
    if da*db < 0:
        p = a + (b-a)*(-da/(db-da))
        points[(round(p.x,5),round(p.y,5))] = p
ring = sorted(points.values(),key=lambda p:math.atan2(p.y,p.x))
# The insert fits just inside the section, with flat parallel glass surfaces.
ring = [Vector((p.x*(1-.016/math.hypot(p.x,p.y)),p.y*(1-.016/math.hypot(p.x,p.y)),0)) for p in ring]
for p in ring: p.z = z + .045*p.x + .06*p.y
n = len(ring)
vertices = [tuple(p+normal*offset) for offset in (-.004,.004) for p in ring]
faces = [tuple(reversed(range(n))), tuple(range(n,2*n))]
faces += [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
mesh = bpy.data.meshes.new('v028-section'); mesh.from_pydata(vertices,[],faces); mesh.update()
section = bpy.data.objects.new('v028-section',mesh); bpy.context.collection.objects.link(section)
mesh.materials.append(outer.data.materials[0])
assert not any('inner' in o.name.lower() for o in bpy.context.scene.objects)
bpy.context.scene['design_version'] = 'v028'
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out,'v028.blend'))
for o in bpy.context.scene.objects: o.select_set(False)
for o in [outer,bpy.data.objects['v025-inclusion'],section]: o.select_set(True)
bpy.context.view_layer.objects.active = outer
bpy.ops.export_scene.gltf(filepath=os.path.join(out,'v028.glb'),export_format='GLB',use_selection=True,export_materials='EXPORT',export_animations=False,export_yup=True)
print(json.dumps({'version':'v028','section_height':z,'section_points':n,'objects':[outer.name,'v025-inclusion',section.name]}))



