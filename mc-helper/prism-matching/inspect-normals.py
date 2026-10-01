import bpy,bmesh,json,os
ob=bpy.data.objects['Rounded rectangular pyramid'];bm=bmesh.new();bm.from_mesh(ob.data)
print('SIGNED_VOLUME',bm.calc_volume(signed=True),flush=True)
print('NORMALS',[(tuple(p.center),tuple(p.normal)) for p in ob.data.polygons if p.index in [0,4800,9600,11000,15000]],flush=True)
bm.free()
