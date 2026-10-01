from pathlib import Path
s=Path('demo/objects/prism/v014.py').read_text().replace('v014','v015').replace('v013','v014')
s=s.replace('.06<h<.40','.12<h<.43')
s=s.replace('smooth((-nx-.72)/.18)*smooth((-ny-.58)/.32)*smooth((h-.06)/.10)*smooth((.40-h)/.12)','smooth((abs(nx)-.55)/.30)*smooth((-ny-.58)/.30)*smooth((h-.12)/.10)*smooth((.43-h)/.12)')
s=s.replace('range(24)','range(28)')
s=s.replace('mean=(old[i-2*N]+old[i-N]*4+old[i]*6+old[i+N]*4+old[i+2*N])/16', '''k=i//N;j=i%N
  lateral=(old[k*N+(j-3)%N]+old[k*N+(j-2)%N]*6+old[k*N+(j-1)%N]*15+old[i]*20+old[k*N+(j+1)%N]*15+old[k*N+(j+2)%N]*6+old[k*N+(j+3)%N])/64
  vertical=(old[i-2*N]+old[i-N]*4+old[i]*6+old[i+N]*4+old[i+2*N])/16
  mean=lateral*.70+vertical*.30''')
s=s.replace('localized lower front-left fillet smoothing; other geometry locked to v014.','rounder lower front face corners; approved top, central face and underside locked to v014.')
Path('demo/objects/prism/v015.py').write_text(s)
