from pathlib import Path
s=Path('demo/objects/prism/v011.py').read_text().replace('v011','v012').replace('.985','.965')
s=s.replace('if h0>.87:\n  u=min(1,(h0-.87)/.10);r=.12+.88*u*u*(3-2*u)', 'if h>.84:\n  u=min(1,(h-.84)/(tip_join-.84));r=.12+.88*u*u*u*(u*(u*6-15)+10)')
s=s.replace("os.path.join(out,'v010.blend')","os.path.join(out,'v011.blend')")
s=s.replace('if h0<=tip_join and not local_left:', 'if h0<=.84:')
s=s.replace('v010 retained with a slightly rounder tip and local left corner smoothing; bottom locked.', 'v011 retained below crown; broader elliptical dome with fully rounded sections before the tangent cap.')
Path('demo/objects/prism/v012.py').write_text(s)
p=Path('demo/objects/prism/v010-preview.py');Path('demo/objects/prism/v012-preview.py').write_text(p.read_text().replace('v010','v012'))
