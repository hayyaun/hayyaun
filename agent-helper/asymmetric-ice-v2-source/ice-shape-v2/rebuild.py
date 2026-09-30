"""Fit the selected front outline, loft rounded triangular sections, export GLB.
The source is a stylized reference: rear/depth details remain interpretations.
"""
from pathlib import Path
import json, struct
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter1d
from scipy.interpolate import PchipInterpolator, UnivariateSpline
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.collections import PolyCollection, LineCollection
from matplotlib.colors import LinearSegmentedColormap

ROOT=Path(__file__).resolve().parent
OUT=ROOT
REF=ROOT/'reference.png'
IMAGE=np.asarray(Image.open(REF).convert('RGB'))
BOXES={'front':(40,0,560,465),'left':(1090,0,1490,465),'right':(85,505,495,934)}

def extract(box):
    x0,y0,x1,y1=box
    c=IMAGE[y0:y1,x0:x1].astype(float)
    mask=(np.ptp(c,axis=2)>45)&(c.min(axis=2)<210)
    good=np.flatnonzero(mask.sum(axis=1)>=6)
    top,bottom=int(good.min()),int(good.max())
    ys=np.arange(top,bottom+1)
    lo=[];hi=[]
    for y in ys:
        xs=np.flatnonzero(mask[y]);lo.append(xs.min()+x0);hi.append(xs.max()+x0)
    lo=np.asarray(lo,dtype=float);hi=np.asarray(hi,dtype=float)
    height=bottom-top+2
    center=(lo.min()+hi.max())/2
    t=(bottom+1-ys)/height
    return {'t':t[::-1], 'lo':((lo-center)/height)[::-1], 'hi':((hi-center)/height)[::-1],
            'pixelHeight':height,'pixelCenter':center,'pixelTop':top+y0-1,'pixelBottom':bottom+y0+1,
            'pixelLo':lo[::-1],'pixelHi':hi[::-1],'box':box}

FR=extract(BOXES['front']);LE=extract(BOXES['left']);RI=extract(BOXES['right'])

def smooth_profile(t,lo,hi):
    center=gaussian_filter1d((lo+hi)/2,1.6,mode='nearest')
    radius=gaussian_filter1d((hi-lo)/2,1.15,mode='nearest')
    # Factoring sqrt(t*(1-t)) ensures rounded, tangent-continuous caps.
    log_r=np.log(radius/np.sqrt(t*(1-t)))
    # Remove subpixel row/line noise instead of embossing it into the surface.
    center_fn=UnivariateSpline(t,center,s=len(t)*(.0009**2),k=3,ext=0)
    radius_fn=UnivariateSpline(t,log_r,w=radius,s=len(t)*(.0009**2),k=3,ext=0)
    def sample(y):
        y=np.clip(np.asarray(y,dtype=float),0,1)
        return center_fn(y),np.sqrt(y*(1-y))*np.exp(radius_fn(y))
    return sample

front=smooth_profile(FR['t'],FR['lo'],FR['hi'])
left_lo=PchipInterpolator(LE['t'],LE['lo'],extrapolate=True)
left_hi=PchipInterpolator(LE['t'],LE['hi'],extrapolate=True)
right_lo=PchipInterpolator(RI['t'],-RI['hi'],extrapolate=True)
right_hi=PchipInterpolator(RI['t'],-RI['lo'],extrapolate=True)
zt=FR['t']
zlo=(left_lo(zt)+right_lo(zt))/2
zhi=(left_hi(zt)+right_hi(zt))/2
side=smooth_profile(zt,zlo,zhi)

VERTICAL=160
ARC=12
EDGE=20
RING=3*(ARC+EDGE)

def section(t):
    # Front-left, front-right, rear. The footprint has three unequal corners.
    v=np.array([[-1,.78],[1,1.0],[-.10,-1.0]],float)
    base=np.exp(-t/.20)
    cuts=np.array([.12,.24,.17])+np.array([.13,.10,.10])*base
    starts=[];ends=[]
    for k in range(3):
        starts.append(v[k]+cuts[k]*(v[(k-1)%3]-v[k]))
        ends.append(v[k]+cuts[k]*(v[(k+1)%3]-v[k]))
    out=[]
    for k in range(3):
        a,b,c=starts[k],v[k],ends[k]
        for u in np.arange(ARC)/ARC:out.append((1-u)**2*a+2*u*(1-u)*b+u*u*c)
        a=ends[k];b=starts[(k+1)%3]
        tangent=b-a
        # This polygon is clockwise in XZ: its outward normal is left.
        normal=np.array([-tangent[1],tangent[0]])/np.linalg.norm(tangent)
        bow=.040 if k==0 else .022
        for u in np.arange(EDGE)/EDGE:out.append((1-u)*a+u*b+normal*bow*np.sin(np.pi*u)**2)
    q=np.asarray(out)
    q=(q-(q.min(axis=0)+q.max(axis=0))/2)/((q.max(axis=0)-q.min(axis=0))/2)
    return q

def build():
    ys=.5-.5*np.cos(np.linspace(0,np.pi,VERTICAL+1))
    cx,rx=front(ys);cz,rz=side(ys)
    vertices=[[float(cx[0]),0,float(cz[0])]]
    for j,t in enumerate(ys[1:-1],1):
        q=section(t)
        vertices.extend(np.column_stack([cx[j]+rx[j]*q[:,0],np.full(RING,t),cz[j]+rz[j]*q[:,1]]))
    top=len(vertices);vertices.append([float(cx[-1]),1,float(cz[-1])])
    f=[]
    # Winding is checked and corrected globally below.
    for k in range(RING):f.append([0,1+(k+1)%RING,1+k])
    for j in range(VERTICAL-2):
        a=1+j*RING;b=a+RING
        for k in range(RING):
            kn=(k+1)%RING
            f.extend([[a+k,a+kn,b+k],[a+kn,b+kn,b+k]])
    last=1+(VERTICAL-2)*RING
    for k in range(RING):f.append([last+k,last+(k+1)%RING,top])
    p=np.asarray(vertices,dtype=float);f=np.asarray(f,dtype=np.int32)
    volume=np.einsum('ij,ij->i',p[f[:,0]],np.cross(p[f[:,1]],p[f[:,2]])).sum()/6
    if volume<0:f=f[:,[0,2,1]]
    n=np.cross(p[f[:,1]]-p[f[:,0]],p[f[:,2]]-p[f[:,0]])
    normals=np.zeros_like(p)
    for k in range(3):np.add.at(normals,f[:,k],n)
    normals/=np.linalg.norm(normals,axis=1,keepdims=True)
    return p,f,normals,ys

P,F,NORMALS,YS=build()
FACE_N=np.cross(P[F[:,1]]-P[F[:,0]],P[F[:,2]]-P[F[:,0]])

def export_glb():
    arrays=[P.astype('<f4'),NORMALS.astype('<f4'),F.astype('<u2')]
    parts=[a.tobytes() for a in arrays]; offsets=[];binary=b''
    for b in parts:
        binary+=b'\0'*((-len(binary))%4);offsets.append(len(binary));binary+=b
    binary+=b'\0'*((-len(binary))%4)
    doc={'asset':{'version':'2.0','generator':'Reference-fitted asymmetric ice v2'},
         'scene':0,'scenes':[{'nodes':[0]}],'nodes':[{'name':'AsymmetricIceV2','mesh':0}],
         'meshes':[{'name':'ClosedSculptedSurface','primitives':[{'attributes':{'POSITION':0,'NORMAL':1},'indices':2,'material':0}]}],
         'extensionsUsed':['KHR_materials_transmission','KHR_materials_volume','KHR_materials_ior'],
         'materials':[{'name':'ClearIce','pbrMetallicRoughness':{'baseColorFactor':[.985,.992,1.0,1.0],'metallicFactor':0,'roughnessFactor':.065},
                       'extensions':{'KHR_materials_transmission':{'transmissionFactor':1.0},
                                     'KHR_materials_volume':{'thicknessFactor':.35,'attenuationDistance':2.0,'attenuationColor':[.97,.985,1.0]},
                                     'KHR_materials_ior':{'ior':1.33}}}],
         'buffers':[{'byteLength':len(binary)}],
         'bufferViews':[{'buffer':0,'byteOffset':offsets[i],'byteLength':len(parts[i]),'target':34963 if i==2 else 34962} for i in range(3)],
         'accessors':[{'bufferView':0,'componentType':5126,'count':len(P),'type':'VEC3','min':arrays[0].min(0).tolist(),'max':arrays[0].max(0).tolist()},
                      {'bufferView':1,'componentType':5126,'count':len(P),'type':'VEC3'},
                      {'bufferView':2,'componentType':5123,'count':F.size,'type':'SCALAR'}],
         'extras':{'status':'Approximation fitted to selected stylized image. Front prioritized; side profiles averaged. Not a measured reconstruction.',
                   'axes':'+Y up; +Z front; minimum Y=0; height=1',
                   'surface':'Three rounded lateral regions and a broad rounded underside; solid center.',
                   'dimensions':(P.max(0)-P.min(0)).tolist()}}
    j=json.dumps(doc,separators=(',',':')).encode();j+=b' '*((-len(j))%4)
    b=struct.pack('<III',0x46546c67,2,12+8+len(j)+8+len(binary))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(binary),0x004e4942)+binary
    (OUT/'asymmetric-ice-v2.glb').write_bytes(b)
    return doc,b

BLUE=np.array([.16,.28,.82]);RED=np.array([.87,.19,.26])
CMAP=LinearSegmentedColormap.from_list('depth',[BLUE,[.56,.22,.72],RED])
def basis(d,up):
    d=np.asarray(d,dtype=float);d/=np.linalg.norm(d)
    r=np.cross(np.asarray(up),d);r/=np.linalg.norm(r)
    return np.stack([r,np.cross(d,r),d])

def render(ax,d=(0,0,1),up=(0,1,0),wire=False):
    b=basis(d,up);q=(P-[0,.5,0])@b.T
    front_mask=FACE_N@b[2]>0
    fi=np.flatnonzero(front_mask);dep=q[F[fi],2].mean(1);order=np.argsort(dep)
    nn=NORMALS[F[fi]].mean(axis=1);nn/=np.linalg.norm(nn,axis=1,keepdims=True)
    light=b.T@np.array([-.45,.65,.6]);light/=np.linalg.norm(light)
    lighting=.63+.37*np.clip(nn@light,0,1)
    colors=np.clip(np.array([.76,.85,.94])[None,:]*lighting[:,None]+.09,0,1)
    ax.add_collection(PolyCollection(q[F[fi]][order,:,:2],facecolors=colors[order],edgecolors='none',antialiaseds=False,rasterized=True))
    if wire:
        segments=[];depths=[]
        shown=NORMALS@b[2]>-.02
        for j in range(1,VERTICAL-1,6):
            a=1+(j-1)*RING
            for k in range(RING):
                ids=[a+k,a+(k+1)%RING]
                if np.all(shown[ids]):segments.append(q[ids,:2]);depths.append(q[ids,2].mean())
        for k in range(0,RING,4):
            for j in range(VERTICAL-2):
                ids=[1+j*RING+k,1+(j+1)*RING+k]
                if np.all(shown[ids]):segments.append(q[ids,:2]);depths.append(q[ids,2].mean())
        depths=np.array(depths);cols=CMAP((depths-depths.min())/(np.ptp(depths)+1e-12));cols[:,3]=.70
        ax.add_collection(LineCollection(segments,colors=cols,linewidths=.58))
    ax.set_xlim(-.66,.66);ax.set_ylim(-.59,.59);ax.set_aspect('equal');ax.axis('off')

def preview():
    plt.rcParams.update({'font.family':'DejaVu Sans','text.color':'#23334c'})
    fig=plt.figure(figsize=(15,9),dpi=160,facecolor='#f7f9fc')
    fig.text(.035,.951,'ASYMMETRIC ICE / V2',fontsize=22,weight='bold')
    fig.text(.035,.917,'Front fitted to your latest reference. Clay inspection below; the GLB includes a clear ice material.',fontsize=10.5,color='#627289')
    ax=fig.add_axes([.035,.52,.275,.34]);ax.imshow(IMAGE);ax.set_xlim(40,560);ax.set_ylim(465,0);ax.axis('off')
    fig.text(.172,.486,'SELECTED FRONT REFERENCE',ha='center',fontsize=10,weight='bold')
    ax=fig.add_axes([.36,.52,.275,.34]);render(ax,wire=True)
    fig.text(.497,.486,'NEW GLB / FRONT',ha='center',fontsize=10,weight='bold')
    ax=fig.add_axes([.685,.52,.275,.34]);render(ax,(.85,.30,2.1),wire=True)
    fig.text(.822,.486,'NEW GLB / THREE-QUARTER',ha='center',fontsize=10,weight='bold')
    for i,(label,d,u) in enumerate([('LEFT',(-1,0,0),(0,1,0)),('RIGHT',(1,0,0),(0,1,0)),('TOP',(0,1,0),(0,0,-1)),('BOTTOM',(0,-1,0),(0,0,1))]):
        x=.035+i*.245
        ax=fig.add_axes([x,.13,.205,.29]);render(ax,d,u,wire=i<2)
        fig.text(x+.1025,.100,label,ha='center',fontsize=10,weight='bold')
    fig.text(.035,.039,'W : H : D = '+ ' : '.join(f'{s:.3f}' for s in (P.max(0)-P.min(0)))+'   |   Closed solid   |   Editable estimate of hidden surfaces',fontsize=10,color='#627289')
    fig.savefig(OUT/'asymmetric-ice-v2-preview.png',dpi=160,facecolor=fig.get_facecolor());plt.close(fig)

def validate(doc,glb):
    edges,counts=np.unique(np.sort(np.concatenate([F[:,[0,1]],F[:,[1,2]],F[:,[2,0]]]),1),axis=0,return_counts=True)
    assert np.all(counts==2)
    assert len(P)-len(edges)+len(F)==2
    assert np.isfinite(P).all() and np.isfinite(NORMALS).all()
    assert np.allclose(np.linalg.norm(NORMALS,axis=1),1)
    area=np.linalg.norm(FACE_N,axis=1)/2
    assert area.min()>1e-13
    volume=np.einsum('ij,ij->i',P[F[:,0]],np.cross(P[F[:,1]],P[F[:,2]])).sum()/6
    assert volume>0
    # Check front fit against source row envelopes, away from antialiased poles.
    t=FR['t'];cx,rx=front(t)
    error=np.concatenate([cx-rx-FR['lo'],cx+rx-FR['hi']])*FR['pixelHeight']
    report={'vertices':len(P),'triangles':len(F),'closed_manifold_edges':True,'euler':2,
            'positive_volume':float(volume),'min_triangle_area':float(area.min()),
            'front_outline_mean_error_pixels':float(np.mean(np.abs(error))),
            'front_outline_p95_error_pixels':float(np.percentile(np.abs(error),95)),
            'dimensions':(P.max(0)-P.min(0)).tolist(),
            'validation_scope':'Topology, normals, source front profile fit, and GLB byte arrays. Preview rendered from the same mesh; not browser-tested.'}
    magic,version,length=struct.unpack_from('<III',glb)
    assert magic==0x46546c67 and version==2 and length==len(glb)
    jlen,jtype=struct.unpack_from('<II',glb,12);assert jtype==0x4e4f534a
    j=json.loads(glb[20:20+jlen]);blen,btype=struct.unpack_from('<II',glb,20+jlen);assert btype==0x004e4942
    binary=glb[28+jlen:];assert len(binary)==blen
    for k,(expected,dtype) in enumerate([(P,'<f4'),(NORMALS,'<f4'),(F,'<u2')]):
        view=j['bufferViews'][k]
        arr=np.frombuffer(binary[view['byteOffset']:view['byteOffset']+view['byteLength']],dtype=dtype)
        assert np.array_equal(arr,np.asarray(expected,dtype=dtype).ravel())
    report['glb_arrays_match_preview']=True
    (OUT/'validation.json').write_text(json.dumps(report,indent=2))
    samples=np.r_[0,np.linspace(.002,.998,200),1]
    xc,xr=front(samples);zc,zr=side(samples)
    (OUT/'fitted-profiles.json').write_text(json.dumps({'status':'Front directly fitted; side thickness averaged from selected left/right views.',
        'columns':['y','centerX','halfWidthX','centerZ','halfDepthZ'],
        'samples':np.column_stack([samples,xc,xr,zc,zr]).tolist()},indent=2))
    print(json.dumps(report,indent=2))

if __name__=='__main__':
    doc,glb=export_glb();validate(doc,glb);preview()
