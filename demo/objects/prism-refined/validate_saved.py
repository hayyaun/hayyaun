import bpy,bmesh,json,os
obj=bpy.data.objects['Rounded Triangular Prism']
evaluated=obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
mesh=evaluated.to_mesh()
bm=bmesh.new();bm.from_mesh(mesh)
report={'evaluated_vertices':len(bm.verts),'evaluated_faces':len(bm.faces),'non_manifold_edges':sum(not e.is_manifold for e in bm.edges),'boundary_edges':sum(e.is_boundary for e in bm.edges),'signed_volume':bm.calc_volume(signed=True),'saved_scene':bpy.data.filepath,'render_samples':bpy.context.scene.cycles.samples}
bm.free();evaluated.to_mesh_clear()
out=os.path.dirname(bpy.data.filepath)
open(os.path.join(out,'evaluated-mesh-validation.json'),'w').write(json.dumps(report,indent=2))
print(json.dumps(report))
