import bpy,bmesh,math,os,json,bisect
from mathutils import Vector
s=bpy.context.scene;ob=bpy.data.objects['Reference Prism'];target=(4.228592395782471,2.6428701877593994,3.669999599456787)
out=r'\\wsl$\Ubuntu\home\garfield\projects\hayyaun\demo\objects\prism'
# Cross sections explicitly describe the outer contour from level sole to rounded crest.
# z, half width, half depth, corner fraction
keys=[(0,.67,.64,.34),(.025,.83,.81,.32),(.075,.94,.93,.30),(.15,1,1,.30),(.23,.958,.95,.16),(.40,.77,.75,.07),(.62,.49,.477,.065),(.80,.285,.278,.07),(.88,.205,.193,.12),(.92,.164049,.141421,.30),(1,0,0,1)]
def interp(h,col):
 i=next((i for i in range(len(keys)-1) if h<=keys[i+1][0]),len(keys)-2)
 a,b=keys[i],keys[i+1];dt=b[0]-a[0];u=(h-a[0])/dt
 def slope(k):
  if k==0:return (keys[1][col]-keys[0][col])/(keys[1][0]-keys[0][0])
  if k==len(keys)-1:return (keys[-1][col]-keys[-2][col])/(keys[-1][0]-keys[-2][0])
  l=(keys[k][col]-keys[k-1][col])/(keys[k][0]-keys[k-1][0]);r=(keys[k+1][col]-keys[k][col])/(keys[k+1][0]-keys[k][0])
  return 0 if l*r<=0 else 2*l*r/(l+r)
 return (2*u**3-3*u*u+1)*a[col]+(u**3-2*u*u+u)*dt*slope(i)+(-2*u**3+3*u*u)*b[col]+(u**3-u*u)*dt*slope(i+1)
verts=[];faces=[];mask=[];N=160;levels=160
for k in range(levels):
 h=1-(1-k/levels)**2;w=interp(h,1);d=interp(h,2);r=interp(h,3)
 if h>.23:
  # Four affine face planes, with a tangent rounded tip confined to the apex.
  def planar_profile(h,slope,offset):
   join=1-offset/slope
   return slope*(1-h)+offset if h<=join else math.sqrt(4*slope*offset*(1-h))
  u=max(0,min(1,(h-.23)/.13));blend=u*u*u*(u*(u*6-15)+10)
  w=w*(1-blend)+planar_profile(h,1.20,.034)*blend
  d=d*(1-blend)+planar_profile(h,1.19,.0337)*blend
  r=r*(1-blend)+.12*blend
 if h>.87:
  u=min(1,(h-.87)/.10);r=.12+.88*u*u*(3-2*u)
 rx=w*r;ry=d*r
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
 # Resample by arc length so the circular cap has no collapsed straight-edge vertices.
 cumulative=[0.0]
 for j in range(len(points)):
  a=points[j];b=points[(j+1)%len(points)];cumulative.append(cumulative[-1]+math.hypot(b[0]-a[0],b[1]-a[1]))
 resampled=[]
 for j in range(N):
  distance=j*cumulative[-1]/N;idx=min(len(points)-1,bisect.bisect_right(cumulative,distance)-1)
  a=points[idx];b=points[(idx+1)%len(points)];length=cumulative[idx+1]-cumulative[idx];u=(distance-cumulative[idx])/length if length>1e-12 else 0
  resampled.append((a[0]*(1-u)+b[0]*u,a[1]*(1-u)+b[1]*u,a[2]))
 for x,y,corner in resampled:
  # Small front/back size difference; upper border rises right, sole does not tilt.
  t=max(0,min(1,(h-.23)/.13));flat=t*t*t*(t*(t*6-15)+10)
  x=.9725*x-.0275*y*((x/max(d,.001))*(1-flat)+(1.20/1.19)*flat)
  z=h+.035*x*math.exp(-((h-.22)/.14)**2)*math.sin(math.pi/2*min(1,h/.12)) if h<.12 else h+.035*x*math.exp(-((h-.22)/.14)**2)
  z=h+(z-h)*(1-flat)+.035*x*flat
  verts.append((x+.055*h,y+.045*h,z))
  mask.append(1 if h<.22 or corner else 0)
 if k:
  for j in range(N):faces.append(((k-1)*N+j,(k-1)*N+(j+1)%N,k*N+(j+1)%N,k*N+j))
faces.append(tuple(reversed(range(N))))
cap=len(verts);verts.append((.055,.045,1));mask.append(1)
for j in range(N):faces.append(((levels-1)*N+j,(levels-1)*N+(j+1)%N,cap))
mesh=bpy.data.meshes.new('v010');mesh.from_pydata(verts,[],faces);mesh.update()
for axis in range(3):
 lo=min(v.co[axis] for v in mesh.vertices);hi=max(v.co[axis] for v in mesh.vertices)
 for v in mesh.vertices:v.co[axis]=(v.co[axis]-lo)/(hi-lo)*target[axis]-(target[axis]/2 if axis<2 else 0)
bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh)
report={'dimensions':target,'non_manifold_edges':sum(not e.is_manifold for e in bm.edges),'signed_volume':bm.calc_volume(signed=True)};bm.free()
# Lock every original lower vertex, without refitting or smoothing it.
with bpy.data.libraries.load(os.path.join(out,'v005.blend'),link=False) as (src,dst):dst.objects=['Reference Prism']
source=dst.objects[0];bottom=[]
for k in range(levels):
 if 1-(1-k/levels)**2<=.23:
  for j in range(N):
   i=k*N+j;mesh.vertices[i].co=source.data.vertices[i].co;bottom.append(i)
report['bottom_max_displacement']=max((mesh.vertices[i].co-source.data.vertices[i].co).length for i in bottom)
bpy.data.objects.remove(source)
material=ob.data.materials[0];mesh.materials.append(material)
attr=mesh.attributes.new(name='perimeter_finish',type='FLOAT',domain='POINT')
for i,value in enumerate(mask):attr.data[i].value=value
ob.data=mesh;ob.modifiers.clear();ob.scale=(1,1,1);ob.location=(0,0,.006)
for p in mesh.polygons:p.use_smooth=True
ob['description']='v010: single planar face regions with rounded outlines; tangent apex; original lower vertices preserved.'
bpy.context.view_layer.update()
s['design_version']='v010';s.render.filepath=os.path.join(out,'v010.png')
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out,'v010.blend'))
open(os.path.join(out,'v010-validation.json'),'w').write(json.dumps(report,indent=2));print(json.dumps(report))











