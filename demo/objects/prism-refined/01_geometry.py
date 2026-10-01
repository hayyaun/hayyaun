import bpy, math, bmesh, os
from mathutils import Vector
scene=bpy.context.scene
obj=bpy.data.objects['Rounded Triangular Prism']
# Analytic rounded triangular outline: circular corners with tangent straight sides.
corners=[Vector((-1.95,0.0)),Vector((1.95,0.0)),Vector((0.10,3.75))]
radii=[0.40,0.43,0.255]
arcs=[]
for i,p in enumerate(corners):
    u=(corners[(i-1)%3]-p).normalized();v=(corners[(i+1)%3]-p).normalized()
    angle=math.acos(max(-1,min(1,u.dot(v))))
    radius=radii[i]
    tangent=radius/math.tan(angle/2)
    center=p+(u+v).normalized()*(radius/math.sin(angle/2))
    a=p+u*tangent;b=p+v*tangent
    theta=math.atan2((a-center).y,(a-center).x)
    sweep=(math.atan2((b-center).y,(b-center).x)-theta)%(2*math.pi)
    arcs.append((a,b,center,radius,theta,sweep))
path=[];normals=[]
for i,(a,b,c,r,theta,sweep) in enumerate(arcs):
    for j in range(32):
        ang=theta+sweep*j/32
        n=Vector((math.cos(ang),math.sin(ang)))
        path.append(c+r*n);normals.append(n)
    end=arcs[(i+1)%3][0]
    n=Vector(((end-b).normalized().y,-(end-b).normalized().x))
    for j in range(48):
        path.append(b.lerp(end,j/48));normals.append(n)
N=len(path);verts=[];faces=[]
def add_ring(points,depth):
    ids=[]
    for p in points:
        ids.append(len(verts));verts.append((p.x,depth,p.y))
    return ids
def bridge(a,b):
    for i in range(N):faces.append((a[i],a[(i+1)%N],b[(i+1)%N],b[i]))
# Elliptical rolling edge gives a wide refracting border and softly curved depth.
edge_width=0.235; half_depth=0.43
rings=[]
for k in range(41):
    t=-math.pi/2+math.pi*k/40
    inset=edge_width*(1-math.cos(t))
    pts=[p-n*inset for p,n in zip(path,normals)]
    rings.append(add_ring(pts,half_depth*math.sin(t)))
for a,b in zip(rings[:-1],rings[1:]):bridge(a,b)
centroid=Vector((0.025,1.32))
boundary=[p-n*edge_width for p,n in zip(path,normals)]
for side,edge in [(-1,rings[0]),(1,rings[-1])]:
    previous=edge
    for k in range(1,19):
        scale=1-k/19
        pts=[centroid+(p-centroid)*scale for p in boundary]
        dome=0.024*(1-scale*scale)**2
        current=add_ring(pts,side*(half_depth+dome))
        bridge(previous,current);previous=current
    center_idx=len(verts);verts.append((centroid.x,side*(half_depth+0.024),centroid.y))
    for i in range(N):faces.append((previous[i],previous[(i+1)%N],center_idx))
mesh=bpy.data.meshes.new('Prism continuous rounded solid')
mesh.from_pydata(verts,[],faces);mesh.update()
bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
print('Topology:',len(bm.verts),'vertices,',sum(not e.is_manifold for e in bm.edges),'non-manifold edges, volume',round(bm.calc_volume(signed=False),4))
bm.to_mesh(mesh);bm.free()
obj.data=mesh;obj.modifiers.clear()
for p in mesh.polygons:p.use_smooth=True
mat=bpy.data.materials['Prism Glass']
node=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
node.inputs['Base Color'].default_value=(0.975,0.958,1.0,1)
node.inputs['Metallic'].default_value=0
node.inputs['Roughness'].default_value=0.022
node.inputs['IOR'].default_value=1.47
node.inputs['Transmission Weight'].default_value=1
node.inputs['Coat Weight'].default_value=0
mesh.materials.append(mat)
obj['description']='Solid optical glass prism with subtly convex filled faces and analytic rounded perimeter.'
obj['reference']='mc-helper/prism-object.jpg'
print('Refined prism geometry and optical glass created.')
