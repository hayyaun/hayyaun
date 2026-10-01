import bpy,bmesh,math,os,json
from mathutils import Vector
s=bpy.context.scene;ob=bpy.data.objects['Reference Prism'];target=tuple(ob.dimensions)
out=r'\\wsl$\Ubuntu\home\garfield\projects\hayyaun\demo\objects\prism'
# Cross sections explicitly describe the outer contour from level sole to rounded crest.
# z, half width, half depth, corner fraction
keys=[(0,.67,.64,.34),(.025,.83,.81,.32),(.075,.94,.93,.30),(.15,1,1,.27),(.23,.965,.94,.24),(.40,.77,.72,.20),(.62,.49,.45,.20),(.80,.285,.25,.24),(.93,.12,.095,.42),(.98,.065,.060,.7),(1,.012,.020,1)]
def interp(h,col):
 i=next((i for i in range(len(keys)-1) if h<=keys[i+1][0]),len(keys)-2)
 a,b=keys[i],keys[i+1];dt=b[0]-a[0];u=(h-a[0])/dt
 def slope(k):
  if k==0:return (keys[1][col]-keys[0][col])/(keys[1][0]-keys[0][0])
  if k==len(keys)-1:return (keys[-1][col]-keys[-2][col])/(keys[-1][0]-keys[-2][0])
  l=(keys[k][col]-keys[k-1][col])/(keys[k][0]-keys[k-1][0]);r=(keys[k+1][col]-keys[k][col])/(keys[k+1][0]-keys[k][0])
  return 0 if l*r<=0 else 2*l*r/(l+r)
 return (2*u**3-3*u*u+1)*a[col]+(u**3-2*u*u+u)*dt*slope(i)+(-2*u**3+3*u*u)*b[col]+(u**3-u*u)*dt*slope(i+1)
verts=[];faces=[];mask=[];N=160;levels=100
for k in range(levels+1):
 h=k/levels;w=interp(h,1);d=interp(h,2);r=interp(h,3);rx=w*r;ry=d*r
 points=[]
 for q in range(4):
  ang=q*math.pi/2;cx=(w-rx)*(1 if q in [0,3] else -1);cy=(d-ry)*(1 if q in [0,1] else -1)
  for j in range(20):
   t=ang+j/20*math.pi/2;points.append((cx+rx*math.cos(t),cy+ry*math.sin(t),True))
  end=(cx+rx*math.cos(ang+math.pi/2),cy+ry*math.sin(ang+math.pi/2))
  nq=(q+1)%4;nx=(w-rx)*(1 if nq in [0,3] else -1);ny=(d-ry)*(1 if nq in [0,1] else -1)
  start=(nx+rx*math.cos(ang+math.pi/2),ny+ry*math.sin(ang+math.pi/2))
  for j in range(20):
   u=j/20;points.append((end[0]*(1-u)+start[0]*u,end[1]*(1-u)+start[1]*u,False))
 for x,y,corner in points:
  # Small front/back size difference; upper border rises right, sole does not tilt.
  x*=1-.055*(y/max(d,.001)+1)/2
  z=h+.055*x*math.exp(-((h-.22)/.14)**2)*math.sin(math.pi/2*min(1,h/.12)) if h<.12 else h+.055*x*math.exp(-((h-.22)/.14)**2)
  verts.append((x+.055*h,y+.045*h,z))
  mask.append(1 if h<.22 or corner else 0)
 if k:
  for j in range(N):faces.append(((k-1)*N+j,(k-1)*N+(j+1)%N,k*N+(j+1)%N,k*N+j))
faces.append(tuple(reversed(range(N))));faces.append(tuple(levels*N+j for j in range(N)))
mesh=bpy.data.meshes.new('v003');mesh.from_pydata(verts,[],faces);mesh.update()
for axis in range(3):
 lo=min(v.co[axis] for v in mesh.vertices);hi=max(v.co[axis] for v in mesh.vertices)
 for v in mesh.vertices:v.co[axis]=(v.co[axis]-lo)/(hi-lo)*target[axis]-(target[axis]/2 if axis<2 else 0)
bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh)
report={'dimensions':target,'non_manifold_edges':sum(not e.is_manifold for e in bm.edges),'signed_volume':bm.calc_volume(signed=True)};bm.free()
material=ob.data.materials[0];mesh.materials.append(material)
attr=mesh.attributes.new(name='perimeter_finish',type='FLOAT',domain='POINT')
for i,value in enumerate(mask):attr.data[i].value=value
ob.data=mesh;ob.modifiers.clear();ob.scale=(1,1,1);ob.location=(0,0,.006)
for p in mesh.polygons:p.use_smooth=True
ob['description']='v003: rebuilt from rounded rectangular horizontal sections; opposed triangular faces, rounded crest, curved outer base and right-rising lower face boundary.'
s['design_version']='v003';s.render.filepath=os.path.join(out,'v003.png')
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out,'v003.blend'))
open(os.path.join(out,'v003-validation.json'),'w').write(json.dumps(report,indent=2));print(json.dumps(report))


