from pathlib import Path
s=Path('demo/objects/prism/v013.py').read_text().replace('v013','v014').replace('v012','v013')
s=s.replace('.23<h<.48','.06<h<.40')
s=s.replace('smooth((abs(ny)-.58)/.32)*smooth((h-.23)/.07)*smooth((.48-h)/.10)','smooth((-ny-.58)/.32)*smooth((h-.06)/.10)*smooth((.40-h)/.12)')
s=s.replace('range(18)','range(24)')
s=s.replace('local feathered left-corner smoothing; v013 crown, face interiors, underside locked.','localized lower front-left fillet smoothing; other geometry locked to v013.')
Path('demo/objects/prism/v014.py').write_text(s)
