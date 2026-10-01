from pathlib import Path
p=Path('demo/objects/prism/v012.py');s=p.read_text().replace('tip_height=.965;tip_join=2*tip_height-1-.034/1.20','tip_height=.965;tip_join=.86')
a=s.index('   join=2*.965');b=s.index('  u=max(0,min(1,(h-.23)',a)
s=s[:a]+'''   start=.86;end=.965
   if h<=start:return slope*(1-h)+offset
   lo=0.;hi=1.
   for iteration in range(40):
    t=(lo+hi)/2
    z=start+(end-start)*(1.5*t-.5*t*t*t)
    if z<h:lo=t
    else:hi=t
   t=(lo+hi)/2;w0=slope*(1-start)+offset;length=end-start
   return (1-t)**3*w0+3*(1-t)**2*t*(w0-slope*length/2)+3*(1-t)*t*t*(w0-slope*length)
''' +s[b:]
s=s.replace('(h-.84)/(tip_join-.84)','(h-.84)/(.945-.84)')
p.write_text(s)
