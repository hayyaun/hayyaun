from pathlib import Path
s=Path('demo/objects/prism/v010.py').read_text().replace('v010','v011')
s=s.replace(' h=1-(1-k/levels)**2;w=interp(h,1);d=interp(h,2);r=interp(h,3)', ''' h0=1-(1-k/levels)**2
 h=h0
 tip_height=.985;tip_join=2*tip_height-1-.034/1.20
 if h>tip_join:h=tip_join+(h-tip_join)*(tip_height-tip_join)/(1-tip_join)
 w=interp(h,1);d=interp(h,2);r=interp(h,3)''')
s=s.replace('join=1-offset/slope\n   return slope*(1-h)+offset if h<=join else math.sqrt(4*slope*offset*(1-h))', '''join=2*.985-1-offset/slope
   width=slope*(1-join)+offset
   return slope*(1-h)+offset if h<=join else math.sqrt(max(0,2*slope*width*(.985-h)))''')
s=s.replace('if h>.87:\n  u=min(1,(h-.87)/.10)','if h0>.87:\n  u=min(1,(h0-.87)/.10)')
s=s.replace('verts.append((.055,.045,1))','verts.append((.055*.985,.045*.985,.985))')
s=s.replace(' for v in mesh.vertices:v.co[axis]=', ' if axis==2:hi=1.0\n for v in mesh.vertices:v.co[axis]=')
# Smooth only the existing left rounded transition; the planar face interiors are excluded.
s=s.replace("material=ob.data.materials[0];mesh.materials.append(material)",'''before=[v.co.copy() for v in mesh.vertices]
for k in range(2,levels-2):
 h=1-(1-k/levels)**2
 if not .23<h<.44:continue
 fade=math.sin(math.pi*(h-.23)/.21)**2
 for j in range(N):
  i=k*N+j
  if mask[i]<.5 or before[i].x>-.4:continue
  mean=(before[i-2*N]+before[i-N]*4+before[i]*6+before[i+N]*4+before[i+2*N])/16
  mesh.vertices[i].co=before[i].lerp(mean,.65*fade)
report['left_edge_max_adjustment']=max((v.co-before[i]).length for i,v in enumerate(mesh.vertices))
material=ob.data.materials[0];mesh.materials.append(material)''')
s=s.replace('single planar face regions with rounded outlines; tangent apex; original lower vertices preserved.','v010 retained with a slightly rounder tip and local left corner smoothing; bottom locked.')
s=s.replace("s['design_version']='v011'", "report['actual_dimensions']=list(ob.dimensions)\ns['design_version']='v011'")
Path('demo/objects/prism/v011.py').write_text(s)
